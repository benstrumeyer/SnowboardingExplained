import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../logger';
import { FrameExtractionService } from '../services/frameExtraction';
import { meshDataService } from '../services/meshDataService';
import { detectPoseHybridBatch } from '../services/pythonPoseService';

const router = Router();

// Simple ID generator for video uploads
let videoIdCounter = 0;
function generateVideoId(): string {
  videoIdCounter++;
  return `v_${Date.now()}_${videoIdCounter}`;
}

/**
 * POST /api/pose/video
 * 
 * Processes uploaded video by extracting frames and sending them to the pose service via HTTP
 * Expects multipart form data with 'video' file and optional 'videoId' field
 * Returns videoId that can be used to retrieve mesh data
 */
router.post('/video', async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Use videoId from frontend if provided, otherwise generate one
    let videoId = req.body.videoId;
    if (!videoId) {
      videoIdCounter++;
      videoId = `v_${Date.now()}_${videoIdCounter}`;
    }
    
    const videoPath = req.file.path;
    console.log(`[POSE-API] ========================================`);
    console.log(`[POSE-API] Processing video: ${videoPath}`);
    console.log(`[POSE-API] File size: ${req.file.size} bytes`);
    console.log(`[POSE-API] Using videoId: ${videoId}`);

    // Rename file to match videoId
    const uploadDir = path.dirname(videoPath);
    const ext = path.extname(req.file.originalname) || '.mp4';
    const newVideoPath = path.join(uploadDir, videoId + ext);
    fs.renameSync(videoPath, newVideoPath);
    
    console.log(`[POSE-API] Renamed to: ${newVideoPath}`);

    // Extract frames
    let frameResult;
    try {
      console.log(`[POSE-API] Extracting frames...`);
      frameResult = await FrameExtractionService.extractFrames(newVideoPath, videoId);
      console.log(`[POSE-API] ✓ Extracted ${frameResult.frameCount} frames`);
    } catch (err: any) {
      console.error(`[POSE-API] ✗ Frame extraction failed:`, err);
      logger.error(`Frame extraction failed for ${videoId}:`, err);
      return res.status(400).json({ 
        error: 'Failed to extract frames from video. The file may be corrupted or in an unsupported format.',
        details: err.message,
        videoId
      });
    }

    // Prepare frames for pose extraction
    const framesToProcess: any[] = [];
    for (let i = 0; i < frameResult.frameCount; i++) {
      const frame = frameResult.frames[i];
      if (frame) {
        try {
          const imageBase64 = FrameExtractionService.getFrameAsBase64(frame.imagePath);
          framesToProcess.push({
            frameNumber: i,
            imageBase64: imageBase64,
            timestamp: frame.timestamp
          });
        } catch (err) {
          console.error(`[POSE-API] Error reading frame ${i}:`, err);
          logger.warn(`Failed to read frame ${i}:`, err);
        }
      }
    }
    
    console.log(`[POSE-API] Prepared ${framesToProcess.length} frames for pose extraction`);

    // Extract pose data using the hybrid batch service
    const meshSequence: any[] = [];
    try {
      console.log(`[POSE-API] Sending ${framesToProcess.length} frames to pose service...`);
      const poseResults = await detectPoseHybridBatch(framesToProcess);
      
      console.log(`[POSE-API] ✓ Received ${poseResults.length} pose results`);
      
      for (let i = 0; i < poseResults.length; i++) {
        const result = poseResults[i];
        if (result && !result.error && result.keypoints && result.keypoints.length > 0) {
          meshSequence.push({
            frameNumber: i,
            timestamp: framesToProcess[i]?.timestamp || 0,
            keypoints: result.keypoints,
            has3d: result.has3d,
            jointAngles3d: result.jointAngles3d,
            mesh_vertices_data: result.mesh_vertices_data,
            mesh_faces_data: result.mesh_faces_data,
            cameraTranslation: result.cameraTranslation
          });
        } else {
          console.warn(`[POSE-API] Frame ${i} had no valid pose data:`, result?.error);
        }
      }
      
      console.log(`[POSE-API] ✓ Successfully processed ${meshSequence.length}/${framesToProcess.length} frames with pose data`);
    } catch (err: any) {
      console.error(`[POSE-API] ✗ Pose extraction failed:`, err);
      logger.error(`Pose extraction failed for ${videoId}:`, err);
      return res.status(500).json({
        error: 'Failed to extract pose data from video',
        details: err.message,
        videoId
      });
    }

    // Save mesh data to MongoDB
    try {
      console.log(`[POSE-API] Saving ${meshSequence.length} frames to MongoDB...`);
      await meshDataService.connect();
      
      // Build complete MeshData object
      const meshData = {
        videoId,
        videoUrl: `/videos/${videoId}`,
        fps: frameResult.fps || 30,
        videoDuration: frameResult.videoDuration || 0,
        frameCount: meshSequence.length,
        totalFrames: meshSequence.length,
        frames: meshSequence,
        metadata: {
          uploadedAt: new Date(),
          processingTime: 0,
          extractionMethod: 'pose-service'
        }
      };
      
      await meshDataService.saveMeshData(meshData);
      console.log(`[POSE-API] ✓ Saved mesh data to MongoDB`);
    } catch (err: any) {
      console.error(`[POSE-API] ✗ Failed to save mesh data:`, err);
      logger.error(`Failed to save mesh data for ${videoId}:`, err);
      // Don't fail the request - pose data was extracted successfully
    }

    console.log(`[POSE-API] ========================================`);
    console.log(`[POSE-API] ✓✓✓ VIDEO PROCESSING COMPLETE ✓✓✓`);
    console.log(`[POSE-API] Video ID: ${videoId}`);
    console.log(`[POSE-API] Frames processed: ${meshSequence.length}`);
    console.log(`[POSE-API] ========================================`);

    res.json({
      success: true,
      videoId,
      frameCount: meshSequence.length,
      message: 'Video processed successfully',
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('[POSE-API] ✗ Outer catch block error:', error);
    logger.error('Pose video processing error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
