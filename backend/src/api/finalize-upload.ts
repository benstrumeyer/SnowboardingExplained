import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { processVideoWithTrackPy } from '../services/videoProcessingService';
import { parsePickleToFrames } from '../services/pickleParserService';
import * as frameStorageService from '../services/frameStorageService';
import * as frameQueryService from '../services/frameQueryService';

const router = Router();

async function processVideoEndToEnd(videoId: string, videoPath: string) {
  try {
    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] 🚀 FINALIZE-UPLOAD ENDPOINT CALLED`);
    console.log(`[FINALIZE] Generated videoId: ${videoId}`);
    console.log(`[FINALIZE] Video path: ${videoPath}`);
    console.log(`[FINALIZE] ========================================`);

    // Phase 1: Spawn track.py subprocess
    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] PHASE 1: VIDEO PROCESSING (track.py)`);
    console.log(`[FINALIZE] ========================================`);

    const processingResult = await processVideoWithTrackPy(videoPath);

    if (!processingResult.success) {
      console.error(`[FINALIZE] ✗ Video processing failed: ${processingResult.error}`);
      throw new Error(`Video processing failed: ${processingResult.error}`);
    }

    console.log(`[FINALIZE] ✓ Video processing completed in ${processingResult.processingTimeMs}ms`);

    if (!processingResult.pklPath) {
      throw new Error('No pickle file found after processing');
    }

    console.log(`[FINALIZE] ✓ Pickle file: ${processingResult.pklPath}`);

    if (processingResult.overlayVideoPath) {
      console.log(`[FINALIZE] ✓ Overlay video: ${processingResult.overlayVideoPath}`);
    } else {
      console.log(`[FINALIZE] ⚠ No overlay video found`);
    }

    // Phase 2: Parse pickle file
    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] PHASE 2: PICKLE PARSING`);
    console.log(`[FINALIZE] ========================================`);

    const parseResult = await parsePickleToFrames(processingResult.pklPath);

    if (!parseResult.success) {
      console.error(`[FINALIZE] ✗ Pickle parsing failed: ${parseResult.error}`);
      throw new Error(`Pickle parsing failed: ${parseResult.error}`);
    }

    console.log(`[FINALIZE] ✓ Parsed ${parseResult.frameCount} frames`);

    if (!parseResult.frames || parseResult.frames.length === 0) {
      throw new Error('No frames extracted from pickle');
    }

    // Phase 3: Store frames in MongoDB
    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] PHASE 3: MONGODB STORAGE`);
    console.log(`[FINALIZE] ========================================`);

    await frameStorageService.connectToMongoDB();
    await frameStorageService.storeFrames(videoId, parseResult.frames);

    console.log(`[FINALIZE] ✓ Stored ${parseResult.frameCount} frames in MongoDB`);

    // Phase 4: Save video metadata
    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] PHASE 4: VIDEO METADATA`);
    console.log(`[FINALIZE] ========================================`);

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

    console.log(`[FINALIZE] ✓ Saved video metadata`);

    console.log(`[FINALIZE] ========================================`);
    console.log(`[FINALIZE] ✓✓✓ FINALIZE-UPLOAD COMPLETE ✓✓✓`);
    console.log(`[FINALIZE] Video ID: ${videoId}`);
    console.log(`[FINALIZE] Frames processed: ${parseResult.frameCount}`);
    console.log(`[FINALIZE] Total time: ${processingResult.processingTimeMs}ms`);
    console.log(`[FINALIZE] ========================================`);

    return {
      success: true,
      videoId,
      frameCount: parseResult.frameCount,
      processingTimeMs: processingResult.processingTimeMs,
    };
  } catch (err: any) {
    console.error(`[FINALIZE] ✗ Error in end-to-end processing: ${err.message}`);
    console.error(`[FINALIZE] Stack: ${err.stack}`);
    throw err;
  }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { role, sessionId, filename, filesize } = req.body;

    console.log(`[FINALIZE] POST /api/finalize-upload`);
    console.log(`[FINALIZE] Role: ${role}, SessionId: ${sessionId}`);
    console.log(`[FINALIZE] Filename: ${filename}, Filesize: ${filesize}`);

    if (!filename) {
      return res.status(400).json({
        error: 'Missing filename',
      });
    }

    // Generate videoId
    const videoId = `v_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Construct video path
    const videoDir = '/tmp/videos';
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    const videoPath = path.join(videoDir, `${videoId}.mp4`);

    console.log(`[FINALIZE] Generated videoId: ${videoId}`);
    console.log(`[FINALIZE] Video path: ${videoPath}`);

    // Process video end-to-end
    const result = await processVideoEndToEnd(videoId, videoPath);

    res.json({
      success: true,
      videoId: result.videoId,
      frameCount: result.frameCount,
      processingTimeMs: result.processingTimeMs,
      message: 'Video processing complete',
    });
  } catch (err: any) {
    console.error(`[FINALIZE] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
      videoId: req.body?.videoId,
    });
  }
});

export default router;
