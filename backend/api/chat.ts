/**
 * Chat API Endpoint
 * POST /api/chat
 * 
 * Simplified flow:
 * 1. AI interprets user input (fix typos, expand abbreviations)
 * 2. Search Pinecone with clean query
 * 3. Return transcript segments as tips (no AI extraction)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateEmbedding } from '../lib/gemini';
import { searchVideoSegments } from '../lib/pinecone';
import { getCachedResponse, cacheResponse } from '../lib/cache';
import { interpretQuery } from '../lib/query-interpreter';
import { GREETING } from '../lib/coach-personality';
import type { VideoSegment } from '../lib/types';

interface TipWithVideo {
  tip: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  url: string;
  thumbnail: string;
}

interface ChatResponse {
  greeting?: string;
  interpretation: {
    original: string;
    understood: string;
    concepts: string[];
  } | null;
  coachMessage: string;
  tips: TipWithVideo[];
  cached: boolean;
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
    console.log('=== Chat API Called ===');
    
    const { message, sessionId } = req.body;
    
    // If no message, return greeting
    if (!message || !message.trim()) {
      return res.status(200).json({
        greeting: GREETING,
        interpretation: null,
        coachMessage: '',
        tips: [],
        cached: false,
      });
    }
    
    console.log('User message:', message);
    
    // Check cache
    const cacheKey = { trick: message.toLowerCase().trim() };
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('Cache hit!');
      return res.status(200).json({
        ...JSON.parse(cachedResponse),
        cached: true,
      });
    }
    
    // Step 1: AI interprets user input (fix typos, expand abbreviations)
    console.log('Step 1: Interpreting query...');
    const interpreted = await interpretQuery(message);
    console.log('Interpreted:', interpreted.interpretedMeaning);
    console.log('Search terms:', interpreted.searchTerms);
    
    // Step 2: Build clean search query and search Pinecone
    const searchQuery = [
      interpreted.interpretedMeaning,
      ...interpreted.searchTerms,
      ...interpreted.concepts
    ].filter(Boolean).join(' ');
    
    console.log('Step 2: Searching Pinecone with:', searchQuery);
    const queryEmbedding = await generateEmbedding(searchQuery);
    const segments = await searchVideoSegments(queryEmbedding, 5);
    console.log(`Found ${segments.length} segments`);
    
    // Step 3: Convert segments directly to tips (no AI extraction)
    const tips = segmentsToTips(segments);
    
    // Build coach message
    const coachMessage = buildCoachMessage(interpreted.interpretedMeaning, tips.length);
    
    const response: ChatResponse = {
      interpretation: {
        original: message,
        understood: interpreted.interpretedMeaning,
        concepts: interpreted.concepts,
      },
      coachMessage,
      tips,
      cached: false,
    };
    
    // Cache it
    await cacheResponse(cacheKey, JSON.stringify(response));
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    console.error('Chat API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Convert Pinecone segments directly to tips
 * The transcript text IS the tip - no AI needed
 */
function segmentsToTips(segments: VideoSegment[]): TipWithVideo[] {
  return segments.map(seg => ({
    tip: cleanTranscriptText(seg.text),
    videoId: seg.videoId,
    videoTitle: seg.videoTitle,
    timestamp: seg.timestamp,
    url: `https://youtube.com/watch?v=${seg.videoId}&t=${Math.floor(seg.timestamp)}s`,
    thumbnail: `https://img.youtube.com/vi/${seg.videoId}/maxresdefault.jpg`,
  }));
}

/**
 * Clean up transcript text for display
 */
function cleanTranscriptText(text: string): string {
  // Remove extra whitespace, trim
  let cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Add period if missing
  if (cleaned.length > 0 && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned;
}

/**
 * Build a simple coach message
 */
function buildCoachMessage(topic: string, tipCount: number): string {
  if (tipCount === 0) {
    return `Hmm, I don't have specific content about "${topic}" yet. Try asking about common tricks like backside 180s, frontside 360s, or carving techniques!`;
  }
  
  return `Nice! Here's what I've got on ${topic}:`;
}
