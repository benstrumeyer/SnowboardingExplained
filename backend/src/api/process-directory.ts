import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { parsePickleToFrames } from '../services/pickleParserService';
import { extractVideoMetadata } from '../services/videoMetadataService';
import { saveVideoMetadata, connectToMongoDB, storeFrames } from '../services/frameQueryService';
import { extractBothVideoFrames } from '../services/videoFrameExtractor';
import { storeVideoFrames, connectToMongoDB as connectVideoFramesMongo } from '../services/videoFrameStorage';

const router = Router();
const UNPROCESSED_DIR = path.join(process.cwd(), 'data', 'unprocessedvideos');
const VIDEOS_DIR = path.join(process.cwd(), 'data', 'videos');

function generateVideoId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function processUnprocessedVideo(unprocessedPath: string): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    console.log(`[PROCESS-DIRECTORY] Processing unprocessed video: ${unprocessedPath}`);

    const pklFiles = glob.sync(`${unprocessedPath}/**/*.pkl`);
    if (pklFiles.length === 0) {
      return { success: false, error: 'No pickle file found' };
    }

    const pklPath = pklFiles[0];
    console.log(`[PROCESS-DIRECTORY] ✓ Found pickle file: ${pklPath}`);

    const videoFiles = glob.sync(`${unprocessedPath}/**/*.mp4`).filter((f) => !f.includes('PHALP') && !f.includes('output') && !f.includes('overlay'));
    if (videoFiles.length === 0) {
      return { success: false, error: 'No original video found' };
    }

    const videoPath = videoFiles[0];
    console.log(`[PROCESS-DIRECTORY] ✓ Found video file: ${videoPath}`);

    const overlayVideoFiles = glob.sync(`${unprocessedPath}/**/*.mp4`).filter((f) => f.includes('overlay') || f.includes('PHALP'));
    const overlayVideoPath = overlayVideoFiles.length > 0 ? overlayVideoFiles[0] : null;

    console.log(`[PROCESS-DIRECTORY] All .mp4 files found:`, glob.sync(`${unprocessedPath}/**/*.mp4`));
    console.log(`[PROCESS-DIRECTORY] Overlay video files:`, overlayVideoFiles);
    if (overlayVideoPath) {
      console.log(`[PROCESS-DIRECTORY] ✓ Found overlay video: ${overlayVideoPath}`);
    } else {
      console.log(`[PROCESS-DIRECTORY] ⚠ No overlay video found`);
    }

    let metadata;
    try {
      metadata = await extractVideoMetadata(videoPath);
      console.log(`[PROCESS-DIRECTORY] ✓ Extracted metadata:`, metadata);
    } catch (err: any) {
      return { success: false, error: `Failed to extract metadata: ${err.message}` };
    }

    const parseResult = await parsePickleToFrames(pklPath);
    if (!parseResult.success || !parseResult.frames || parseResult.frames.length === 0) {
      return { success: false, error: 'Failed to parse pickle file' };
    }

    console.log(`[PROCESS-DIRECTORY] ✓ Parsed ${parseResult.frameCount} frames`);

    await connectToMongoDB();
    const videoId = generateVideoId();

    try {
      await storeFrames(videoId, parseResult.frames);
      console.log(`[PROCESS-DIRECTORY] ✓ Stored ${parseResult.frameCount} frames`);
    } catch (err: any) {
      return { success: false, error: `Failed to store frames: ${err.message}` };
    }

    try {
      const videoMetadata = {
        videoId,
        filename: path.basename(videoPath),
        fps: metadata.fps || 30,
        duration: metadata.duration || (parseResult.frameCount || 0) / 30,
        resolution: metadata.resolution || [1920, 1080] as [number, number],
        frameCount: parseResult.frameCount || 0,
        createdAt: new Date(),
        originalVideoPath: path.join(VIDEOS_DIR, videoId, 'original.mp4'),
        overlayVideoPath: overlayVideoPath ? path.join(VIDEOS_DIR, videoId, 'overlay.mp4') : null,
      };
      await saveVideoMetadata(videoMetadata);
      console.log(`[PROCESS-DIRECTORY] ✓ Saved video metadata with paths`);
    } catch (err: any) {
      console.warn(`[PROCESS-DIRECTORY] ⚠ Failed to save metadata: ${err.message}`);
    }

    try {
      await connectVideoFramesMongo();
      const fps = metadata.fps || 30;

      if (overlayVideoPath && fs.existsSync(overlayVideoPath)) {
        const { original, overlay } = await extractBothVideoFrames(videoPath, overlayVideoPath, fps);
        await storeVideoFrames(videoId, original);
        await storeVideoFrames(videoId, overlay);
        console.log(`[PROCESS-DIRECTORY] ✓ Stored ${original.length} original + ${overlay.length} overlay frames`);
      } else {
        const { original } = await extractBothVideoFrames(videoPath, videoPath, fps);
        await storeVideoFrames(videoId, original);
        console.log(`[PROCESS-DIRECTORY] ✓ Stored ${original.length} original frames`);
      }
    } catch (err: any) {
      console.error(`[PROCESS-DIRECTORY] ✗ Failed to extract/store frames: ${err.message}`);
      return { success: false, error: `Failed to extract frames: ${err.message}` };
    }

    const videoDir = path.join(VIDEOS_DIR, videoId);
    try {
      fs.mkdirSync(videoDir, { recursive: true });
      fs.copyFileSync(videoPath, path.join(videoDir, 'original.mp4'));
      console.log(`[PROCESS-DIRECTORY] overlayVideoPath=${overlayVideoPath}, exists=${overlayVideoPath ? fs.existsSync(overlayVideoPath) : 'N/A'}`);
      if (overlayVideoPath && fs.existsSync(overlayVideoPath)) {
        const overlayOutputPath = path.join(videoDir, 'overlay.mp4');
        const { execSync } = await import('child_process');
        console.log(`[PROCESS-DIRECTORY] Converting overlay to H.264...`);
        execSync(`ffmpeg -i "${overlayVideoPath}" -c:v libx264 -preset fast -crf 23 -c:a aac "${overlayOutputPath}" -y`, { stdio: 'pipe' });
        console.log(`[PROCESS-DIRECTORY] ✓ Copied and converted overlay.mp4 to H.264`);
      } else {
        console.log(`[PROCESS-DIRECTORY] ⚠ Overlay video not found or path is null`);
      }
      console.log(`[PROCESS-DIRECTORY] ✓ Moved videos to ${videoDir}`);
    } catch (err: any) {
      console.error(`[PROCESS-DIRECTORY] ✗ Failed to move videos: ${err.message}`);
      return { success: false, error: `Failed to move videos: ${err.message}` };
    }

    try {
      fs.rmSync(unprocessedPath, { recursive: true, force: true });
      console.log(`[PROCESS-DIRECTORY] ✓ Cleaned up ${unprocessedPath}`);
    } catch (err: any) {
      console.warn(`[PROCESS-DIRECTORY] ⚠ Failed to clean up: ${err.message}`);
    }

    return { success: true, videoId };
  } catch (err: any) {
    console.error(`[PROCESS-DIRECTORY] ✗ Error processing video: ${err.message}`);
    return { success: false, error: err.message };
  }
}

router.post('/process-directory', async (req: Request, res: Response) => {
  console.log(`[PROCESS-DIRECTORY] 🚀 POST /api/video/process-directory`);

  try {
    if (!fs.existsSync(UNPROCESSED_DIR)) {
      console.log(`[PROCESS-DIRECTORY] ℹ️  No unprocessed videos directory found`);
      return res.status(400).json({
        success: false,
        error: 'No unprocessed videos found',
      });
    }

    const unprocessedVideos = fs.readdirSync(UNPROCESSED_DIR).filter((f) => f.startsWith('temp_'));

    if (unprocessedVideos.length === 0) {
      console.log(`[PROCESS-DIRECTORY] ℹ️  No unprocessed videos found`);
      return res.status(400).json({
        success: false,
        error: 'No unprocessed videos found',
      });
    }

    console.log(`[PROCESS-DIRECTORY] 📦 Found ${unprocessedVideos.length} unprocessed video(s)`);

    const results = [];

    for (const videoDir of unprocessedVideos) {
      const unprocessedPath = path.join(UNPROCESSED_DIR, videoDir);
      console.log(`[PROCESS-DIRECTORY] Processing: ${videoDir}`);

      const result = await processUnprocessedVideo(unprocessedPath);
      results.push({
        tempId: videoDir,
        ...result,
      });

      if (!result.success) {
        console.error(`[PROCESS-DIRECTORY] ✗ Failed to process ${videoDir}: ${result.error}`);
      } else {
        console.log(`[PROCESS-DIRECTORY] ✓ Successfully processed ${videoDir} → ${result.videoId}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[PROCESS-DIRECTORY] ✓ Processing complete: ${successCount} succeeded, ${failCount} failed`);

    res.json({
      success: successCount > 0,
      processedCount: successCount,
      failedCount: failCount,
      results,
      message: `Processed ${successCount} video(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
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
