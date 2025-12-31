import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import logger from '../logger';
import { meshDataService } from '../services/meshDataService';

const router = Router();

// Simple ID generator for video uploads
let videoIdCounter = 0;

/**
 * POST /api/pose/video
 * 
 * Uploads video to pose service for processing with PHALP
 * Expects multipart form data with 'video' file
 * Returns videoId that can be used to retrieve mesh data
 */
router.post('/video', async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Generate videoId
    videoIdCounter++;
    const videoId = `v_${Date.now()}_${videoIdCounter}`;
    
    const videoPath = req.file.path;
    console.log(`[POSE-API] ========================================`);
    console.log(`[POSE-API] Processing video: ${videoPath}`);
    console.log(`[POSE-API] File size: ${req.file.size} bytes`);
    console.log(`[POSE-API] Using videoId: ${videoId}`);

    // Rename file to match videoId
    const uploadDir = fs.existsSync('/shared/videos')
      ? '/shared/videos'
      : path.dirname(videoPath);
    const ext = path.extname(req.file.originalname) || '.mp4';
    const newVideoPath = path.join(uploadDir, videoId + ext);
    fs.renameSync(videoPath, newVideoPath);
    
    console.log(`[POSE-API] Renamed to: ${newVideoPath}`);

    // Send video to pose service via JSON request
    try {
      console.log(`[POSE-API] Sending video to pose service...`);
      const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://pose-service:5000';
      
      const response = await axios.post(`${poseServiceUrl}/pose/video`, {
        video_path: newVideoPath
      }, {
        timeout: 600000 // 10 minute timeout for video processing
      });
      
      console.log(`[POSE-API] ✓ Pose service response status:`, response.status);
      console.log(`[POSE-API] ✓ Response data:`, JSON.stringify(response.data, null, 2));
      
      const jobId = response.data.job_id;
      
      // Poll for job completion
      console.log(`[POSE-API] Polling for job completion...`);
      let jobComplete = false;
      let attempts = 0;
      const maxAttempts = 600; // 10 minutes with 1 second polling
      let jobResult: any = null;
      
      while (!jobComplete && attempts < maxAttempts) {
        attempts++;
        
        try {
          const statusResponse = await axios.get(`${poseServiceUrl}/pose/video/status/${jobId}`, {
            timeout: 10000
          });
          
          console.log(`[POSE-API] Job status (attempt ${attempts}):`, statusResponse.data.status);
          
          if (statusResponse.data.status === 'complete') {
            jobComplete = true;
            jobResult = statusResponse.data.result;
            console.log(`[POSE-API] ✓ Job complete!`);
          } else if (statusResponse.data.status === 'error') {
            throw new Error(`Job failed: ${statusResponse.data.error}`);
          }
        } catch (pollErr: any) {
          if (pollErr.message && pollErr.message.includes('Job failed')) {
            throw pollErr;
          }
          // Continue polling on other errors
        }
        
        if (!jobComplete) {
          // Wait 1 second before polling again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!jobComplete) {
        throw new Error('Job processing timeout');
      }
      
      // Extract mesh data from job result
      const meshSequence = jobResult?.frames || [];
      
      console.log(`[POSE-API] ✓ Received ${meshSequence.length} frames with pose data`);
      
      // Save mesh data to MongoDB
      try {
        console.log(`[POSE-API] Saving ${meshSequence.length} frames to MongoDB...`);
        await meshDataService.connect();
        
        // Build complete MeshData object
        const meshData = {
          videoId,
          videoUrl: `/videos/${videoId}`,
          fps: jobResult?.fps || 30,
          videoDuration: jobResult?.video_duration || 0,
          frameCount: meshSequence.length,
          totalFrames: meshSequence.length,
          frames: meshSequence,
          metadata: {
            uploadedAt: new Date(),
            processingTime: jobResult?.processing_time || 0,
            extractionMethod: 'pose-service-phalp',
            poseJobId: jobId
          }
        };
        
        await meshDataService.saveMeshData(meshData);
        console.log(`[POSE-API] ✓ Saved mesh data to MongoDB`);
      } catch (err: any) {
        console.error(`[POSE-API] ✗ Failed to save mesh data:`, err.message);
        logger.error(`Failed to save mesh data for ${videoId}:`, err.message);
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

    } catch (err: any) {
      console.error(`[POSE-API] ✗ Pose service error:`, err.message);
      if (err.response) {
        console.error(`[POSE-API] Response status:`, err.response.status);
        console.error(`[POSE-API] Response data:`, JSON.stringify(err.response.data, null, 2));
      }
      logger.error(`Pose service error for ${videoId}: ${err.message}`);
      return res.status(500).json({
        error: 'Failed to process video with pose service',
        details: err.message,
        videoId
      });
    }

  } catch (error) {
    console.error('[POSE-API] ✗ Outer catch block error:', error);
    logger.error('Pose video processing error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
