import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { connectToDatabase, getDatabase } from '../db/connection';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

router.post('/upload-raw', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    const videoId = crypto.randomBytes(8).toString('hex');

    await connectToDatabase();
    const db = getDatabase();

    const videoDoc = {
      videoId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      uploadedAt: new Date(),
      hasProcessedMesh: false,
      role: 'raw',
    };

    await db.collection('raw_videos').insertOne(videoDoc);

    res.json({
      success: true,
      videoId,
      message: 'Video uploaded successfully',
    });
  } catch (err: any) {
    console.error('[UPLOAD-RAW] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Upload failed',
    });
  }
});

export default router;
