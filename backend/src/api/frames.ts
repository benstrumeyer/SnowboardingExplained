import { Router, Request, Response } from 'express';
import * as frameQueryService from '../services/frameQueryService';

const router = Router();

router.get('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    console.log(`[FRAMES_API] GET /api/frames/${videoId}`);

    await frameQueryService.connectToMongoDB();
    const frames = await frameQueryService.getAllFrames(videoId);

    console.log(`[FRAMES_API] ✓ Retrieved ${frames.length} frames`);

    res.json({
      success: true,
      videoId,
      frameCount: frames.length,
      frames,
    });
  } catch (err: any) {
    console.error(`[FRAMES_API] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
    });
  }
});

router.get('/:videoId/:frameNumber', async (req: Request, res: Response) => {
  try {
    const { videoId, frameNumber } = req.params;
    const frameNum = parseInt(frameNumber, 10);

    console.log(`[FRAMES_API] GET /api/frames/${videoId}/${frameNum}`);

    await frameQueryService.connectToMongoDB();
    const frame = await frameQueryService.getFrame(videoId, frameNum);

    if (!frame) {
      console.log(`[FRAMES_API] ⚠ Frame not found`);
      return res.status(404).json({
        error: 'Frame not found',
      });
    }

    console.log(`[FRAMES_API] ✓ Retrieved frame ${frameNum}`);

    res.json({
      success: true,
      videoId,
      frameNumber: frameNum,
      frame,
    });
  } catch (err: any) {
    console.error(`[FRAMES_API] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
    });
  }
});

router.get('/:videoId/range', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const start = parseInt(req.query.start as string, 10) || 0;
    const end = parseInt(req.query.end as string, 10) || 100;

    console.log(`[FRAMES_API] GET /api/frames/${videoId}/range?start=${start}&end=${end}`);

    await frameQueryService.connectToMongoDB();
    const frames = await frameQueryService.getFrameRange(videoId, start, end);

    console.log(`[FRAMES_API] ✓ Retrieved ${frames.length} frames in range`);

    res.json({
      success: true,
      videoId,
      start,
      end,
      frameCount: frames.length,
      frames,
    });
  } catch (err: any) {
    console.error(`[FRAMES_API] ✗ Error: ${err.message}`);
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
