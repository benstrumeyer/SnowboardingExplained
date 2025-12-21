/**
 * Video Upload with Pose Extraction API
 * POST /api/upload-video-with-pose
 * 
 * SIMPLE ID SCHEME:
 * - videoId = "v_{timestamp}_{counter}" (e.g., "v_1234567890_1")
 * - jobStore keyed by videoId directly
 * - Frontend polls /api/mesh-data/{videoId} to get mesh data
 */

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { jobStore, MeshSequence, generateVideoId } from './jobStore';

export const config = {
  api: {
    bodyParser: false,
  },
};

const POSE_SERVICE_URL = process.env.POSE_SERVICE_URL || 'http://localhost:5000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ multiples: false });

  try {
    const [fields, files] = await form.parse(req);
    
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    const role = Array.isArray(fields.role) ? fields.role[0] : fields.role;

    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoPath = videoFile.filepath;
    const videoId = generateVideoId();

    console.log(`[UPLOAD] ========================================`);
    console.log(`[UPLOAD] Processing video: ${videoPath}`);
    console.log(`[UPLOAD] Video ID: ${videoId}`);
    console.log(`[UPLOAD] Role: ${role}`);

    // Store initial job status - keyed by videoId
    jobStore[videoId] = {
      status: 'processing',
      videoId,
      role,
      startedAt: Date.now(),
    };
    console.log(`[UPLOAD] Stored initial job in jobStore[${videoId}]`);
    console.log(`[UPLOAD] Current jobStore keys:`, Object.keys(jobStore));

    // Send video to pose service for processing
    console.log(`[UPLOAD] Sending to pose service: ${POSE_SERVICE_URL}/process_video_async`);
    
    const formData = new FormData();
    const videoBuffer = fs.readFileSync(videoPath);
    const blob = new Blob([videoBuffer], { type: 'video/quicktime' });
    formData.append('video', blob, path.basename(videoPath));
    formData.append('max_frames', '999999');

    const uploadResponse = await axios.post(
      `${POSE_SERVICE_URL}/process_video_async`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minute timeout
      }
    );

    console.log(`[UPLOAD] Pose service response status:`, uploadResponse.status);
    console.log(`[UPLOAD] Pose service response keys:`, Object.keys(uploadResponse.data));

    // Check if mesh data was returned directly
    if (uploadResponse.data.meshSequence && uploadResponse.data.frameCount) {
      console.log(`[UPLOAD] ✓ Mesh data returned directly!`);
      console.log(`[UPLOAD] Frame count: ${uploadResponse.data.frameCount}`);
      
      const meshData: MeshSequence = {
        frames: uploadResponse.data.meshSequence.map((frame: any) => ({
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          vertices: frame.mesh_vertices_data || [],
          faces: frame.mesh_faces_data || [],
        })),
      };

      // Store completed job - keyed by videoId
      jobStore[videoId] = {
        status: 'complete',
        videoId,
        role,
        result: meshData,
        completedAt: Date.now(),
      };
      
      console.log(`[UPLOAD] ✓ Stored complete job in jobStore[${videoId}]`);
      console.log(`[UPLOAD] ✓ Mesh has ${meshData.frames.length} frames`);
      console.log(`[UPLOAD] Current jobStore keys:`, Object.keys(jobStore));
      
      return res.status(200).json({
        success: true,
        videoId,
        role,
        frameCount: meshData.frames.length,
      });
    }

    // Async processing - start background job
    console.log(`[UPLOAD] Starting async processing...`);
    processVideoAsync(videoId, videoPath, role || 'rider');

    return res.status(202).json({
      videoId,
      status: 'processing',
      message: 'Video processing started. Poll /api/mesh-data/{videoId} for completion.',
    });

  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
}

async function processVideoAsync(videoId: string, videoPath: string, role: string) {
  try {
    console.log(`[ASYNC ${videoId}] Starting async video processing...`);
    
    const formData = new FormData();
    const videoBuffer = fs.readFileSync(videoPath);
    const blob = new Blob([videoBuffer], { type: 'video/quicktime' });
    formData.append('video', blob, path.basename(videoPath));
    formData.append('max_frames', '999999');

    const uploadResponse = await axios.post(
      `${POSE_SERVICE_URL}/process_video_async`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      }
    );

    console.log(`[ASYNC ${videoId}] Pose service response:`, Object.keys(uploadResponse.data));

    if (uploadResponse.data.meshSequence && uploadResponse.data.frameCount) {
      const meshData: MeshSequence = {
        frames: uploadResponse.data.meshSequence.map((frame: any) => ({
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          vertices: frame.mesh_vertices_data || [],
          faces: frame.mesh_faces_data || [],
        })),
      };

      jobStore[videoId] = {
        status: 'complete',
        videoId,
        role,
        result: meshData,
        completedAt: Date.now(),
      };
      
      console.log(`[ASYNC ${videoId}] ✓ Complete! Stored ${meshData.frames.length} frames`);
      return;
    }

    // Poll pose service job
    const poseJobId = uploadResponse.data.job_id;
    if (!poseJobId) {
      throw new Error('No job_id returned from pose service');
    }

    console.log(`[ASYNC ${videoId}] Polling pose service job ${poseJobId}...`);
    
    for (let i = 0; i < 600; i++) {
      await new Promise(r => setTimeout(r, 1000));
      
      try {
        const statusResponse = await axios.get(
          `${POSE_SERVICE_URL}/job_status/${poseJobId}`,
          { timeout: 10000 }
        );

        if (statusResponse.data.status === 'complete') {
          const meshData = statusResponse.data.result;
          jobStore[videoId] = {
            status: 'complete',
            videoId,
            role,
            result: meshData,
            completedAt: Date.now(),
          };
          console.log(`[ASYNC ${videoId}] ✓ Complete via polling!`);
          return;
        } else if (statusResponse.data.status === 'error') {
          throw new Error(statusResponse.data.error);
        }
      } catch (err) {
        // Continue polling
      }
    }

    throw new Error('Timeout waiting for pose service');

  } catch (error) {
    console.error(`[ASYNC ${videoId}] Error:`, error);
    jobStore[videoId] = {
      status: 'error',
      videoId,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Date.now(),
    };
  }
}
