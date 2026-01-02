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

// Store job status for background processing
const jobStatus: { [key: string]: any } = {};

// Store logs for each job
const jobLogs: { [key: string]: string[] } = {};

function addJobLog(jobId: string, message: string) {
  if (!jobLogs[jobId]) {
    jobLogs[jobId] = [];
  }
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  jobLogs[jobId].push(logMessage);
  console.log(`[JOB-LOG] ${jobId}: ${message}`);
}

async function processVideoInBackground(videoId: string, jobId: string, videoPath: string, poseServiceUrl: string) {
  try {
    addJobLog(jobId, `Starting background processing for ${videoId}`);

    // Poll for job completion
    let jobComplete = false;
    let attempts = 0;
    const maxAttempts = 600; // 10 minutes with 1 second polling
    let jobResult: any = null;

    while (!jobComplete && attempts < maxAttempts) {
      attempts++;

      try {
        const statusResponse = await axios.get(`${poseServiceUrl}/job_status/${jobId}`, {
          timeout: 10000
        });

        addJobLog(jobId, `Job status (attempt ${attempts}): ${statusResponse.data.status}`);

        if (statusResponse.data.status === 'complete') {
          jobComplete = true;
          jobResult = statusResponse.data.result;
          addJobLog(jobId, `✓ Job complete!`);
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

    addJobLog(jobId, `✓ Received ${meshSequence.length} frames with pose data`);

    // Save mesh data to MongoDB
    try {
      addJobLog(jobId, `Saving ${meshSequence.length} frames to MongoDB...`);
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
      addJobLog(jobId, `✓ Saved mesh data to MongoDB`);

      jobStatus[jobId] = {
        status: 'complete',
        videoId,
        frameCount: meshSequence.length,
        completedAt: new Date()
      };
    } catch (err: any) {
      addJobLog(jobId, `✗ Failed to save mesh data: ${err.message}`);
      logger.error(`Failed to save mesh data for ${videoId}:`, err.message);
      jobStatus[jobId] = {
        status: 'complete',
        videoId,
        frameCount: meshSequence.length,
        completedAt: new Date(),
        warning: 'Pose data extracted but failed to save to MongoDB'
      };
    }

    addJobLog(jobId, `✓✓✓ VIDEO PROCESSING COMPLETE ✓✓✓`);
    addJobLog(jobId, `Video ID: ${videoId}`);
    addJobLog(jobId, `Frames processed: ${meshSequence.length}`);

  } catch (err: any) {
    addJobLog(jobId, `✗ Error in background processing: ${err.message}`);
    logger.error(`Background processing error for ${videoId}: ${err.message}`);
    jobStatus[jobId] = {
      status: 'error',
      videoId,
      error: err.message,
      failedAt: new Date()
    };
  }
}

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

    // Send video to pose service via multipart form data
    try {
      console.log(`[POSE-API] Sending video to pose service...`);
      const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';

      const formData = new FormData();
      formData.append('video', fs.createReadStream(newVideoPath));
      formData.append('max_frames', '999999');

      const response = await axios.post(`${poseServiceUrl}/process_video_async`, formData, {
        headers: formData.getHeaders(),
        timeout: 600000 // 10 minute timeout for video processing
      });

      console.log(`[POSE-API] ✓ Pose service response status:`, response.status);
      console.log(`[POSE-API] ✓ Response data:`, JSON.stringify(response.data, null, 2));

      const jobId = response.data.job_id;

      console.log(`[POSE-API] ========================================`);
      console.log(`[POSE-API] ✓ Job started on pose service`);
      console.log(`[POSE-API] Video ID: ${videoId}`);
      console.log(`[POSE-API] Pose Job ID: ${jobId}`);
      console.log(`[POSE-API] ========================================`);

      // Return immediately with jobId - let frontend poll for status
      res.json({
        success: true,
        videoId,
        jobId,
        message: 'Video processing started',
        fileSize: req.file.size,
        status: 'processing'
      });

      // Process in background (don't await)
      processVideoInBackground(videoId, jobId, newVideoPath, poseServiceUrl);

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

/**
 * GET /api/pose/job_status/:jobId
 * 
 * Check the status of a background video processing job
 */
router.get('/job_status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const status = jobStatus[jobId];

  if (!status) {
    return res.status(404).json({
      error: 'Job not found',
      jobId
    });
  }

  res.json(status);
});

/**
 * GET /api/pose/job_logs/:jobId
 * 
 * Get logs for a background video processing job
 */
router.get('/job_logs/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const logs = jobLogs[jobId] || [];

  res.json({
    jobId,
    logs,
    logCount: logs.length
  });
});

export default router;
