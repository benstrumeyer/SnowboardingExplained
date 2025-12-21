/**
 * Mesh Data API
 * GET /api/mesh-data/{videoId}
 * 
 * SIMPLE: Just looks up jobStore[videoId] directly
 * Returns mesh data if complete, 202 if processing, 404 if not found
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { jobStore } from './jobStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId } = req.query;

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  console.log(`[MESH-DATA] ========================================`);
  console.log(`[MESH-DATA] Request for videoId: "${videoId}"`);
  console.log(`[MESH-DATA] Current jobStore keys:`, Object.keys(jobStore));

  // Direct lookup - no parsing needed
  const job = jobStore[videoId];

  if (!job) {
    console.log(`[MESH-DATA] ✗ Not found in jobStore: "${videoId}"`);
    return res.status(404).json({ error: 'Mesh data not found', videoId });
  }

  console.log(`[MESH-DATA] ✓ Found job: status=${job.status}`);

  if (job.status === 'complete' && job.result) {
    console.log(`[MESH-DATA] ✓ Returning ${job.result.frames?.length || 0} frames`);
    return res.status(200).json(job.result);
  }

  if (job.status === 'error') {
    console.log(`[MESH-DATA] ✗ Job error: ${job.error}`);
    return res.status(500).json({ error: job.error || 'Job failed' });
  }

  if (job.status === 'processing') {
    console.log(`[MESH-DATA] Job still processing...`);
    return res.status(202).json({ status: 'processing', message: 'Still processing' });
  }

  return res.status(404).json({ error: 'Unknown job state' });
}
