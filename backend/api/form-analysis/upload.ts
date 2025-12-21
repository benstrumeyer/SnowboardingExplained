/**
 * Form Analysis Upload Endpoint
 * POST /api/form-analysis/upload
 * Handles video upload and triggers the form analysis pipeline
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../mcp-server/src/db/connection';
import {
  processVideoUpload,
  UploadVideoRequest,
  UploadVideoResponse,
} from '../../src/services/videoAnalysisPipelineImpl';
import { getVideoAnalysis } from '../../src/services/videoAnalysisPipelineImpl';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Connect to database
    const db = await connectDB();

    // For now, we'll use a mock video path since we're not handling file uploads yet
    // In production, you'd save the uploaded file and get its path
    const mockVideoPath = '/tmp/trick-video.mp4';

    // Parse optional parameters from request body
    const { intendedTrick, stance } = req.body;

    // Validate stance if provided
    if (stance && !['regular', 'goofy'].includes(stance)) {
      return res.status(400).json({
        success: false,
        error: 'stance must be "regular" or "goofy"',
      });
    }

    // Process video
    const result = await processVideoUpload(db, {
      videoPath: mockVideoPath,
      intendedTrick,
      stance: stance as 'regular' | 'goofy' | undefined,
    });

    if (result.status === 'failed') {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    // Fetch the complete analysis
    const analysis = await getVideoAnalysis(db, result.videoId);

    if (!analysis) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        videoId: analysis.videoId,
        duration: analysis.duration,
        frameCount: analysis.frameCount,
        fps: analysis.fps,
        stance: analysis.stance,
        phases: analysis.phases,
        summary: analysis.summary,
      },
    });
  } catch (error) {
    console.error('Error in form-analysis/upload endpoint:', error);

    return res.status(500).json({
      success: false,
      error: String(error),
    });
  }
}
