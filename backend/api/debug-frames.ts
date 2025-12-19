/**
 * Debug Frames API
 * Serves debug frames and metadata for visual debugging
 */

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const DEBUG_FRAMES_DIR = path.join(process.cwd(), '.debug-frames');

/**
 * GET /api/debug/frames - List all debug frames
 */
router.get('/frames', (req, res) => {
  try {
    if (!fs.existsSync(DEBUG_FRAMES_DIR)) {
      return res.json({ frames: [], count: 0 });
    }

    const frames = fs.readdirSync(DEBUG_FRAMES_DIR)
      .filter(f => f.startsWith('frame-'))
      .map(f => {
        const frameNum = parseInt(f.replace('frame-', ''));
        const framePath = path.join(DEBUG_FRAMES_DIR, f);
        const metadataPath = path.join(framePath, 'metadata.json');
        
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
          try {
            const content = fs.readFileSync(metadataPath, 'utf-8');
            metadata = JSON.parse(content);
          } catch (e) {
            // Ignore parse errors
          }
        }

        return {
          frameNumber: frameNum,
          metadata,
        };
      })
      .sort((a, b) => a.frameNumber - b.frameNumber);

    res.json({ frames, count: frames.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/debug/frame/:frameNumber - Get specific frame
 */
router.get('/frame/:frameNumber', (req, res) => {
  try {
    const frameNumber = parseInt(req.params.frameNumber);
    const frameDir = path.join(DEBUG_FRAMES_DIR, `frame-${frameNumber}`);
    const imagePath = path.join(frameDir, 'frame.png');
    const metadataPath = path.join(frameDir, 'metadata.json');

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      try {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(content);
      } catch (e) {
        // Ignore parse errors
      }
    }

    res.json({
      frameNumber,
      image: imageBase64,
      metadata,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/debug/frame/:frameNumber/image - Get frame image directly
 */
router.get('/frame/:frameNumber/image', (req, res) => {
  try {
    const frameNumber = parseInt(req.params.frameNumber);
    const frameDir = path.join(DEBUG_FRAMES_DIR, `frame-${frameNumber}`);
    const imagePath = path.join(frameDir, 'frame.png');

    if (!fs.existsSync(imagePath)) {
      return res.status(404).send('Frame not found');
    }

    res.setHeader('Content-Type', 'image/png');
    res.sendFile(imagePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/debug/frames - Clear all debug frames
 */
router.delete('/frames', (req, res) => {
  try {
    if (fs.existsSync(DEBUG_FRAMES_DIR)) {
      fs.rmSync(DEBUG_FRAMES_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DEBUG_FRAMES_DIR, { recursive: true });

    res.json({ success: true, message: 'All debug frames cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
