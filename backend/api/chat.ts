/**
 * Chat API Endpoint
 * POST /api/chat
 * 
 * True conversational AI coach:
 * 1. Understand user's message naturally
 * 2. Search Pinecone for relevant knowledge
 * 3. Generate conversational response using AI with snowboard coach personality
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '../lib/gemini';
import { searchVideoSegments, searchVideoSegmentsWithOptions, type EnhancedVideoSegment } from '../lib/pinecone';

// Available trick tutorials (specific tricks only, not foundational techniques)
const AVAILABLE_TRICKS = [
  'frontside-180', 'backside-180', 'frontside-360', 'backside-360',
  'frontside-540', 'backside-540', 'frontside-720', 'backside-720',
  'frontside-900', 'backside-900', 'frontside-1080', 'backside-1080',
  'frontside-boardslide', 'backside-boardslide', '50-50', 'nose-slide', 'tail-slide',
  'method', 'indy', 'melon', 'stalefish', 'mute', 'ollie', 'nollie', 'butter'
];

const COACH_INTRO_PROMPT = `You are Taevis, a chill snowboard coach. Generate ONLY a brief friendly intro (1-2 sentences max) acknowledging what the user wants to work on.

Examples:
- "Nice! 🔥 Backside 180s are super fun once you get them dialed."
- "Ah, edge catching - that's frustrating but totally fixable 💪"
- "Frontside boardslides! Let's get you sliding 🛹"

Rules:
- Just the intro, nothing else
- No tips or advice yet
- Keep it casual and encouraging
- No markdown, plain text only
- You can use cool emojis sparingly (🔥 💪 🏂 🛹 ✨ 👊 🤙) but don't overdo it`;

const COACH_TRANSITION_PROMPT = `You are Taevis. Write a single short sentence to transition to tips. Examples:
- "Here's what I'd focus on:"
- "Check out these tips:"
- "Here's what'll help:"
Keep it to one short line.`;

const INTENT_DETECTION_PROMPT = `Analyze this snowboarding question. Determine if the user wants to learn HOW TO DO a specific trick (step-by-step tutorial) or has a general question.

Available tricks we have tutorials for: ${AVAILABLE_TRICKS.join(', ')}

User message: "{MESSAGE}"

Respond with JSON only:
{
  "intent": "how-to-trick" or "general",
  "trickId": "frontside-180" or null,
  "confidence": 0.0-1.0
}

Examples:
- "frontside 180" → {"intent": "how-to-trick", "trickId": "frontside-180", "confidence": 0.95}
- "how do I fs 180" → {"intent": "how-to-trick", "trickId": "frontside-180", "confidence": 0.95}
- "teach me backside boardslides" → {"intent": "how-to-trick", "trickId": "backside-boardslide", "confidence": 0.9}
- "why do I keep catching my edge" → {"intent": "general", "trickId": null, "confidence": 0.85}
- "tips for landing switch" → {"intent": "general", "trickId": null, "confidence": 0.8}`;

interface IntentResult {
  intent: 'how-to-trick' | 'general';
  trickId: string | null;
  confidence: number;
}

/**
 * Detect user intent using AI - determines if they want a trick tutorial
 */
async function detectIntent(message: string, client: GoogleGenerativeAI): Promise<IntentResult> {
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  try {
    const prompt = INTENT_DETECTION_PROMPT.replace('{MESSAGE}', message);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        intent: parsed.intent || 'general',
        trickId: parsed.trickId || null,
        confidence: parsed.confidence || 0.5,
      };
    }
  } catch (error) {
    console.log('Intent detection fallback to general');
  }
  
  return { intent: 'general', trickId: null, confidence: 0.5 };
}

interface ChatRequest {
  message: string;
  sessionId: string;
  history?: { role: 'user' | 'coach'; content: string }[];
  shownVideoIds?: string[];  // Track videos already shown to avoid repeats
}

interface VideoReference {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  url: string;
  thumbnail: string;
  duration?: number;  // Total video duration in seconds
}

// Response shape: { response: string, videos: VideoReference[] }

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message, history = [], shownVideoIds = [] }: ChatRequest = req.body;
    
    // If no message, return greeting
    if (!message || !message.trim()) {
      return res.status(200).json({
        response: "Hey! I'm Taevis, your snowboarding coach. What trick or technique can I help you with today?",
        videos: [],
      });
    }
    
    console.log('=== Chat API ===');
    console.log('Message:', message);
    console.log('History length:', history.length);
    
    const client = getGeminiClient();
    
    // Step 1: Detect intent - is this a "how to do X trick" question?
    const intent = await detectIntent(message, client);
    console.log('Intent:', intent);
    
    // Step 2: Determine search query with context awareness
    const currentTopic = extractTrickFromMessage(message);
    const historyTopic = currentTopic ? null : extractConversationTopic(history);
    
    // For search: prioritize current message, add context only if no new topic
    const searchQuery = currentTopic 
      ? message  // New topic - search just the message
      : (historyTopic ? `${historyTopic} ${message}` : message);  // Follow-up - add context
    
    console.log('Current topic:', currentTopic || 'none');
    console.log('History topic:', historyTopic || 'none');
    console.log('Search query:', searchQuery);
    
    // Check if user is asking for more videos
    const wantsMoreVideos = /(\d+)\s*video|more video|show.*video|give.*video|videos please/i.test(message);
    const requestedVideoCount = message.match(/(\d+)\s*video/i)?.[1];
    const videoCount = requestedVideoCount ? Math.min(parseInt(requestedVideoCount), 10) : (wantsMoreVideos ? 5 : 3);
    
    // Step 3: Search Pinecone - use different strategy based on intent
    const queryEmbedding = await generateEmbedding(searchQuery);
    
    let rawSegments: EnhancedVideoSegment[];
    let isPrimaryTutorial = false;
    
    if (intent.intent === 'how-to-trick' && intent.trickId && intent.confidence > 0.7) {
      // Search for primary trick tutorial first
      console.log(`Searching for primary tutorial: ${intent.trickId}`);
      const primarySegments = await searchVideoSegmentsWithOptions(queryEmbedding, {
        topK: 15,
        filterPrimary: true,
        trickId: intent.trickId,
      });
      
      if (primarySegments.length >= 5) {
        // Found primary tutorial - use it
        rawSegments = primarySegments;
        isPrimaryTutorial = true;
        console.log(`Found ${primarySegments.length} primary tutorial steps`);
      } else {
        // No primary tutorial found, fall back to general search
        console.log('No primary tutorial found, using general search');
        rawSegments = await searchVideoSegments(queryEmbedding, Math.max(20, videoCount * 3));
      }
    } else {
      // General question - normal search
      rawSegments = await searchVideoSegments(queryEmbedding, Math.max(20, videoCount * 3));
    }
    console.log(`Found ${rawSegments.length} raw segments`);
    
    // Log raw segment details for debugging
    console.log('=== Raw Segments ===');
    rawSegments.slice(0, 10).forEach((seg, i) => {
      console.log(`  ${i + 1}. ID: ${seg.id} | trickName: ${seg.trickName || 'N/A'} | title: ${seg.videoTitle.substring(0, 40)}`);
    });
    
    // Step 4: Filter segments (skip for primary tutorials - they're already filtered)
    // Use trickName metadata for strict filtering when available
    const segments: EnhancedVideoSegment[] = isPrimaryTutorial 
      ? rawSegments 
      : filterSegmentsByTrick(rawSegments, currentTopic || historyTopic);
    console.log(`After filtering: ${segments.length} relevant segments`);
    
    // Log filtered segment details
    console.log('=== Filtered Segments ===');
    segments.slice(0, 10).forEach((seg, i) => {
      console.log(`  ${i + 1}. ID: ${seg.id} | trickName: ${seg.trickName || 'N/A'} | title: ${seg.videoTitle.substring(0, 40)}`);
    });
    
    // Step 5: Generate AI intro (just the friendly acknowledgment)
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    const introPrompt = `${COACH_INTRO_PROMPT}\n\nUser asked: "${message}"`;
    const introResult = await model.generateContent(introPrompt);
    const coachIntro = cleanResponse(introResult.response.text());
    
    // Step 6: Build tips - different handling for primary tutorials vs general
    let responseText = coachIntro;
    let videos: VideoReference[] = [];
    
    if (isPrimaryTutorial && segments.length > 0) {
      // PRIMARY TUTORIAL: Show ordered steps, NO video links
      const trickName = segments[0].trickName || intent.trickId;
      console.log(`Building primary tutorial response for: ${trickName}`);
      
      // Sort by step number and build ordered steps
      const orderedSteps = segments
        .filter(seg => seg.stepNumber !== undefined)
        .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
        .slice(0, 12);  // Max 12 steps
      
      if (orderedSteps.length > 0) {
        responseText += `\n\nHere's how to do it step by step:\n\n`;
        responseText += orderedSteps.map((step, i) => {
          const title = step.stepTitle || `Step ${step.stepNumber}`;
          return `${i + 1}. ${title}: ${step.text}`;
        }).join('\n\n');
      }
      
      // NO video references for primary tutorials (can't link to these videos)
      videos = [];
      
    } else if (segments.length > 0) {
      // GENERAL TIPS: Show tips with video links
      const verbatimTips = segments.slice(0, 5).map(seg => ({
        tip: seg.text.trim(),
        videoId: seg.videoId,
        videoTitle: seg.videoTitle,
        timestamp: seg.timestamp,
        isPrimary: seg.isPrimary,
        duration: seg.duration,
        trickName: seg.trickName,
      }));
      
      // Add transition
      const transitionResult = await model.generateContent(COACH_TRANSITION_PROMPT);
      const transition = cleanResponse(transitionResult.response.text());
      
      responseText += `\n\n${transition}\n\n`;
      responseText += verbatimTips.map((t, i) => `${i + 1}. ${t.tip}`).join('\n\n');
      
      // Build video references - only for non-primary tips
      const recentVideoIds = new Set(shownVideoIds.slice(-5));
      const videoMap = new Map<string, typeof verbatimTips[0]>();
      
      for (const tip of verbatimTips) {
        // Skip primary tutorial videos (can't link to them)
        if (tip.isPrimary) continue;
        
        if (!videoMap.has(tip.videoId) && !recentVideoIds.has(tip.videoId)) {
          videoMap.set(tip.videoId, tip);
        }
      }
      
      // If all videos were filtered out, allow repeats (but still skip primary)
      if (videoMap.size === 0) {
        for (const tip of verbatimTips) {
          if (tip.isPrimary) continue;
          if (!videoMap.has(tip.videoId)) {
            videoMap.set(tip.videoId, tip);
          }
        }
      }
      
      videos = Array.from(videoMap.values())
        .slice(0, videoCount)
        .map(tip => ({
          videoId: tip.videoId,
          videoTitle: tip.videoTitle,
          timestamp: tip.timestamp,
          url: `https://youtube.com/watch?v=${tip.videoId}`,
          thumbnail: `https://img.youtube.com/vi/${tip.videoId}/hqdefault.jpg`,
          duration: tip.duration,
        }));
        
    } else {
      responseText += "\n\nHmm, I don't have specific tips for that in my videos yet. Try asking about a specific trick like backside 180s, frontside boardslides, or buttering!";
    }
    
    console.log('AI Response:', responseText.substring(0, 200) + '...');
    console.log(`Returning ${videos.length} video references (isPrimaryTutorial: ${isPrimaryTutorial})`);
    
    return res.status(200).json({
      response: responseText,
      videos,
    });
    
  } catch (error: any) {
    console.error('Chat API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Common trick patterns
const TRICK_PATTERNS = [
  /frontside\s*boardslide/i,
  /backside\s*boardslide/i,
  /boardslide/i,
  /50-?50/i,
  /5-?0/i,
  /nose\s*slide/i,
  /tail\s*slide/i,
  /backside\s*\d+/i,
  /frontside\s*\d+/i,
  /bs\s*\d+/i,
  /fs\s*\d+/i,
  /switch\s+\w+/i,
  /nollie\s+\w+/i,
  /cab\s*\d*/i,
  /method/i,
  /indy/i,
  /melon/i,
  /stalefish/i,
  /mute/i,
  /tail\s*grab/i,
  /nose\s*grab/i,
  /180|360|540|720|900|1080/,
  /carving/i,
  /buttering/i,
  /ollie/i,
  /rail/i,
  /box/i,
  /jump/i,
  /kicker/i,
];

/**
 * Extract trick from a single message
 */
function extractTrickFromMessage(message: string): string | null {
  for (const pattern of TRICK_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      let topic = match[0].toLowerCase();
      topic = topic.replace(/\bbs\b/i, 'backside');
      topic = topic.replace(/\bfs\b/i, 'frontside');
      return topic;
    }
  }
  return null;
}

/**
 * Extract the main topic/trick from conversation history
 * Looks for trick names in the first few messages
 */
function extractConversationTopic(history: { role: string; content: string }[]): string | null {
  if (history.length === 0) return null;
  
  // Common trick patterns to look for
  const trickPatterns = [
    /backside\s*\d+/i,
    /frontside\s*\d+/i,
    /bs\s*\d+/i,
    /fs\s*\d+/i,
    /switch\s+\w+/i,
    /nollie\s+\w+/i,
    /cab\s*\d*/i,
    /method/i,
    /indy/i,
    /melon/i,
    /stalefish/i,
    /mute/i,
    /tail\s*grab/i,
    /nose\s*grab/i,
    /180|360|540|720|900|1080/,
    /carving/i,
    /buttering/i,
    /ollie/i,
    /rail/i,
    /box/i,
    /jump/i,
    /kicker/i,
  ];
  
  // Search through first few user messages for trick mentions
  for (const item of history.slice(0, 6)) {
    if (item.role === 'user') {
      for (const pattern of trickPatterns) {
        const match = item.content.match(pattern);
        if (match) {
          // Expand abbreviations
          let topic = match[0].toLowerCase();
          topic = topic.replace(/\bbs\b/i, 'backside');
          topic = topic.replace(/\bfs\b/i, 'frontside');
          return topic;
        }
      }
    }
  }
  
  // If no trick found, use the first user message as context
  const firstUserMsg = history.find(h => h.role === 'user');
  if (firstUserMsg && firstUserMsg.content.length < 100) {
    return firstUserMsg.content;
  }
  
  return null;
}

/**
 * Filter segments to match the specific trick requested
 * Uses trickName metadata when available, falls back to title/text matching
 * e.g., "frontside 180" should NOT include "frontside 360" content
 */
function filterSegmentsByTrick(
  segments: EnhancedVideoSegment[],
  requestedTrick: string | null
): EnhancedVideoSegment[] {
  if (!requestedTrick) return segments;
  
  // Normalize the requested trick for matching
  const normalizedRequest = requestedTrick.toLowerCase()
    .replace(/\bfs\b/i, 'frontside')
    .replace(/\bbs\b/i, 'backside')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract rotation number if present (180, 360, 540, etc.)
  const rotationMatch = requestedTrick.match(/\d+/);
  const requestedRotation = rotationMatch ? rotationMatch[0] : null;
  
  // Extract direction (frontside, backside)
  const direction = requestedTrick.match(/frontside|backside|fs|bs/i)?.[0]?.toLowerCase();
  const normalizedDirection = direction?.replace(/^fs$/i, 'frontside').replace(/^bs$/i, 'backside');
  
  const otherRotations = ['180', '360', '540', '720', '900', '1080'].filter(r => r !== requestedRotation);
  
  return segments.filter(seg => {
    // PRIORITY: If segment has trickName metadata, use it for strict matching
    if (seg.trickName) {
      const segTrickName = seg.trickName.toLowerCase();
      
      // Check if trickName matches the requested trick
      if (requestedRotation && normalizedDirection) {
        // For rotation tricks, match both direction and rotation
        const matchesDirection = segTrickName.includes(normalizedDirection);
        const matchesRotation = segTrickName.includes(requestedRotation);
        
        // Must match both, or be a general tip (no rotation in trickName)
        if (matchesDirection && matchesRotation) return true;
        if (!segTrickName.match(/\d+/) && matchesDirection) return true; // General direction tips
        
        // Exclude if it's a different rotation
        for (const rot of otherRotations) {
          if (segTrickName.includes(rot)) return false;
        }
      }
      
      // For non-rotation tricks, check if trickName contains the request
      if (segTrickName.includes(normalizedRequest) || normalizedRequest.includes(segTrickName)) {
        return true;
      }
      
      // If trickName doesn't match at all, exclude
      return false;
    }
    
    // FALLBACK: No trickName metadata, use title/text matching
    const title = seg.videoTitle.toLowerCase();
    const text = seg.text.toLowerCase();
    
    // If user asked for a specific rotation (e.g., 180), exclude content about other rotations
    if (requestedRotation) {
      for (const rot of otherRotations) {
        // Exclude if title mentions a different rotation
        if (title.includes(rot) && !title.includes(requestedRotation)) {
          return false;
        }
        // Exclude if text content mentions a different rotation prominently
        const wrongTrickPattern = new RegExp(`(frontside|backside|fs|bs)\\s*${rot}`, 'i');
        if (wrongTrickPattern.test(text)) {
          return false;
        }
      }
    }
    
    // If user asked for frontside, exclude backside-specific content (and vice versa)
    if (normalizedDirection === 'frontside') {
      if (title.includes('backside') && !title.includes('frontside')) return false;
      if (requestedRotation && text.includes(`backside ${requestedRotation}`)) return false;
    } else if (normalizedDirection === 'backside') {
      if (title.includes('frontside') && !title.includes('backside')) return false;
      if (requestedRotation && text.includes(`frontside ${requestedRotation}`)) return false;
    }
    
    return true;
  });
}

/**
 * Clean up AI response - remove citation markers and formatting artifacts
 */
function cleanResponse(text: string): string {
  return text
    // Remove citation markers like [1], [2], (See: [1]), etc.
    .replace(/\[[\d,\s]+\]/g, '')
    .replace(/\(See:\s*\[[\d,\s]+\]\)/gi, '')
    .replace(/\(?\[?\d+\]?\)?/g, (match) => {
      // Only remove if it looks like a citation (not a number in context)
      if (match.includes('[') || match.includes(']')) return '';
      return match;
    })
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();
}
