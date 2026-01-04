import { Router, Request, Response } from 'express';
import { getMeshSequence } from '../services/meshDataAdapter';
import { getVideoMetadata, getAllVideos, connectToMongoDB } from '../services/frameQueryService';
import { getFrameBuffer, connectToMongoDB as connectFrameStreamMongo } from '../services/frameStreamService';
import { ApiResponse, MeshSequence } from '../types';
import fs from 'fs';
import path from 'path';

const router = Router();

const uploadDir = fs.existsSync('/shared/videos')
  ? '/shared/videos'
  : path.join(__dirname, '../../uploads');

/**
 * GET /api/mesh-data/list
 * List all available videos
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    await connectToMongoDB();
    const videos = await getAllVideos();

    res.status(200).json({
      success: true,
      data: videos,
      timestamp: new Date().toISOString(),
    } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve video list',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/mesh-data/
 * List all available videos (root endpoint)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToMongoDB();
    const videos = await getAllVideos();

    res.status(200).json({
      success: true,
      data: videos,
      timestamp: new Date().toISOString(),
    } as ApiResponse<any>);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve video list',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/mesh-data/:videoId
 * Retrieve mesh data for a video with all frames
 */
router.get('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    // Ensure MongoDB is connected
    await connectToMongoDB();

    // Get mesh sequence (transforms MongoDB data to frontend format)
    // This now handles missing metadata gracefully
    const meshSequence = await getMeshSequence(videoId);

    res.status(200).json({
      success: true,
      data: meshSequence,
      timestamp: new Date().toISOString(),
    } as ApiResponse<MeshSequence>);
  } catch (err: any) {
    // Check if it's a "not found" error
    if (err.message.includes('not found') || err.message.includes('No frames')) {
      return res.status(404).json({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve mesh data',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/mesh-data/:videoId/video/original
 * Stream original video reconstructed from MongoDB frames
 */
router.get('/:videoId/video/original', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    await connectToMongoDB();
    await connectFrameStreamMongo();

    const metadata = await getVideoMetadata(videoId);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: `Video not found: ${videoId}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const frameCount = metadata.frameCount;
    const fps = metadata.fps;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    let frameIndex = 0;

    const sendNextFrame = async () => {
      if (frameIndex >= frameCount) {
        res.end();
        return;
      }

      try {
        const frameBuffer = await getFrameBuffer(videoId, frameIndex, false);

        if (!frameBuffer) {
          res.end();
          return;
        }

        if (frameIndex === 0) {
          res.write(frameBuffer);
        } else {
          res.write(frameBuffer);
        }

        frameIndex++;
        setImmediate(sendNextFrame);
      } catch (err) {
        res.end();
      }
    };

    sendNextFrame();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to stream video',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/mesh-data/:videoId/video/overlay
 * Stream overlay video reconstructed from MongoDB frames
 */
router.get('/:videoId/video/overlay', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    await connectToMongoDB();
    await connectFrameStreamMongo();

    const metadata = await getVideoMetadata(videoId);

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: `Video not found: ${videoId}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    const frameCount = metadata.frameCount;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    let frameIndex = 0;

    const sendNextFrame = async () => {
      if (frameIndex >= frameCount) {
        res.end();
        return;
      }

      try {
        const frameBuffer = await getFrameBuffer(videoId, frameIndex, true);

        if (!frameBuffer) {
          res.end();
          return;
        }

        if (frameIndex === 0) {
          res.write(frameBuffer);
        } else {
          res.write(frameBuffer);
        }

        frameIndex++;
        setImmediate(sendNextFrame);
      } catch (err) {
        res.end();
      }
    };

    sendNextFrame();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to stream overlay video',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * DELETE /api/mesh-data/:videoId
 * Delete a video and all associated data
 */
router.delete('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    console.log(`[MESH_DATA] 🗑️  DELETE /api/mesh-data/${videoId}`);

    await connectToMongoDB();

    const { MongoClient } = await import('mongodb');
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'snowboarding_explained';

    const client = new MongoClient(mongoUrl);
    await client.connect();
    const database = client.db(dbName);

    const framesCollection = database.collection('frames');
    const videosCollection = database.collection('videos');
    const videoFramesCollection = database.collection('video_frames');

    const deleteFramesResult = await framesCollection.deleteMany({ videoId });
    const deleteVideosResult = await videosCollection.deleteMany({ videoId });
    const deleteVideoFramesResult = await videoFramesCollection.deleteMany({ videoId });

    await client.close();

    console.log(`[MESH_DATA] ✓ Deleted ${deleteFramesResult.deletedCount} frames, ${deleteVideosResult.deletedCount} videos, ${deleteVideoFramesResult.deletedCount} video frames`);

    res.status(200).json({
      success: true,
      data: {
        framesDeleted: deleteFramesResult.deletedCount,
        videosDeleted: deleteVideosResult.deletedCount,
        videoFramesDeleted: deleteVideoFramesResult.deletedCount,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse<any>);
  } catch (err: any) {
    console.error(`[MESH_DATA] ✗ Error deleting video: ${err.message}`);
    res.status(500).json({
      success: false,
      error: `Failed to delete video: ${err.message}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/mesh-data/:videoId/frame/:frameNumber/:videoType
 * Retrieve a specific video frame (original or overlay) from MongoDB
 * Optimized for RAF-synced playback with low latency
 */
router.get('/:videoId/frame/:frameNumber/:videoType', async (req: Request, res: Response) => {
  try {
    const { videoId, frameNumber, videoType } = req.params;
    const frameNum = parseInt(frameNumber, 10);
    const isMeshOverlay = videoType === 'overlay';

    await connectFrameStreamMongo();

    const imageBuffer = await getFrameBuffer(videoId, frameNum, isMeshOverlay);

    if (!imageBuffer) {
      return res.status(404).json({
        success: false,
        error: `Frame not found: videoId=${videoId}, frameNumber=${frameNum}, videoType=${videoType}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('ETag', `"${videoId}-${frameNum}-${isMeshOverlay}"`);

    res.send(imageBuffer);
  } catch (err: any) {
    console.error(`[MESH_DATA] ✗ Error retrieving frame: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve frame',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

export default router;
