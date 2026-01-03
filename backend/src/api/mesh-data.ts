import { Router, Request, Response } from 'express';
import { getMeshSequence } from '../services/meshDataAdapter';
import { getVideoMetadata, getAllVideos, connectToMongoDB } from '../services/frameQueryService';
import { getVideoFrame, connectToMongoDB as connectVideoFramesMongo } from '../services/videoFrameStorage';
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
 * Stream original uploaded video
 */
router.get('/:videoId/video/original', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    // console.log(`[MESH_DATA_ENDPOINT] 🚀 GET /api/mesh-data/${videoId}/video/original`);

    // Ensure MongoDB is connected
    await connectToMongoDB();

    // Get video metadata to find the file
    const metadata = await getVideoMetadata(videoId);

    if (!metadata) {
      // console.log(`[MESH_DATA_ENDPOINT] ✗ Video metadata not found for videoId=${videoId}`);
      return res.status(404).json({
        success: false,
        error: `Video not found: ${videoId}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    // Find the original video file
    const extensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    let videoPath: string | null = null;

    for (const ext of extensions) {
      const testPath = path.join(uploadDir, videoId + ext);
      if (fs.existsSync(testPath)) {
        videoPath = testPath;
        break;
      }
    }

    if (!videoPath) {
      // console.log(`[MESH_DATA_ENDPOINT] ✗ Original video file not found for videoId=${videoId}`);
      return res.status(404).json({
        success: false,
        error: `Video file not found: ${videoId}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    // Stream the video
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);

      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);
    } else {
      const stream = fs.createReadStream(videoPath);
      stream.pipe(res);
    }

    // console.log(`[MESH_DATA_ENDPOINT] ✓ Streaming original video: ${videoId} (${fileSize} bytes)`);
  } catch (err: any) {
    // console.error(`[MESH_DATA_ENDPOINT] ✗ Error streaming original video: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to stream video',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

/**
 * GET /api/mesh-data/:videoId/frame/:frameNumber/:videoType
 * Retrieve a specific video frame (original or overlay)
 */
router.get('/:videoId/frame/:frameNumber/:videoType', async (req: Request, res: Response) => {
  try {
    const { videoId, frameNumber, videoType } = req.params;
    const frameNum = parseInt(frameNumber, 10);
    const isMeshOverlay = videoType === 'overlay';

    await connectVideoFramesMongo();

    const imageBuffer = await getVideoFrame(videoId, frameNum, isMeshOverlay);

    if (!imageBuffer) {
      return res.status(404).json({
        success: false,
        error: `Frame not found: videoId=${videoId}, frameNumber=${frameNum}, videoType=${videoType}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse<null>);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(imageBuffer);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve frame',
      timestamp: new Date().toISOString(),
    } as ApiResponse<null>);
  }
});

export default router;
