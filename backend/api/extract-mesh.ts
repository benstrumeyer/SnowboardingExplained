/**
 * Extract Mesh Data from Video
 * POST /api/extract-mesh
 * Processes a video file and extracts 3D mesh data for each frame
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const POSE_SERVICE_URL = process.env.POSE_SERVICE_URL || 'http://localhost:5000';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoPath, maxFrames = 999999 } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath is required' });
    }

    if (!fs.existsSync(videoPath)) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    console.log(`[MESH] Extracting mesh from: ${videoPath}`);
    console.log(`[MESH] Max frames: ${maxFrames}`);

    // Create form data with video file
    const form = new FormData();
    form.append('video', fs.createReadStream(videoPath));
    form.append('max_frames', String(maxFrames));
    form.append('output_format', 'json');

    // Call pose service
    console.log(`[MESH] Calling pose service at ${POSE_SERVICE_URL}/process_video`);
    const response = await axios.post(`${POSE_SERVICE_URL}/process_video`, form, {
      headers: form.getHeaders(),
      timeout: 300000, // 5 minute timeout for video processing
    });

    console.log(`[MESH] Pose service response received`);

    // Extract mesh data from response
    const meshData = response.data;

    if (!meshData || !meshData.frames) {
      return res.status(500).json({
        error: 'Invalid response from pose service',
        details: meshData,
      });
    }

    console.log(`[MESH] Extracted ${meshData.frames.length} frames with mesh data`);

    // Return mesh data
    return res.status(200).json({
      success: true,
      frameCount: meshData.frames.length,
      meshData,
    });
  } catch (error) {
    console.error('[MESH] Error extracting mesh:', error);

    if (axios.isAxiosError(error)) {
      return res.status(500).json({
        error: 'Pose service error',
        details: error.response?.data || error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to extract mesh',
      details: String(error),
    });
  }
}
