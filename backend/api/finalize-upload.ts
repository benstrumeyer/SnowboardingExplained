/**
 * Finalize Chunked Video Upload
 * POST /api/finalize-upload
 * Combines chunks and triggers video analysis
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { processVideoUpload } from '../src/services/videoAnalysisPipelineImpl';
import { connectDB } from '../mcp-server/src/db/connection';

const chunksDir = path.join(os.tmpdir(), 'video-chunks');
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, filename, role } = req.body;

    if (!sessionId || !filename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find all chunks for this session
    const files = fs.readdirSync(chunksDir);
    const sessionChunks = files
      .filter((f) => f.startsWith(sessionId))
      .sort((a, b) => {
        const indexA = parseInt(a.split('-chunk-')[1]);
        const indexB = parseInt(b.split('-chunk-')[1]);
        return indexA - indexB;
      });

    if (sessionChunks.length === 0) {
      return res.status(400).json({ error: 'No chunks found for session' });
    }

    // Combine chunks into final video file
    const videoId = uuidv4();
    const ext = path.extname(filename);
    const finalPath = path.join(uploadsDir, `${videoId}${ext}`);

    const writeStream = fs.createWriteStream(finalPath);

    for (const chunk of sessionChunks) {
      const chunkPath = path.join(chunksDir, chunk);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
      // Clean up chunk file
      fs.unlinkSync(chunkPath);
    }

    writeStream.end();

    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Trigger video analysis
    try {
      const db = await connectDB();
      await processVideoUpload(db, {
        videoPath: finalPath,
        intendedTrick: undefined,
        stance: undefined,
      });
    } catch (analysisError) {
      console.warn('Video analysis failed, but upload succeeded:', analysisError);
      // Don't fail the upload if analysis fails
    }

    res.status(200).json({
      success: true,
      videoId,
      role,
      path: finalPath,
    });
  } catch (error) {
    console.error('Finalize upload error:', error);
    res.status(500).json({ error: 'Failed to finalize upload' });
  }
}
