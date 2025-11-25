/**
 * Chat API Endpoint
 * POST /api/chat
 * 
 * This is a Vercel serverless function
 * It handles coaching requests from the mobile app
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ChatRequest, ChatResponse, VideoReference } from '../lib/types';
import { generateEmbedding, generateCoachingResponse } from '../lib/gemini';
import { searchVideoSegments } from '../lib/pinecone';
import { getCachedResponse, cacheResponse } from '../lib/cache';

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
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('ENV Check:', {
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasPinecone: !!process.env.PINECONE_API_KEY,
      hasIndex: !!process.env.PINECONE_INDEX,
    });
    
    const { context, message, sessionId }: ChatRequest = req.body;
    
    if (!context || !sessionId) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log('Chat request:', { trick: context.trick, sessionId });
    
    // Check cache
    const cachedResponse = await getCachedResponse(context);
    if (cachedResponse) {
      console.log('Cache hit!');
      const parsed = JSON.parse(cachedResponse);
      return res.status(200).json({
        ...parsed,
        cached: true,
      });
    }
    
    console.log('Cache miss - generating new response');
    
    // Build search query
    const searchQuery = buildSearchQuery(context, message);
    console.log('Search query:', searchQuery);
    
    // Generate embedding
    const queryEmbedding = await generateEmbedding(searchQuery);
    
    // Search Pinecone
    const relevantSegments = await searchVideoSegments(queryEmbedding, 5);
    console.log(`Found ${relevantSegments.length} relevant segments`);
    
    if (relevantSegments.length === 0) {
      return res.status(200).json({
        response: "I don't have specific content about that yet, but I'd love to help! Can you describe your issue in more detail?",
        videos: [],
        cached: false,
      });
    }
    
    // Generate coaching response
    const coachingResponse = await generateCoachingResponse(
      context,
      relevantSegments,
      message
    );
    
    // Format video references
    const videoReferences: VideoReference[] = relevantSegments.map(seg => ({
      videoId: seg.videoId,
      title: seg.videoTitle,
      thumbnail: `https://img.youtube.com/vi/${seg.videoId}/maxresdefault.jpg`,
      timestamp: seg.timestamp,
      quote: seg.text.substring(0, 150),
      url: `https://youtube.com/watch?v=${seg.videoId}&t=${Math.floor(seg.timestamp)}s`,
    }));
    
    const response: ChatResponse = {
      response: coachingResponse,
      videos: videoReferences,
      cached: false,
    };
    
    // Cache it
    await cacheResponse(context, JSON.stringify(response));
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    console.error('=== Chat API Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

function buildSearchQuery(context: any, message?: string): string {
  const parts = [context.trick];
  
  if (context.issues) parts.push(context.issues);
  if (message) parts.push(message);
  
  if (context.edgeTransfers === 'struggling') {
    parts.push('edge control', 'edge transfer');
  }
  
  if (!context.spotLanding) {
    parts.push('spotting landing', 'rotation');
  }
  
  return parts.filter(Boolean).join(' ');
}
