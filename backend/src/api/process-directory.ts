import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { parsePickleToFrames } from '../services/pickleParserService';
import { extractVideoMetadata } from '../services/videoMetadataService';
import { saveVideoMetadata, connectToMongoDB, storeFrames } from '../services/frameQueryService';

const router = Router();
const TEMP_DIR = '/tmp/video_processing';

function generateVideoId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

router.post('/process-directory', async (req: Request, res: Response) => {
  console.log(`[PROCESS-DIRECTORY] 🚀 POST /api/video/process-directory`);

  try {
    // 1. Validate directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      console.log(`[PROCESS-DIRECTORY] ✗ Directory not found: ${TEMP_DIR}`);
      return res.status(400).json({
        success: false,
        error: `Directory not found: ${TEMP_DIR}`,
      });
    }
    console.log(`[PROCESS-DIRECTORY] ✓ Directory exists: ${TEMP_DIR}`);

    // 2. Find .pkl file
    console.log(`[PROCESS-DIRECTORY] 🔍 Searching for .pkl file in ${TEMP_DIR}`);
    const pklFiles = glob.sync(`${TEMP_DIR}/**/*.pkl`);

    if (pklFiles.length === 0) {
      console.log(`[PROCESS-DIRECTORY] ✗ No pickle file found`);
      return res.status(400).json({
        success: false,
        error: 'No pickle file found in directory',
      });
    }

    const pklPath = pklFiles[0];
    console.log(`[PROCESS-DIRECTORY] ✓ Found pickle file: ${pklPath}`);

    // 3. Find original video file
    console.log(`[PROCESS-DIRECTORY] 🔍 Searching for video file in ${TEMP_DIR}`);
    const videoFiles = glob.sync(`${TEMP_DIR}/*.mp4`).filter((f) => !f.includes('output'));

    if (videoFiles.length === 0) {
      console.log(`[PROCESS-DIRECTORY] ✗ No video file found`);
      return res.status(400).json({
        success: false,
        error: 'No video file found in directory',
      });
    }

    const videoPath = videoFiles[0];
    console.log(`[PROCESS-DIRECTORY] ✓ Found video file: ${videoPath}`);

    // 4. Extract video metadata
    console.log(`[PROCESS-DIRECTORY] 📊 Extracting video metadata...`);
    let metadata;
    try {
      metadata = await extractVideoMetadata(videoPath);
      console.log(`[PROCESS-DIRECTORY] ✓ Extracted metadata:`, metadata);
    } catch (err: any) {
      console.log(`[PROCESS-DIRECTORY] ✗ Failed to extract metadata: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to extract video metadata: ${err.message}`,
      });
    }

    // 5. Parse .pkl output
    console.log(`[PROCESS-DIRECTORY] 🔄 Parsing pickle file...`);
    const parseResult = await parsePickleToFrames(pklPath);

    if (!parseResult.success) {
      console.log(`[PROCESS-DIRECTORY] ✗ Failed to parse pickle: ${parseResult.error}`);
      return res.status(500).json({
        success: false,
        error: `Failed to parse pickle file: ${parseResult.error}`,
      });
    }

    if (!parseResult.frames || parseResult.frames.length === 0) {
      console.log(`[PROCESS-DIRECTORY] ✗ No frames extracted from pickle`);
      return res.status(500).json({
        success: false,
        error: 'No frames extracted from pickle file',
      });
    }

    console.log(`[PROCESS-DIRECTORY] ✓ Parsed ${parseResult.frameCount} frames`);

    // 6. Connect to MongoDB
    console.log(`[PROCESS-DIRECTORY] 🗄️ Connecting to MongoDB...`);
    try {
      await connectToMongoDB();
      console.log(`[PROCESS-DIRECTORY] ✓ Connected to MongoDB`);
    } catch (err: any) {
      console.log(`[PROCESS-DIRECTORY] ✗ Failed to connect to MongoDB: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to connect to MongoDB: ${err.message}`,
      });
    }

    // 7. Store in MongoDB
    console.log(`[PROCESS-DIRECTORY] 💾 Storing frames in MongoDB...`);
    const videoId = generateVideoId();

    try {
      await storeFrames(videoId, parseResult.frames);
      console.log(`[PROCESS-DIRECTORY] ✓ Stored ${parseResult.frameCount} frames`);
    } catch (err: any) {
      console.log(`[PROCESS-DIRECTORY] ✗ Failed to store frames: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: `Failed to store frames in MongoDB: ${err.message}`,
      });
    }

    // 8. Save video metadata
    console.log(`[PROCESS-DIRECTORY] 📝 Saving video metadata...`);
    try {
      const videoMetadata = {
        videoId,
        filename: path.basename(videoPath),
        fps: metadata.fps || 30,
        duration: metadata.duration || (parseResult.frameCount || 0) / 30,
        resolution: metadata.resolution || [1920, 1080] as [number, number],
        frameCount: parseResult.frameCount || 0,
        createdAt: new Date(),
        originalVideoPath: videoPath,
        overlayVideoPath: undefined,
      };
      await saveVideoMetadata(videoMetadata);
      console.log(`[PROCESS-DIRECTORY] ✓ Saved video metadata`);
    } catch (err: any) {
      console.log(`[PROCESS-DIRECTORY] ⚠ Failed to save video metadata: ${err.message}`);
    }

    // 9. Return success
    console.log(`[PROCESS-DIRECTORY] ✓ Processing complete`);
    res.json({
      success: true,
      videoId,
      frameCount: parseResult.frameCount,
      metadata,
      message: 'Video processed successfully',
    });
  } catch (err: any) {
    console.error(`[PROCESS-DIRECTORY] ✗ Unexpected error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: `Unexpected error: ${err.message}`,
    });
  }
});

export default router;
