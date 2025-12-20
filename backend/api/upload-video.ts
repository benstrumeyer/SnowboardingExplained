/**
 * Video Upload API Endpoint
 * POST /api/upload-video
 * Handles video upload and triggers the analysis pipeline
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../mcp-server/src/db/connection';
import {
  processVideoUpload,
  UploadVideoRequest,
  UploadVideoResponse,
} from '../src/services/videoAnalysisPipelineImpl';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadVideoResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      videoId: '',
      status: 'failed',
      error: 'Method not allowed',
    });
  }

  try {
    // Connect to database
    const db = await connectDB();

    // Parse request
    const { videoPath, intendedTrick, stance } = req.body as UploadVideoRequest;

    if (!videoPath) {
      return res.status(400).json({
        videoId: '',
        status: 'failed',
        error: 'videoPath is required',
      });
    }

    // Validate stance if provided
    if (stance && !['regular', 'goofy'].includes(stance)) {
      return res.status(400).json({
        videoId: '',
        status: 'failed',
        error: 'stance must be "regular" or "goofy"',
      });
    }

    // Process video
    const result = await processVideoUpload(db, {
      videoPath,
      intendedTrick,
      stance: stance as 'regular' | 'goofy' | undefined,
    });

    // Return response
    if (result.status === 'failed') {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in upload-video endpoint:', error);

    return res.status(500).json({
      videoId: '',
      status: 'failed',
      error: String(error),
    });
  }
}
