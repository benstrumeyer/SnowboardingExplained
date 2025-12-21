/**
 * Comparison API Endpoint
 * POST /api/comparison - Compare rider video to reference video
 */

import { Router, Request, Response } from 'express';
import { db } from '../src/db/connection';
import {
  compareVideos,
  formatComparisonForAPI,
} from '../src/services/comparisonService';
import { VideoAnalysis } from '../src/types/formAnalysis';

const router = Router();

/**
 * POST /api/comparison
 * Compare rider video to reference video
 *
 * Body:
 * {
 *   riderVideoId: string,
 *   referenceVideoId: string
 * }
 */
router.post('/comparison', async (req: Request, res: Response) => {
  try {
    const { riderVideoId, referenceVideoId } = req.body;

    if (!riderVideoId || !referenceVideoId) {
      return res.status(400).json({
        error: 'Missing riderVideoId or referenceVideoId',
      });
    }

    // Fetch rider analysis
    const riderAnalysis = await db
      .collection('videoAnalyses')
      .findOne({ videoId: riderVideoId }) as VideoAnalysis | null;

    if (!riderAnalysis) {
      return res.status(404).json({
        error: `Rider video ${riderVideoId} not found`,
      });
    }

    // Fetch reference analysis
    const referenceAnalysis = await db
      .collection('videoAnalyses')
      .findOne({ videoId: referenceVideoId }) as VideoAnalysis | null;

    if (!referenceAnalysis) {
      return res.status(404).json({
        error: `Reference video ${referenceVideoId} not found`,
      });
    }

    // Perform comparison
    const comparisonResult = await compareVideos(riderAnalysis, referenceAnalysis);

    // Format for API response
    const formattedResult = formatComparisonForAPI(comparisonResult);

    res.json(formattedResult);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      error: 'Failed to compare videos',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/comparison/:riderVideoId/:referenceVideoId
 * Compare rider video to reference video (GET variant)
 */
router.get('/comparison/:riderVideoId/:referenceVideoId', async (req: Request, res: Response) => {
  try {
    const { riderVideoId, referenceVideoId } = req.params;

    // Fetch rider analysis
    const riderAnalysis = await db
      .collection('videoAnalyses')
      .findOne({ videoId: riderVideoId }) as VideoAnalysis | null;

    if (!riderAnalysis) {
      return res.status(404).json({
        error: `Rider video ${riderVideoId} not found`,
      });
    }

    // Fetch reference analysis
    const referenceAnalysis = await db
      .collection('videoAnalyses')
      .findOne({ videoId: referenceVideoId }) as VideoAnalysis | null;

    if (!referenceAnalysis) {
      return res.status(404).json({
        error: `Reference video ${referenceVideoId} not found`,
      });
    }

    // Perform comparison
    const comparisonResult = await compareVideos(riderAnalysis, referenceAnalysis);

    // Format for API response
    const formattedResult = formatComparisonForAPI(comparisonResult);

    res.json(formattedResult);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      error: 'Failed to compare videos',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
