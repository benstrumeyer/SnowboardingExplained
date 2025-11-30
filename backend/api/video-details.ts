/**
 * Video Details API Endpoint
 * GET /api/video-details?videoId=xxx
 * 
 * Returns video details including all tips from that video
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pinecone } from '@pinecone-database/pinecone';

interface VideoDetails {
  videoId: string;
  title: string;
  duration: number;
  url: string;
  thumbnail: string;
  tips: string[];
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
    const { videoId } = req.query;
    
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ error: 'videoId is required' });
    }
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
    const index = pinecone.index(indexName);
    
    // Query for summary entries from this video
    const dummyVector = new Array(768).fill(0);
    
    const queryResponse = await index.query({
      vector: dummyVector,
      topK: 500,
      includeMetadata: true,
      filter: {
        videoId: { $eq: videoId },
        summaryOnly: { $eq: true }
      }
    });
    
    // If no summaries found, try to get video info from any segment
    let videoTitle = 'Untitled';
    let duration = 0;
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const firstMatch = queryResponse.matches[0];
      videoTitle = firstMatch.metadata?.videoTitle as string || 'Untitled';
      duration = firstMatch.metadata?.totalDuration as number || 0;
    } else {
      // Fallback: query without summaryOnly filter to get video info
      const fallbackResponse = await index.query({
        vector: dummyVector,
        topK: 1,
        includeMetadata: true,
        filter: {
          videoId: { $eq: videoId }
        }
      });
      
      if (!fallbackResponse.matches || fallbackResponse.matches.length === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }
      
      videoTitle = fallbackResponse.matches[0].metadata?.videoTitle as string || 'Untitled';
      duration = fallbackResponse.matches[0].metadata?.totalDuration as number || 0;
    }
    
    // Collect summary points (already sorted by pointIndex)
    const summaryPoints: string[] = [];
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        const text = match.metadata?.text as string;
        if (text) {
          summaryPoints.push(text.trim());
        }
      }
    }
    
    const tips = summaryPoints;
    
    const videoDetails: VideoDetails = {
      videoId,
      title: videoTitle || 'Untitled',
      duration,
      url: `https://youtube.com/watch?v=${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      tips,
    };
    
    return res.status(200).json(videoDetails);
    
  } catch (error: any) {
    console.error('Video Details API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}
