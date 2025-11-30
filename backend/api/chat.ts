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
import { searchVideoSegments, searchVideoSegmentsWithOptions, searchByTrickName, getTrickTutorialById, type EnhancedVideoSegment } from '../lib/pinecone';
import { getEmbeddingCache, initializeEmbeddingCache } from '../lib/embedding-cache';

// Available trick tutorials (specific tricks only, not foundational techniques)
const AVAILABLE_TRICKS = [
  'frontside-180', 'backside-180', 'frontside-360', 'backside-360',
  'frontside-540', 'backside-540', 'frontside-720', 'backside-720',
  'frontside-900', 'backside-900', 'frontside-1080', 'backside-1080',
  'frontside-boardslide', 'backside-boardslide', '50-50', 'nose-slide', 'tail-slide',
  'method', 'indy', 'melon', 'stalefish', 'mute', 'ollie', 'nollie', 'butter'
];

// Map trick IDs to Taevis video IDs for tricks without primary tutorials
const TAEVIS_TRICK_VIDEOS: Record<string, string[]> = {
  'backside-720': ['DTU2MY74dcQ', 'xArsPSVoGdo', 'ODLrzWLrPAo', '5cDLnB4ybH0'],
  'frontside-180': ['DTU2MY74dcQ', 'xArsPSVoGdo'],
  'backside-180': ['DTU2MY74dcQ', 'xArsPSVoGdo'],
  'frontside-360': ['xArsPSVoGdo', 'ODLrzWLrPAo'],
  'backside-360': ['xArsPSVoGdo', 'ODLrzWLrPAo'],
};

// Pre-written intros by trick - no AI needed
const TRICK_INTROS: Record<string, string> = {
  'frontside-180': "Nice! 🔥 Frontside 180s are super fun once you get them dialed.",
  'backside-180': "Nice! 🔥 Backside 180s are super fun once you get them dialed.",
  'frontside-360': "Frontside 360s! Let's get you spinning smooth.",
  'backside-360': "Backside 360s! Let's get you spinning smooth.",
  'frontside-540': "Frontside 540s - that's ambitious! Let's break it down.",
  'backside-540': "Backside 540s - that's ambitious! Let's break it down.",
  'frontside-720': "Frontside 720s! Now we're talking 🔥",
  'backside-720': "Backside 720s! Now we're talking 🔥",
  'frontside-900': "Frontside 900s - respect! 💪",
  'backside-900': "Backside 900s - respect! 💪",
  'frontside-1080': "Frontside 1080s - that's next level!",
  'backside-1080': "Backside 1080s - that's next level!",
  'frontside-boardslide': "Frontside boardslides! Let's get you sliding 🛹",
  'backside-boardslide': "Backside boardslides! Let's get you sliding 🛹",
  '50-50': "50-50s are a classic. Let's dial them in.",
  'nose-slide': "Nose slides - nice choice!",
  'tail-slide': "Tail slides - solid!",
  'method': "Method grabs are so stylish 🤙",
  'indy': "Indy grabs - the classic!",
  'melon': "Melon grabs - smooth!",
  'stalefish': "Stalefish - nice grab!",
  'mute': "Mute grabs - clean!",
  'ollie': "Ollies are the foundation. Let's get them solid.",
  'nollie': "Nollies - switch it up!",
  'butter': "Buttering - that's fun stuff! 🏂",
};

const GENERAL_INTRO = "Ah, let me help with that 💪";

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
 * Detect user intent using pattern matching first, then AI if needed
 * This reduces AI calls significantly for common trick questions
 */
async function detectIntent(message: string, client: GoogleGenerativeAI): Promise<IntentResult> {
  // First try pattern matching - covers 80% of cases
  const trick = extractTrickFromMessage(message);
  if (trick) {
    // Found a trick mention - try to match it to available tricks
    const normalized = normalizeTrickName(trick);
    for (const availableTrick of AVAILABLE_TRICKS) {
      if (normalizeTrickName(availableTrick).includes(normalized) || 
          normalized.includes(normalizeTrickName(availableTrick))) {
        return {
          intent: 'how-to-trick',
          trickId: availableTrick,
          confidence: 0.9,
        };
      }
    }
  }
  
  // If pattern matching didn't work, use AI for ambiguous cases
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
  shownTipIds?: string[];    // Track tips already shown to never repeat
  currentTrick?: string;     // Track the current trick being discussed
}

interface VideoReference {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  url: string;
  thumbnail: string;
  duration?: number;  // Total video duration in seconds
}

interface ChatMessage {
  type: 'text' | 'tip' | 'follow-up';
  content: string;
  video?: VideoReference;  // Optional video for this specific message
}

// Response shape: { messages: ChatMessage[], hasMoreTips: boolean, featuredVideo?: VideoReference }

let genAI: GoogleGenerativeAI | null = null;
let embeddingCacheInitialized = false;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

/**
 * Convert cached chunk to EnhancedVideoSegment format
 */
function convertCachedChunkToSegment(chunk: any): EnhancedVideoSegment {
  return {
    id: chunk.id,
    videoId: chunk.videoId,
    videoTitle: chunk.videoTitle,
    text: chunk.text,
    timestamp: chunk.timestamp,
    duration: chunk.duration,
    topics: chunk.topics || [],
    isPrimary: chunk.isPrimary || false,
    trickId: chunk.trickId,
    trickName: chunk.trickName,
    stepNumber: chunk.stepNumber,
    totalSteps: chunk.totalSteps,
    stepTitle: chunk.stepTitle,
  };
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
  
  // Initialize embedding cache on first request
  if (!embeddingCacheInitialized) {
    await initializeEmbeddingCache();
    embeddingCacheInitialized = true;
  }
  
  try {
    const { message, history = [], shownVideoIds = [], shownTipIds = [], currentTrick: passedTrick }: ChatRequest = req.body;
    
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
    console.log('Passed trick:', passedTrick || 'none');
    
    const client = getGeminiClient();
    
    // Step 1: Detect intent - is this a "how to do X trick" question?
    const intent = await detectIntent(message, client);
    console.log('Intent:', intent);
    
    // Step 2: Determine search query with context awareness
    const currentTopic = extractTrickFromMessage(message);
    
    // Determine active trick: prioritize new mention, then passed trick, then history
    let activeTrick = currentTopic || passedTrick || extractConversationTopic(history);
    
    // Check if user switched tricks (mentioned a different trick than the current one)
    const userSwitchedTricks = currentTopic && passedTrick && 
      normalizeTrickName(currentTopic) !== normalizeTrickName(passedTrick);
    
    if (userSwitchedTricks) {
      console.log(`User switched tricks: ${passedTrick} → ${currentTopic}`);
      activeTrick = currentTopic;  // Use the new trick
    }
    
    // For search: prioritize current message, add context only if no new topic
    const searchQuery = currentTopic 
      ? message  // New topic - search just the message
      : (activeTrick ? `${activeTrick} ${message}` : message);  // Follow-up - add context
    
    console.log('Current topic:', currentTopic || 'none');
    console.log('Passed trick:', passedTrick || 'none');
    console.log('Active trick:', activeTrick || 'none');
    console.log('User switched tricks:', userSwitchedTricks);
    console.log('Search query:', searchQuery);
    
    // Check if user is asking for more videos
    const wantsMoreVideos = /(\d+)\s*video|more video|show.*video|give.*video|videos please/i.test(message);
    const requestedVideoCount = message.match(/(\d+)\s*video/i)?.[1];
    const videoCount = requestedVideoCount ? Math.min(parseInt(requestedVideoCount), 10) : (wantsMoreVideos ? 5 : 3);
    
    // Step 3: Search - use different strategy based on intent
    let rawSegments: EnhancedVideoSegment[];
    let isPrimaryTutorial = false;
    let queryEmbedding: number[] | null = null;
    
    if (intent.intent === 'how-to-trick' && intent.trickId && intent.confidence > 0.7) {
      // Search for primary trick tutorial first (no embedding needed!)
      console.log(`Searching for primary tutorial: ${intent.trickId}`);
      const primarySegments = await getTrickTutorialById(intent.trickId);
      
      if (primarySegments.length >= 5) {
        // Found primary tutorial - use it
        rawSegments = primarySegments;
        isPrimaryTutorial = true;
        console.log(`Found ${primarySegments.length} primary tutorial steps`);
      } else {
        // No primary tutorial found, fall back to semantic search
        console.log('No primary tutorial found, searching for related content');
        queryEmbedding = await generateEmbedding(searchQuery);
        rawSegments = await searchVideoSegments(queryEmbedding, Math.max(20, videoCount * 3));
      }
    } else {
      // General question - use semantic search with embedding
      queryEmbedding = await generateEmbedding(searchQuery);
      
      // Try local embedding cache first (no Pinecone API call!)
      const cache = getEmbeddingCache();
      const cacheStats = cache.getStats();
      if (cacheStats.totalChunks > 0) {
        console.log('Using local embedding cache for search');
        const cachedResults = cache.search(queryEmbedding, Math.max(20, videoCount * 3));
        rawSegments = cachedResults.map(convertCachedChunkToSegment);
      } else {
        // Fallback to Pinecone if cache not available
        console.log('Embedding cache not available, using Pinecone');
        rawSegments = await searchVideoSegments(queryEmbedding, Math.max(20, videoCount * 3));
      }
    }
    console.log(`Found ${rawSegments.length} raw segments`);
    
    // Log raw segment details for debugging
    console.log('=== Raw Segments ===');
    rawSegments.slice(0, 10).forEach((seg, i) => {
      console.log(`  ${i + 1}. ID: ${seg.id} | videoId: ${seg.videoId || 'MISSING'} | trickName: ${seg.trickName || 'N/A'} | title: ${seg.videoTitle?.substring(0, 40) || 'N/A'}`);
    });
    
    // Step 4: Filter segments (skip for primary tutorials - they're already filtered)
    // Use trickName metadata for strict filtering when available
    // IMPORTANT: Use activeTrick to maintain consistency across follow-up questions
    const segments: EnhancedVideoSegment[] = isPrimaryTutorial 
      ? rawSegments 
      : filterSegmentsByTrick(rawSegments, activeTrick);
    console.log(`After filtering: ${segments.length} relevant segments`);
    
    // Log filtered segment details
    console.log('=== Filtered Segments ===');
    segments.slice(0, 10).forEach((seg, i) => {
      console.log(`  ${i + 1}. ID: ${seg.id} | videoId: ${seg.videoId || 'MISSING'} | trickName: ${seg.trickName || 'N/A'} | title: ${seg.videoTitle?.substring(0, 40) || 'N/A'}`);
    });
    
    // Step 5: Get intro (from cache or use general)
    const coachIntro = intent.intent === 'how-to-trick' && intent.trickId
      ? TRICK_INTROS[intent.trickId] || GENERAL_INTRO
      : GENERAL_INTRO;
    
    // Step 6: Build tips - different handling for primary tutorials vs general
    if (isPrimaryTutorial && segments.length > 0) {
      // PRIMARY TUTORIAL: Show ordered steps as separate messages
      const trickName = segments[0].trickName || intent.trickId;
      console.log(`Building primary tutorial response for: ${trickName}`);
      
      // Sort by step number and build ordered steps
      const orderedSteps = segments
        .filter(seg => seg.stepNumber !== undefined)
        .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
        .slice(0, 10);  // Max 10 steps
      
      // Get up to 3 unique videos for this question (skip all previously shown)
      const shownVideoSet = new Set(shownVideoIds);
      const uniqueVideos: VideoReference[] = [];
      const seenIds = new Set<string>();
      
      // First pass: try to get videos from segments (excluding all previously shown)
      for (const seg of segments) {
        if (seg.videoId && !shownVideoSet.has(seg.videoId) && !seenIds.has(seg.videoId)) {
          uniqueVideos.push({
            videoId: seg.videoId,
            videoTitle: seg.videoTitle,
            timestamp: seg.timestamp,
            url: `https://youtube.com/watch?v=${seg.videoId}`,
            thumbnail: `https://img.youtube.com/vi/${seg.videoId}/hqdefault.jpg`,
            duration: seg.duration,
          });
          seenIds.add(seg.videoId);
          if (uniqueVideos.length >= 3) break;
        }
      }
      
      // Fallback: if no videos found from segments, search for Taevis videos with same trick name
      if (uniqueVideos.length === 0) {
        // Generate embedding if we don't have one yet (for trick questions)
        if (!queryEmbedding) {
          queryEmbedding = await generateEmbedding(searchQuery);
        }
        
        // Get trickName from segments or use intent.trickId as fallback
        const trickNameToSearch = segments.length > 0 && segments[0].trickName 
          ? segments[0].trickName 
          : intent.trickId;
        
        if (trickNameToSearch) {
          console.log(`Searching for Taevis videos with trickName: ${trickNameToSearch}`);
          const taevisSegments = await searchVideoSegmentsWithOptions(queryEmbedding, {
            topK: 50,
            trickName: trickNameToSearch,
          });
          
          console.log(`Found ${taevisSegments.length} Taevis segments for ${trickNameToSearch}`);
          
          for (const seg of taevisSegments) {
            console.log(`  Checking: ${seg.videoId} | trickName: ${seg.trickName} | title: ${seg.videoTitle.substring(0, 40)}`);
            if (seg.videoId && !shownVideoSet.has(seg.videoId) && !seenIds.has(seg.videoId)) {
              console.log(`    ✓ Adding video`);
              uniqueVideos.push({
                videoId: seg.videoId,
                videoTitle: seg.videoTitle,
                timestamp: seg.timestamp,
                url: `https://youtube.com/watch?v=${seg.videoId}`,
                thumbnail: `https://img.youtube.com/vi/${seg.videoId}/hqdefault.jpg`,
                duration: seg.duration,
              });
              seenIds.add(seg.videoId);
              if (uniqueVideos.length >= 3) break;
            } else {
              console.log(`    ✗ Skipped (shown: ${shownVideoSet.has(seg.videoId)}, seen: ${seenIds.has(seg.videoId)})`);
            }
          }
        }
      }
      
      // If still no videos and we have an embedding, do one broader search
      if (uniqueVideos.length < 3 && queryEmbedding) {
        console.log('No videos found, searching for related content...');
        const relatedSegments = await searchVideoSegments(queryEmbedding, 50);
        for (const seg of relatedSegments) {
          if (seg.videoId && !seenIds.has(seg.videoId)) {
            uniqueVideos.push({
              videoId: seg.videoId,
              videoTitle: seg.videoTitle,
              timestamp: seg.timestamp,
              url: `https://youtube.com/watch?v=${seg.videoId}`,
              thumbnail: `https://img.youtube.com/vi/${seg.videoId}/hqdefault.jpg`,
              duration: seg.duration,
            });
            seenIds.add(seg.videoId);
            if (uniqueVideos.length >= 3) break;
          }
        }
      }
      
      const messages: ChatMessage[] = [];
      
      // Add intro message
      messages.push({ type: 'text', content: coachIntro });
      
      // Add transition (hardcoded, no AI needed)
      messages.push({ type: 'text', content: "Here's how to do it:" });
      
      // Add first 3 steps as separate messages
      const firstBatch = orderedSteps.slice(0, 3);
      for (const step of firstBatch) {
        messages.push({ type: 'tip', content: step.text });
      }
      
      // Check if there are more steps
      const hasMoreTips = orderedSteps.length > 3;
      
      // Add follow-up question if there are more steps
      if (hasMoreTips) {
        messages.push({ 
          type: 'follow-up', 
          content: "Want more tips? Just ask!" 
        });
      }
      
      console.log(`Returning ${messages.length} messages, ${uniqueVideos.length} videos for primary tutorial (hasMoreTips: ${hasMoreTips})`);
      console.log('=== Videos Returned ===');
      if (uniqueVideos.length === 0) {
        console.log('  NO VIDEOS FOUND');
      } else {
        uniqueVideos.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v.videoId} | ${v.videoTitle.substring(0, 40)}`);
        });
      }
      
      return res.status(200).json({
        messages,
        hasMoreTips,
        videos: uniqueVideos,
        currentTrick: activeTrick,  // Return the trick so client can pass it back
      });
      
    } else if (segments.length > 0) {
      // GENERAL TIPS: Build separate messages for each tip
      // Sort: primary tips first, then others
      const allTips = segments.slice(0, 15).map((seg, idx) => ({
        id: seg.id || `tip-${idx}`,  // Unique ID for tracking
        tip: seg.text.trim(),
        videoId: seg.videoId,
        videoTitle: seg.videoTitle,
        timestamp: seg.timestamp,
        isPrimary: seg.isPrimary,
        duration: seg.duration,
        trickName: seg.trickName,
      })).sort((a, b) => {
        // Primary tips first
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return 0;
      });
      
      // Filter out already shown tips
      const shownTipSet = new Set(shownTipIds);
      const availableTips = allTips.filter(t => !shownTipSet.has(t.id));
      
      // Build messages array - each tip is its own message
      const messages: ChatMessage[] = [];
      
      // Add intro message
      messages.push({ type: 'text', content: coachIntro });
      
      // Add transition (hardcoded, no AI needed)
      messages.push({ type: 'text', content: "Here's what I'd focus on:" });
      
      // Add first 3 tips as separate messages
      const firstBatch = availableTips.slice(0, 3);
      const tipIdsShown: string[] = [];
      for (const tip of firstBatch) {
        messages.push({ type: 'tip', content: tip.tip });
        tipIdsShown.push(tip.id);
      }
      
      // Get up to 3 unique videos for this question (skip all previously shown)
      const shownVideoSet = new Set(shownVideoIds);
      const uniqueVideos: VideoReference[] = [];
      const seenIds = new Set<string>();
      
      // First pass: try to get videos from available tips (excluding all previously shown)
      for (const tip of availableTips) {
        if (tip.videoId && !shownVideoSet.has(tip.videoId) && !seenIds.has(tip.videoId)) {
          uniqueVideos.push({
            videoId: tip.videoId,
            videoTitle: tip.videoTitle,
            timestamp: tip.timestamp,
            url: `https://youtube.com/watch?v=${tip.videoId}`,
            thumbnail: `https://img.youtube.com/vi/${tip.videoId}/hqdefault.jpg`,
            duration: tip.duration,
          });
          seenIds.add(tip.videoId);
          if (uniqueVideos.length >= 3) break;
        }
      }
      
      // Second pass: if we have fewer than 3 videos, search through all relevant segments (excluding all previously shown)
      if (uniqueVideos.length < 3) {
        for (const seg of segments) {
          if (seg.videoId && !shownVideoSet.has(seg.videoId) && !seenIds.has(seg.videoId)) {
            uniqueVideos.push({
              videoId: seg.videoId,
              videoTitle: seg.videoTitle,
              timestamp: seg.timestamp,
              url: `https://youtube.com/watch?v=${seg.videoId}`,
              thumbnail: `https://img.youtube.com/vi/${seg.videoId}/hqdefault.jpg`,
              duration: seg.duration,
            });
            seenIds.add(seg.videoId);
            if (uniqueVideos.length >= 3) break;
          }
        }
      }
      
      // Fallback: if still no videos and we have an embedding, do one broader search
      if (uniqueVideos.length < 3 && queryEmbedding) {
        console.log(`Only ${uniqueVideos.length} videos found, searching for related content...`);
        const relatedSegments = await searchVideoSegments(queryEmbedding, 100);
        for (const seg of relatedSegments) {
          if (seg.videoId && !seenIds.has(seg.videoId)) {
            uniqueVideos.push({
              videoId: seg.videoId,
              videoTitle: seg.videoTitle,
              timestamp: seg.timestamp,
              url: `https://youtube.com/watch?v=${seg.videoId}`,
              thumbnail: `https://img.youtube.com/vi/${seg.videoId}/hqdefault.jpg`,
              duration: seg.duration,
            });
            seenIds.add(seg.videoId);
            if (uniqueVideos.length >= 3) break;
          }
        }
      }
      
      // Check if there are more tips available
      const hasMoreTips = availableTips.length > 3;
      
      // Add follow-up question if there are more tips
      if (hasMoreTips) {
        messages.push({ 
          type: 'follow-up', 
          content: "Want more tips? Just ask!" 
        });
      }
      
      console.log('AI Response:', coachIntro.substring(0, 100) + '...');
      console.log(`Returning ${messages.length} messages, ${uniqueVideos.length} videos (hasMoreTips: ${hasMoreTips})`);
      console.log('=== Videos Returned ===');
      if (uniqueVideos.length === 0) {
        console.log('  NO VIDEOS FOUND');
      } else {
        uniqueVideos.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v.videoId} | ${v.videoTitle.substring(0, 40)}`);
        });
      }
      
      return res.status(200).json({
        messages,
        hasMoreTips,
        videos: uniqueVideos,
        tipIdsShown,  // Return tip IDs so client can track them
        currentTrick: activeTrick,  // Return the trick so client can pass it back
      });
        
    } else {
      const messages: ChatMessage[] = [
        { type: 'text', content: coachIntro },
        { type: 'text', content: "Hmm, I don't have specific tips for that in my videos yet. Try asking about a specific trick like backside 180s, frontside boardslides, or buttering!" }
      ];
      
      return res.status(200).json({
        messages,
        hasMoreTips: false,
        videos: [],
      });
    }
    
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
 * Normalize trick names for comparison
 * e.g., "fs 180" and "frontside 180" should be considered the same
 */
function normalizeTrickName(trick: string): string {
  return trick
    .toLowerCase()
    .replace(/\bfs\b/g, 'frontside')
    .replace(/\bbs\b/g, 'backside')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a string contains a spinning trick (rotations or spin-related content)
 */
function isSpinTrick(text: string): boolean {
  const spinPatterns = [
    /\b(180|360|540|720|900|1080)\b/i,  // Rotation numbers
    /\bspin/i,                           // "spin" or "spins"
    /\brotation/i,                       // "rotation"
  ];
  return spinPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if a string contains a rail/slide trick
 */
function isRailTrick(text: string): boolean {
  const railPatterns = [
    /\bboardslide\b/i,
    /\bslide\b/i,
    /\brail\b/i,
    /\b50-?50\b/i,
    /\bnose\s*slide\b/i,
    /\btail\s*slide\b/i,
  ];
  return railPatterns.some(pattern => pattern.test(text));
}

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
 * STRICT: Only shows videos for other tricks if they have high similarity AND no relevant trick content exists
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
  
  // First pass: collect segments that match the requested trick
  const matchingSegments: EnhancedVideoSegment[] = [];
  const nonMatchingSegments: EnhancedVideoSegment[] = [];
  
  for (const seg of segments) {
    let isMatch = false;
    
    // PRIORITY: If segment has trickName metadata, use it for strict matching
    if (seg.trickName) {
      const segTrickName = seg.trickName.toLowerCase();
      
      // Check if trickName matches the requested trick
      if (requestedRotation && normalizedDirection) {
        // For rotation tricks, match both direction and rotation
        const matchesDirection = segTrickName.includes(normalizedDirection);
        const matchesRotation = segTrickName.includes(requestedRotation);
        
        // Must match both, or be a general tip (no rotation in trickName)
        if (matchesDirection && matchesRotation) {
          isMatch = true;
        } else if (!segTrickName.match(/\d+/) && matchesDirection) {
          // General direction tips are OK
          isMatch = true;
        } else {
          // Exclude if it's a different rotation
          for (const rot of otherRotations) {
            if (segTrickName.includes(rot)) {
              isMatch = false;
              break;
            }
          }
        }
      }
      
      // For non-rotation tricks, check if trickName contains the request
      if (!isMatch && (segTrickName.includes(normalizedRequest) || normalizedRequest.includes(segTrickName))) {
        isMatch = true;
      }
      
      // If trickName doesn't match at all, it's not a match
      if (!isMatch) {
        nonMatchingSegments.push(seg);
        continue;
      }
    } else {
      // FALLBACK: No trickName metadata, use title/text matching
      const title = seg.videoTitle.toLowerCase();
      const text = seg.text.toLowerCase();
      
      // Check for different rotations - these are NOT matches
      let isDifferentTrick = false;
      
      // If user asked for a specific rotation (180, 360, etc.), be VERY strict
      if (requestedRotation) {
        // Check if title/text mentions ANY other rotation
        for (const rot of otherRotations) {
          // Exclude if title mentions a different rotation
          if (title.includes(rot)) {
            isDifferentTrick = true;
            break;
          }
          // Exclude if text content mentions a different rotation
          const wrongTrickPattern = new RegExp(`\\b${rot}\\b`, 'i');
          if (wrongTrickPattern.test(text)) {
            isDifferentTrick = true;
            break;
          }
        }
        
        // Also check if it mentions the requested rotation - if not, it might be about a different trick
        if (!isDifferentTrick && !title.includes(requestedRotation) && !text.includes(requestedRotation)) {
          // If it's a rotation trick but doesn't mention the rotation, it's probably not relevant
          isDifferentTrick = true;
        }
      }
      
      // Check for opposite direction
      if (!isDifferentTrick && normalizedDirection === 'frontside') {
        if (title.includes('backside') && !title.includes('frontside')) isDifferentTrick = true;
      } else if (!isDifferentTrick && normalizedDirection === 'backside') {
        if (title.includes('frontside') && !title.includes('backside')) isDifferentTrick = true;
      }
      
      // Check if requested trick is a rail/slide trick or spin trick
      const requestedIsRail = isRailTrick(normalizedRequest);
      const requestedIsSpin = isSpinTrick(normalizedRequest);
      
      // For rail tricks, exclude spin tricks
      if (!isDifferentTrick && requestedIsRail && isSpinTrick(title + ' ' + text)) {
        isDifferentTrick = true;
      }
      
      // For spin tricks, exclude rail tricks
      if (!isDifferentTrick && requestedIsSpin && isRailTrick(title + ' ' + text)) {
        isDifferentTrick = true;
      }
      
      if (isDifferentTrick) {
        nonMatchingSegments.push(seg);
        continue;
      }
      
      isMatch = true;
    }
    
    if (isMatch) {
      matchingSegments.push(seg);
    } else {
      nonMatchingSegments.push(seg);
    }
  }
  
  // Return matching segments first, only include non-matching if we have very few matches
  // This allows fallback to high-similarity content if the trick has limited videos
  if (matchingSegments.length >= 5) {
    // Plenty of matching content, don't show other tricks
    return matchingSegments;
  } else if (matchingSegments.length > 0) {
    // Some matching content, only add high-similarity non-matching if needed
    // For now, just return what we have
    return matchingSegments;
  } else {
    // No matching content found - return empty rather than showing unrelated tricks
    return [];
  }
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
