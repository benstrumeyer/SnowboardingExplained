import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as frameQueryService from '../services/frameQueryService';
import { VideoStorageService } from '../services/videoStorageService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    console.log(`[VIDEOS_API] GET /api/videos`);

    await frameQueryService.connectToMongoDB();
    const videos = await frameQueryService.getAllVideos();

    console.log(`[VIDEOS_API] ✓ Retrieved ${videos.length} videos`);

    res.json({
      success: true,
      videoCount: videos.length,
      videos,
    });
  } catch (err: any) {
    console.error(`[VIDEOS_API] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
    });
  }
});

router.get('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    console.log(`[VIDEOS_API] GET /api/videos/${videoId}`);

    await frameQueryService.connectToMongoDB();
    const video = await frameQueryService.getVideoMetadata(videoId);

    if (!video) {
      console.log(`[VIDEOS_API] ⚠ Video not found`);
      return res.status(404).json({
        error: 'Video not found',
      });
    }

    console.log(`[VIDEOS_API] ✓ Retrieved video metadata`);

    res.json({
      success: true,
      video,
    });
  } catch (err: any) {
    console.error(`[VIDEOS_API] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
    });
  }
});

router.delete('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    console.log(`[VIDEOS_API] DELETE /api/videos/${videoId}`);

    await frameQueryService.connectToMongoDB();

    const video = await frameQueryService.getVideoMetadata(videoId);
    if (!video) {
      console.log(`[VIDEOS_API] ⚠ Video not found`);
      return res.status(404).json({
        error: 'Video not found',
      });
    }

    const dbResult = await frameQueryService.deleteVideo(videoId);
    console.log(`[VIDEOS_API] ✓ Deleted from MongoDB: ${dbResult.framesDeleted} frames, ${dbResult.videosDeleted} video records`);

    await VideoStorageService.deleteVideo(videoId);
    console.log(`[VIDEOS_API] ✓ Deleted video files from disk`);

    res.json({
      success: true,
      message: 'Video deleted successfully',
      data: {
        videoId,
        framesDeleted: dbResult.framesDeleted,
        videosDeleted: dbResult.videosDeleted,
      },
    });
  } catch (err: any) {
    console.error(`[VIDEOS_API] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
    });
  }
});

router.get('/:videoId/original/stream', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    console.log(`[VIDEO_STREAM] GET /api/videos/${videoId}/original/stream`);

    await frameQueryService.connectToMongoDB();
    const video = await frameQueryService.getVideoMetadata(videoId);

    if (!video || !video.originalVideoPath) {
      console.log(`[VIDEO_STREAM] ⚠ Original video not found`);
      return res.status(404).json({
        error: 'Original video not found',
      });
    }

    const videoPath = video.originalVideoPath;

    if (!fs.existsSync(videoPath)) {
      console.log(`[VIDEO_STREAM] ⚠ Video file not found at ${videoPath}`);
      return res.status(404).json({
        error: 'Video file not found',
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;

    console.log(`[VIDEO_STREAM] ✓ Streaming original video: ${fileSize} bytes`);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = fs.createReadStream(videoPath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error(`[VIDEO_STREAM] ✗ Stream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });
  } catch (err: any) {
    console.error(`[VIDEO_STREAM] ✗ Error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
});

router.get('/:videoId/overlay/stream', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    console.log(`[VIDEO_STREAM] GET /api/videos/${videoId}/overlay/stream`);

    await frameQueryService.connectToMongoDB();
    const video = await frameQueryService.getVideoMetadata(videoId);

    if (!video || !video.overlayVideoPath) {
      console.log(`[VIDEO_STREAM] ⚠ Overlay video not found`);
      return res.status(404).json({
        error: 'Overlay video not found',
      });
    }

    const videoPath = video.overlayVideoPath;

    if (!fs.existsSync(videoPath)) {
      console.log(`[VIDEO_STREAM] ⚠ Video file not found at ${videoPath}`);
      return res.status(404).json({
        error: 'Video file not found',
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;

    console.log(`[VIDEO_STREAM] ✓ Streaming overlay video: ${fileSize} bytes`);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = fs.createReadStream(videoPath);
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error(`[VIDEO_STREAM] ✗ Stream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });
  } catch (err: any) {
    console.error(`[VIDEO_STREAM] ✗ Error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
});

export default router;
