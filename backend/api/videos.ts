/**
 * Videos API Endpoint
 * GET /api/videos
 * 
 * Returns list of all Taevis videos with thumbnails
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import video database directly (works with Vercel bundling)
import videoDatabase from '../data/video-database.json';

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
    return res.status(200).json({ videos: videoDatabase });
  } catch (error: any) {
    console.error('Videos API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}
