/**
 * Job Status API
 * GET /api/job-status/{videoId}
 * 
 * TODO: Requires 'next' module which is not available in Express backend.
 * Commenting out for now to unblock Docker build.
 */

// COMMENTED OUT - Missing dependency: 'next' module
/*
import { NextApiRequest, NextApiResponse } from 'next';
import { jobStore } from './jobStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both /api/job-status/{videoId} and /api/job-status?videoId={videoId}
  let videoId = req.query.videoId || req.query.jobId;
  
  if (Array.isArray(videoId)) {
    videoId = videoId[0];
  }

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  console.log(`[JOB-STATUS] ========================================`);
  console.log(`[JOB-STATUS] Request for videoId: "${videoId}"`);
  console.log(`[JOB-STATUS] Current jobStore keys:`, Object.keys(jobStore));

  const job = jobStore[videoId];

  if (!job) {
    console.log(`[JOB-STATUS] ✗ Not found: "${videoId}"`);
    return res.status(404).json({ error: 'Job not found', videoId });
  }

  console.log(`[JOB-STATUS] ✓ Found: status=${job.status}, hasResult=${!!job.result}`);
  
  return res.status(200).json({
    videoId: job.videoId,
    status: job.status,
    error: job.error,
    frameCount: job.result?.frames?.length || 0,
  });
}
*/
