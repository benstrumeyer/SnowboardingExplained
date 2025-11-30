/**
 * Videos API Endpoint
 * GET /api/videos
 * 
 * Returns list of all unique Taevis videos from Pinecone
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pinecone } from '@pinecone-database/pinecone';

interface Video {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

// Cache videos in memory (refreshes on cold start)
let videoCache: Video[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchVideosFromPinecone(): Promise<Video[]> {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);
  
  // Query with a generic vector to get all results
  // We'll use a zero vector and high topK to get many results
  const dummyVector = new Array(768).fill(0);
  
  const queryResponse = await index.query({
    vector: dummyVector,
    topK: 1000, // Get as many as possible
    includeMetadata: true,
  });
  
  // Extract unique videos by videoId
  const videoMap = new Map<string, Video>();
  
  for (const match of queryResponse.matches || []) {
    const videoId = match.metadata?.videoId as string;
    const videoTitle = match.metadata?.videoTitle as string;
    
    if (videoId && !videoMap.has(videoId)) {
      videoMap.set(videoId, {
        videoId,
        title: videoTitle || 'Untitled',
        url: `https://youtube.com/watch?v=${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  }
  
  // Sort by title
  return Array.from(videoMap.values()).sort((a, b) => 
    a.title.localeCompare(b.title)
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (videoCache && (now - cacheTimestamp) < CACHE_TTL) {
      return res.status(200).json({ 
        videos: videoCache,
        cached: true,
        count: videoCache.length,
      });
    }
    
    // Fetch fresh data from Pinecone
    console.log('Fetching videos from Pinecone...');
    const videos = await fetchVideosFromPinecone();
    
    // Update cache
    videoCache = videos;
    cacheTimestamp = now;
    
    console.log(`Found ${videos.length} unique videos`);
    
    return res.status(200).json({ 
      videos,
      cached: false,
      count: videos.length,
    });
    
  } catch (error: any) {
    console.error('Videos API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}
