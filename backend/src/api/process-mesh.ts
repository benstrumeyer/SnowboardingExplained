import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import glob from 'glob';
import { connectToDatabase, getDatabase } from '../db/connection';
import { uploadToS3 } from '../services/s3Service';

const router = Router();
const UNPROCESSED_DIR = path.join(process.cwd(), 'data', 'unprocessedvideos');

async function processUnprocessedVideoToMongoDB(unprocessedPath: string): Promise<{ success: boolean; videoId?: string; error?: string }> {
  try {
    console.log(`[PROCESS-MESH] Processing: ${unprocessedPath}`);

    const pklFiles = glob.sync(`${unprocessedPath}/**/*.pkl`);
    if (pklFiles.length === 0) {
      return { success: false, error: 'No pickle file found' };
    }

    const pklPath = pklFiles[0];
    console.log(`[PROCESS-MESH] ✓ Found pickle file: ${pklPath}`);

    const videoFiles = glob.sync(`${unprocessedPath}/**/*.mp4`).filter((f) => !f.includes('PHALP') && !f.includes('output') && !f.includes('overlay'));
    if (videoFiles.length === 0) {
      return { success: false, error: 'No video file found' };
    }

    const videoPath = videoFiles[0];
    console.log(`[PROCESS-MESH] ✓ Found video file: ${videoPath}`);

    const overlayVideoFiles = glob.sync(`${unprocessedPath}/**/*.mp4`).filter((f) => f.includes('overlay') || f.includes('PHALP'));
    const overlayVideoPath = overlayVideoFiles.length > 0 ? overlayVideoFiles[0] : null;

    await connectToDatabase();
    const db = getDatabase();

    const videoId = `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const videoMetadata = {
      videoId,
      uploadedAt: new Date(),
      hasProcessedMesh: true,
      role: 'mesh',
    };

    try {
      await db.collection('mesh_data').insertOne(videoMetadata);
      console.log(`[PROCESS-MESH] ✓ Saved video metadata`);
    } catch (err: any) {
      console.warn(`[PROCESS-MESH] ⚠ Failed to save metadata: ${err.message}`);
    }

    let originalS3Url = '';
    let overlayS3Url = '';

    try {
      const originalKey = `videos/${videoId}/original.mp4`;
      originalS3Url = await uploadToS3(videoPath, originalKey);
      console.log(`[PROCESS-MESH] ✓ Uploaded original video to S3: ${originalS3Url}`);

      if (overlayVideoPath && fs.existsSync(overlayVideoPath)) {
        const overlayKey = `videos/${videoId}/overlay.mp4`;
        overlayS3Url = await uploadToS3(overlayVideoPath, overlayKey);
        console.log(`[PROCESS-MESH] ✓ Uploaded overlay video to S3: ${overlayS3Url}`);
      }

      await db.collection('mesh_data').updateOne(
        { videoId },
        {
          $set: {
            originalVideoUrl: originalS3Url,
            overlayVideoUrl: overlayS3Url,
          },
        }
      );
      console.log(`[PROCESS-MESH] ✓ Updated video URLs in MongoDB`);
    } catch (err: any) {
      console.error(`[PROCESS-MESH] ✗ Failed to upload to S3: ${err.message}`);
      return { success: false, error: `Failed to upload to S3: ${err.message}` };
    }

    try {
      fs.rmSync(unprocessedPath, { recursive: true, force: true });
      console.log(`[PROCESS-MESH] ✓ Cleaned up ${unprocessedPath}`);
    } catch (err: any) {
      console.warn(`[PROCESS-MESH] ⚠ Failed to clean up: ${err.message}`);
    }

    return { success: true, videoId };
  } catch (err: any) {
    console.error(`[PROCESS-MESH] ✗ Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

router.post('/process-mesh', async (req: Request, res: Response) => {
  console.log(`[PROCESS-MESH] 🚀 POST /api/video/process-mesh`);

  try {
    if (!fs.existsSync(UNPROCESSED_DIR)) {
      return res.status(400).json({
        success: false,
        error: 'No unprocessed videos directory found',
      });
    }

    const unprocessedVideos = fs.readdirSync(UNPROCESSED_DIR).filter((f) => {
      const fullPath = path.join(UNPROCESSED_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    });

    if (unprocessedVideos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No unprocessed videos found',
      });
    }

    console.log(`[PROCESS-MESH] 📦 Found ${unprocessedVideos.length} unprocessed video(s)`);

    const results = [];

    for (const videoDir of unprocessedVideos) {
      const unprocessedPath = path.join(UNPROCESSED_DIR, videoDir);
      console.log(`[PROCESS-MESH] Processing: ${videoDir}`);

      const result = await processUnprocessedVideoToMongoDB(unprocessedPath);
      results.push(result);

      if (!result.success) {
        console.error(`[PROCESS-MESH] ✗ Failed: ${result.error}`);
      } else {
        console.log(`[PROCESS-MESH] ✓ Successfully processed → ${result.videoId}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[PROCESS-MESH] ✓ Complete: ${successCount} succeeded, ${failCount} failed`);

    res.json({
      success: true,
      processedCount: successCount,
      failedCount: failCount,
      results,
    });
  } catch (err: any) {
    console.error(`[PROCESS-MESH] ✗ Unexpected error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
