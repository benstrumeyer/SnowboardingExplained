/**
 * Chunked Video Upload API
 * POST /api/upload-chunk
 * Handles individual chunk uploads for large video files
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Configure multer for chunk uploads
const chunksDir = path.join(os.tmpdir(), 'video-chunks');
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, chunksDir);
  },
  filename: (_req, file, cb) => {
    const sessionId = (_req as any).body.sessionId;
    const chunkIndex = (_req as any).body.chunkIndex;
    cb(null, `${sessionId}-chunk-${chunkIndex}`);
  },
});

const upload = multer({ storage });

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use multer middleware
    upload.single('chunk')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: 'Chunk upload failed' });
      }

      const { sessionId, chunkIndex, totalChunks } = req.body;

      if (!sessionId || chunkIndex === undefined || !totalChunks) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      res.status(200).json({
        success: true,
        chunkIndex: parseInt(chunkIndex),
        totalChunks: parseInt(totalChunks),
      });
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
