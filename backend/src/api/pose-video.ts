import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../logger';
import { processVideoWithTrackPy } from '../services/videoProcessingService';
import { parsePickleToFrames } from '../services/pickleParserService';
import * as frameStorageService from '../services/frameStorageService';
import * as frameQueryService from '../services/frameQueryService';

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

async function processVideoInBackground(videoId: string, jobId: string, videoPath: string) {
  try {
    addJobLog(jobId, `🚀 Starting background processing for ${videoId}`);

    // Phase 1: Spawn track.py subprocess
    addJobLog(jobId, `[PHASE 1] VIDEO PROCESSING (track.py)`);
    const processingResult = await processVideoWithTrackPy(videoPath);

    if (!processingResult.success) {
      throw new Error(`Video processing failed: ${processingResult.error}`);
    }

    addJobLog(jobId, `✓ Video processing completed in ${processingResult.processingTimeMs}ms`);

    if (!processingResult.pklPath) {
      throw new Error('No pickle file found after processing');
    }

    addJobLog(jobId, `✓ Pickle file: ${processingResult.pklPath}`);

    if (processingResult.overlayVideoPath) {
      addJobLog(jobId, `✓ Overlay video: ${processingResult.overlayVideoPath}`);
    } else {
      addJobLog(jobId, `⚠ No overlay video found`);
    }

    // Phase 2: Parse pickle file
    addJobLog(jobId, `[PHASE 2] PICKLE PARSING`);
    const parseResult = await parsePickleToFrames(processingResult.pklPath);

    if (!parseResult.success) {
      throw new Error(`Pickle parsing failed: ${parseResult.error}`);
    }

    addJobLog(jobId, `✓ Parsed ${parseResult.frameCount} frames`);

    if (!parseResult.frames || parseResult.frames.length === 0) {
      throw new Error('No frames extracted from pickle');
    }

    // Phase 3: Store frames in MongoDB
    addJobLog(jobId, `[PHASE 3] MONGODB STORAGE`);
    await frameStorageService.connectToMongoDB();
    await frameStorageService.storeFrames(videoId, parseResult.frames);

    addJobLog(jobId, `✓ Stored ${parseResult.frameCount} frames in MongoDB`);

    // Phase 4: Save video metadata
    addJobLog(jobId, `[PHASE 4] VIDEO METADATA`);
    await frameQueryService.connectToMongoDB();

    const videoMetadata = {
      videoId,
      filename: path.basename(videoPath),
      fps: 30,
      duration: (parseResult.frameCount || 0) / 30,
      resolution: [1920, 1080] as [number, number],
      frameCount: parseResult.frameCount || 0,
      createdAt: new Date(),
      originalVideoPath: videoPath,
      overlayVideoPath: processingResult.overlayVideoPath,
    };

    await frameQueryService.saveVideoMetadata(videoMetadata);

    addJobLog(jobId, `✓ Saved video metadata`);

    addJobLog(jobId, `✓✓✓ VIDEO PROCESSING COMPLETE ✓✓✓`);
    addJobLog(jobId, `Video ID: ${videoId}`);
    addJobLog(jobId, `Frames processed: ${parseResult.frameCount}`);
    addJobLog(jobId, `Total time: ${processingResult.processingTimeMs}ms`);

    jobStatus[jobId] = {
      status: 'complete',
      videoId,
      frameCount: parseResult.frameCount,
      completedAt: new Date()
    };

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
 * Uploads video for processing with PHALP via direct subprocess
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
    const jobId = `job_${Date.now()}_${videoIdCounter}`;

    const videoPath = req.file.path;
    console.log(`[POSE-API] ========================================`);
    console.log(`[POSE-API] Processing video: ${videoPath}`);
    console.log(`[POSE-API] File size: ${req.file.size} bytes`);
    console.log(`[POSE-API] Using videoId: ${videoId}`);
    console.log(`[POSE-API] Using jobId: ${jobId}`);

    // Rename file to match videoId
    const uploadDir = fs.existsSync('/shared/videos')
      ? '/shared/videos'
      : path.dirname(videoPath);
    const ext = path.extname(req.file.originalname) || '.mp4';
    const newVideoPath = path.join(uploadDir, videoId + ext);
    fs.renameSync(videoPath, newVideoPath);

    console.log(`[POSE-API] Renamed to: ${newVideoPath}`);
    console.log(`[POSE-API] ========================================`);
    console.log(`[POSE-API] ✓ Job started`);
    console.log(`[POSE-API] Video ID: ${videoId}`);
    console.log(`[POSE-API] Job ID: ${jobId}`);
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
    processVideoInBackground(videoId, jobId, newVideoPath);

  } catch (error) {
    console.error('[POSE-API] ✗ Error:', error);
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
