import { Router, Request, Response } from 'express';
import { VideoStorageService } from '../services/videoStorageService';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/api/video/:videoId/:type', async (req: Request, res: Response) => {
  try {
    const { videoId, type } = req.params;

    if (type !== 'original' && type !== 'overlay') {
      return res.status(400).json({ error: 'Invalid video type' });
    }

    const videoPath = VideoStorageService.getVideoPath(videoId, type);
    const exists = await VideoStorageService.videoExists(videoId, type);

    if (!exists) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested Range Not Satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    console.error('Error streaming video:', err);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

export default router;
