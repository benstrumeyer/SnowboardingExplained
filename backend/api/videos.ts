/**
 * Videos API Endpoint
 * GET /api/videos
 * 
 * Returns list of all Taevis videos with thumbnails
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

interface Video {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

// Cache the video list in memory
let videoCache: Video[] | null = null;

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
    // Return cached data if available
    if (videoCache) {
      return res.status(200).json({ videos: videoCache });
    }
    
    // Try to load from file
    const videoDbPath = path.join(process.cwd(), 'backend', 'data', 'video-database.json');
    
    if (fs.existsSync(videoDbPath)) {
      const data = fs.readFileSync(videoDbPath, 'utf-8');
      videoCache = JSON.parse(data);
      return res.status(200).json({ videos: videoCache });
    }
    
    // Fallback: return empty array
    return res.status(200).json({ videos: [] });
    
  } catch (error: any) {
    console.error('Videos API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}
