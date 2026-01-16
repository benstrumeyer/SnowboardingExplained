import { Router, Request, Response } from 'express';
import { VideoStorageService } from '../services/videoStorageService';
import { connectToDatabase, getDatabase } from '../db/connection';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/:videoId/:type', async (req: Request, res: Response) => {
  try {
    const { videoId, type } = req.params;
    console.log(`[VIDEO-STREAM] GET /:videoId/:type - videoId=${videoId}, type=${type}`);

    if (type !== 'original' && type !== 'overlay') {
      return res.status(400).json({ error: 'Invalid video type' });
    }

    await connectToDatabase();
    const db = getDatabase();

    const rawVideo = await db.collection('raw_videos').findOne({ videoId });
    if (rawVideo && rawVideo.data) {
      console.log(`[VIDEO-STREAM] ✓ Found raw video in MongoDB`);
      let buffer = rawVideo.data;

      if (buffer.buffer) {
        buffer = buffer.buffer;
      }

      const contentLength = Buffer.isBuffer(buffer) ? buffer.length : buffer.byteLength || buffer.length;
      res.setHeader('Content-Type', rawVideo.mimeType || 'video/mp4');
      res.setHeader('Content-Length', contentLength);
      return res.send(buffer);
    }

    const videoDoc = await db.collection('mesh_data').findOne({ videoId });

    if (videoDoc) {
      const urlField = type === 'original' ? 'originalVideoUrl' : 'overlayVideoUrl';
      let s3Url = videoDoc[urlField];

      if (s3Url) {
        const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN || 'https://d123456.cloudfront.net';
        const cloudFrontUrl = s3Url.replace(/https:\/\/[^.]+\.s3\./, `${cloudFrontDomain}/`);
        console.log(`[VIDEO-STREAM] ✓ Found S3 URL in MongoDB, redirecting to CloudFront: ${cloudFrontUrl}`);
        return res.redirect(cloudFrontUrl);
      }
    }

    const videoPath = VideoStorageService.getVideoPath(videoId, type);
    const exists = await VideoStorageService.videoExists(videoId, type);

    console.log(`[VIDEO-STREAM] videoPath=${videoPath}, exists=${exists}`);

    if (!exists) {
      console.log(`[VIDEO-STREAM] ✗ Video not found`);
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
