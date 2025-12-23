/**
 * Video Upload with Pose Extraction API
 * POST /api/upload-video-with-pose
 * 
 * FLOW:
 * 1. Extract frames from video using ffmpeg
 * 2. Convert frames to base64
 * 3. Send to pose service /pose/hybrid endpoint (expects base64 images)
 * 4. Store results in jobStore keyed by videoId
 */

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { FrameExtractionService } from '../src/services/frameExtraction';
import { detectPoseHybridBatch } from '../src/services/pythonPoseService';
import { jobStore, MeshSequence, generateVideoId } from './jobStore';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });

  try {
    const [fields, files] = await form.parse(req);
    
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    const role = Array.isArray(fields.role) ? fields.role[0] : fields.role;

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoPath = videoFile.filepath;
    const videoId = generateVideoId();

    console.log(`[UPLOAD] ========================================`);
    console.log(`[UPLOAD] Processing video: ${videoPath}`);
    console.log(`[UPLOAD] Video ID: ${videoId}`);
    console.log(`[UPLOAD] Role: ${role}`);

    // Store initial job status
    jobStore[videoId] = {
      status: 'processing',
      videoId,
      role,
      startedAt: Date.now(),
    };

    // Start async processing
    processVideoAsync(videoId, videoPath, role || 'rider');

    return res.status(202).json({
      videoId,
      status: 'processing',
      message: 'Video processing started. Poll /api/mesh-data/{videoId} for completion.',
    });

  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
}

async function processVideoAsync(videoId: string, videoPath: string, role: string) {
  try {
    console.log(`[ASYNC ${videoId}] Starting async video processing...`);
    
    // Step 1: Extract frames from video
    console.log(`[ASYNC ${videoId}] Extracting frames from video...`);
    const extractionResult = await FrameExtractionService.extractFrames(videoPath, videoId, 4);
    console.log(`[ASYNC ${videoId}] Extracted ${extractionResult.frameCount} frames`);

    // Step 2: Convert frames to base64
    console.log(`[ASYNC ${videoId}] Converting frames to base64...`);
    const framesBase64 = extractionResult.frames.map(frame => ({
      imageBase64: FrameExtractionService.getFrameAsBase64(frame.imagePath),
      frameNumber: frame.frameNumber,
    }));
    console.log(`[ASYNC ${videoId}] Converted ${framesBase64.length} frames to base64`);

    // Step 3: Send to pose service (expects base64 images, not video files)
    console.log(`[ASYNC ${videoId}] Sending frames to pose service...`);
    const poseResults = await detectPoseHybridBatch(framesBase64, false);
    console.log(`[ASYNC ${videoId}] Received pose results for ${poseResults.length} frames`);

    // Step 4: Extract mesh data from pose results
    const meshData: MeshSequence = {
      frames: poseResults.map(result => ({
        frameNumber: result.frameNumber,
        timestamp: result.frameNumber * 33, // Approximate 30fps
        vertices: result.mesh_vertices_data || [],
        faces: result.mesh_faces_data || [],
        keypoints: result.keypoints || [],
      })),
    };

    jobStore[videoId] = {
      status: 'complete',
      videoId,
      role,
      result: meshData,
      completedAt: Date.now(),
    };
    
    console.log(`[ASYNC ${videoId}] ✓ Complete! Stored ${meshData.frames.length} frames`);

  } catch (error) {
    console.error(`[ASYNC ${videoId}] Error:`, error);
    jobStore[videoId] = {
      status: 'error',
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Date.now(),
    };
  }
}
