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
import { searchVideoSegments } from '../lib/pinecone';
// VideoSegment type imported for reference but segments come from Pinecone search

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
    
    // Step 1: Determine search query with context awareness
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
    
    // Step 2: Search Pinecone with context-aware query
    const queryEmbedding = await generateEmbedding(searchQuery);
    const rawSegments = await searchVideoSegments(queryEmbedding, Math.max(20, videoCount * 3));  // Get more to filter
    console.log(`Found ${rawSegments.length} raw segments`);
    
    // Step 2.5: Filter segments to match the specific trick requested
    // e.g., "frontside 180" should NOT return "frontside 360" videos
    const segments = filterSegmentsByTrick(rawSegments, currentTopic || historyTopic);
    console.log(`After filtering: ${segments.length} relevant segments`);
    
    // Step 3: Generate AI intro (just the friendly acknowledgment)
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    const introPrompt = `${COACH_INTRO_PROMPT}\n\nUser asked: "${message}"`;
    const introResult = await model.generateContent(introPrompt);
    const coachIntro = cleanResponse(introResult.response.text());
    
    // Step 4: Extract verbatim tips from Pinecone segments
    // Tips come directly from transcript text - no AI paraphrasing
    const verbatimTips = segments.slice(0, 5).map(seg => ({
      tip: seg.text.trim(),
      videoId: seg.videoId,
      videoTitle: seg.videoTitle,
      timestamp: seg.timestamp,
    }));
    
    // Step 5: Build the response with verbatim tips
    let responseText = coachIntro;
    
    if (verbatimTips.length > 0) {
      // Add transition
      const transitionResult = await model.generateContent(COACH_TRANSITION_PROMPT);
      const transition = cleanResponse(transitionResult.response.text());
      
      responseText += `\n\n${transition}\n\n`;
      responseText += verbatimTips.map((t, i) => `${i + 1}. ${t.tip}`).join('\n\n');
    } else {
      responseText += "\n\nHmm, I don't have specific tips for that in my videos yet. Try asking about a specific trick like backside 180s, frontside boardslides, or buttering!";
    }
    
    console.log('AI Response:', responseText.substring(0, 200) + '...');
    
    // Step 6: Build video references from the tips we used
    // Only avoid videos shown in last 5 prompts
    const recentVideoIds = new Set(shownVideoIds.slice(-5));
    
    // Dedupe videos by videoId, avoiding recent repeats
    const videoMap = new Map<string, typeof verbatimTips[0]>();
    for (const tip of verbatimTips) {
      if (!videoMap.has(tip.videoId) && !recentVideoIds.has(tip.videoId)) {
        videoMap.set(tip.videoId, tip);
      }
    }
    
    // If all videos were filtered out, allow repeats
    if (videoMap.size === 0) {
      for (const tip of verbatimTips) {
        if (!videoMap.has(tip.videoId)) {
          videoMap.set(tip.videoId, tip);
        }
      }
    }
    
    // Return videos based on request (default 3, up to 10 if asked)
    const videos: VideoReference[] = Array.from(videoMap.values())
      .slice(0, videoCount)
      .map(tip => ({
        videoId: tip.videoId,
        videoTitle: tip.videoTitle,
        timestamp: tip.timestamp,
        url: `https://youtube.com/watch?v=${tip.videoId}&t=${Math.floor(tip.timestamp)}s`,
        thumbnail: `https://img.youtube.com/vi/${tip.videoId}/maxresdefault.jpg`,
      }));
    
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
 * e.g., "frontside 180" should NOT include "frontside 360" content
 * Checks BOTH video title AND transcript text
 */
function filterSegmentsByTrick(
  segments: { videoTitle: string; text: string; videoId: string; timestamp: number }[],
  requestedTrick: string | null
): typeof segments {
  if (!requestedTrick) return segments;
  
  // Extract rotation number if present (180, 360, 540, etc.)
  const rotationMatch = requestedTrick.match(/\d+/);
  const requestedRotation = rotationMatch ? rotationMatch[0] : null;
  
  // Extract direction (frontside, backside)
  const direction = requestedTrick.match(/frontside|backside|fs|bs/i)?.[0]?.toLowerCase();
  const normalizedDirection = direction?.replace(/^fs$/i, 'frontside').replace(/^bs$/i, 'backside');
  
  const otherRotations = ['180', '360', '540', '720', '900', '1080'].filter(r => r !== requestedRotation);
  
  return segments.filter(seg => {
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
        // Check for patterns like "frontside 360" or "backside 360" in the text
        const wrongTrickPattern = new RegExp(`(frontside|backside|fs|bs)\\s*${rot}`, 'i');
        if (wrongTrickPattern.test(text)) {
          return false;
        }
      }
    }
    
    // If user asked for frontside, exclude backside-specific content (and vice versa)
    if (normalizedDirection === 'frontside') {
      if (title.includes('backside') && !title.includes('frontside')) return false;
      // Also check text for backside tricks with rotations
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
