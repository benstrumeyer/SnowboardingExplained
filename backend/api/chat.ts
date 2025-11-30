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
    
    // Get top 5 unique videos with best matching segments
    const videoMap = new Map<string, typeof relevantSegments[0]>();
    for (const segment of relevantSegments) {
      if (!videoMap.has(segment.videoId)) {
        videoMap.set(segment.videoId, segment);
      }
    }
    
    const topVideos = Array.from(videoMap.values()).slice(0, 5); // Top 5 videos
    console.log(`Grouped into ${topVideos.length} videos`);
    
    // Generate 5 actionable tips using AI - one per video
    const tipsPrompt = `You are a snowboarding coach. Based on these video transcripts about "${context.trick}", generate exactly 5 specific, actionable tips.

Each tip should be:
- 1-2 sentences max
- Specific and actionable (not generic advice)
- Based on the actual content from the transcripts

Transcripts:
${topVideos.map((v, i) => `${i + 1}. [${v.videoTitle}]: "${v.text}"`).join('\n\n')}

User's specific issue: ${context.issues || 'general help'}

Return ONLY a JSON array of 5 tips, like this:
["Tip 1 text here", "Tip 2 text here", "Tip 3 text here", "Tip 4 text here", "Tip 5 text here"]`;

    let tips: string[] = [];
    try {
      const tipsResult = await generateCoachingResponse(
        { trick: context.trick },
        topVideos,
        tipsPrompt
      );
      
      // Parse JSON array from response
      const jsonMatch = tipsResult.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tips = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Failed to generate tips, using fallback');
      // Fallback: extract key sentences from transcripts
      tips = topVideos.map(v => v.text.split('.')[0] + '.');
    }
    
    // Ensure we have exactly 5 tips
    while (tips.length < 5 && topVideos.length > tips.length) {
      tips.push(topVideos[tips.length]?.text.split('.')[0] + '.' || 'Focus on your form and technique.');
    }
    tips = tips.slice(0, 5);
    
    // Generate overall coaching response
    const coachingResponse = await generateCoachingResponse(
      context,
      topVideos,
      message
    );
    
    // Format video references with tips - each video gets its corresponding tip
    const videoReferences: VideoReference[] = topVideos.map((video, index) => ({
      videoId: video.videoId,
      title: video.videoTitle,
      thumbnail: `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
      timestamp: video.timestamp,
      quote: tips[index] || video.text.substring(0, 150) + '...',
      url: `https://youtube.com/watch?v=${video.videoId}&t=${Math.floor(video.timestamp)}s`,
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
