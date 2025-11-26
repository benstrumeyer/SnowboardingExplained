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
    
    // Search Pinecone for top 10 chunks
    const relevantSegments = await searchVideoSegments(queryEmbedding, 10);
    console.log(`Found ${relevantSegments.length} relevant segments`);
    
    if (relevantSegments.length === 0) {
      return res.status(200).json({
        response: "I don't have specific content about that yet, but I'd love to help! Can you describe your issue in more detail?",
        videos: [],
        cached: false,
      });
    }
    
    // Group by video - take the best chunk per video
    const videoMap = new Map<string, typeof relevantSegments[0]>();
    for (const segment of relevantSegments) {
      if (!videoMap.has(segment.videoId)) {
        videoMap.set(segment.videoId, segment);
      }
    }
    
    const topVideos = Array.from(videoMap.values()).slice(0, 3); // Top 3 videos
    console.log(`Grouped into ${topVideos.length} videos`);
    
    // Generate one concise tip per video
    const videoTips = await Promise.all(
      topVideos.map(async (segment) => {
        const tipPrompt = `Extract the single most important snowboarding tip from this transcript.
Keep it concise (1-2 sentences) and actionable.

Transcript: "${segment.text}"

Tip:`;
        
        try {
          const tipResult = await generateCoachingResponse(
            { trick: context.trick },
            [segment],
            tipPrompt
          );
          
          return {
            videoId: segment.videoId,
            title: segment.videoTitle,
            tip: tipResult.split('\n')[0], // First line only
            timestamp: segment.timestamp,
          };
        } catch {
          return {
            videoId: segment.videoId,
            title: segment.videoTitle,
            tip: segment.text.substring(0, 150) + '...',
            timestamp: segment.timestamp,
          };
        }
      })
    );
    
    // Generate overall coaching response
    const coachingResponse = await generateCoachingResponse(
      context,
      topVideos,
      message
    );
    
    // Format video references with tips
    const videoReferences: VideoReference[] = videoTips.map(tip => ({
      videoId: tip.videoId,
      title: tip.title,
      thumbnail: `https://img.youtube.com/vi/${tip.videoId}/maxresdefault.jpg`,
      timestamp: tip.timestamp,
      quote: tip.tip,
      url: `https://youtube.com/watch?v=${tip.videoId}&t=${Math.floor(tip.timestamp)}s`,
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
