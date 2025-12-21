/**
 * Debug endpoint to see jobStore contents
 * GET /api/debug-jobstore
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { jobStore } from './jobStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[DEBUG-JOBSTORE] ========================================');
  console.log('[DEBUG-JOBSTORE] Current jobStore keys:', Object.keys(jobStore));
  console.log('[DEBUG-JOBSTORE] Full jobStore:', JSON.stringify(jobStore, null, 2));

  const summary = Object.entries(jobStore).map(([key, job]) => ({
    key,
    videoId: job.videoId,
    status: job.status,
    hasResult: !!job.result,
    frameCount: job.result?.frames?.length || 0,
  }));

  return res.status(200).json({
    keys: Object.keys(jobStore),
    count: Object.keys(jobStore).length,
    jobs: summary,
  });
}
