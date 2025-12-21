/**
 * Stacked Position API Endpoint
 * Manage reference stacked positions and analyze rider stacked position
 */

import { Router, Request, Response } from 'express';
import { db } from '../src/db/connection';
import {
  storeReferenceStackedPosition,
  getReferenceStackedPosition,
  getDefaultStackedPosition,
  getStackedPositionsForStance,
  getStackedPositionForTrick,
  updateReferenceStackedPosition,
  setAsDefaultStackedPosition,
  deleteReferenceStackedPosition,
  listAllReferenceStackedPositions,
} from '../src/services/referenceStackedPositionService';
import {
  extractStackedPositionMetrics,
  compareStackedPositions,
  generateStackedPositionFeedback,
  calculateAverageStackedPosition,
} from '../src/utils/stackedPositionAnalyzer';
import { VideoAnalysis } from '../src/types/formAnalysis';

const router = Router();

/**
 * POST /api/stacked-position/reference
 * Store a new reference stacked position
 *
 * Body:
 * {
 *   name: string,
 *   description: string,
 *   stance: 'regular' | 'goofy',
 *   videoId: string,
 *   frameNumber: number,
 *   trick?: string,
 *   acceptableRanges?: {...}
 * }
 */
router.post('/stacked-position/reference', async (req: Request, res: Response) => {
  try {
    const { name, description, stance, videoId, frameNumber, trick, acceptableRanges } = req.body;

    if (!name || !description || !stance || !videoId || frameNumber === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, description, stance, videoId, frameNumber',
      });
    }

    // Fetch the video analysis
    const videoAnalysis = (await db
      .collection('videoAnalyses')
      .findOne({ videoId })) as VideoAnalysis | null;

    if (!videoAnalysis) {
      return res.status(404).json({
        error: `Video ${videoId} not found`,
      });
    }

    // Get the frame
    const frame = videoAnalysis.poseTimeline[frameNumber];
    if (!frame) {
      return res.status(404).json({
        error: `Frame ${frameNumber} not found in video`,
      });
    }

    // Store the reference
    const reference = await storeReferenceStackedPosition(
      name,
      description,
      stance,
      frame,
      trick,
      acceptableRanges
    );

    res.json({
      success: true,
      data: reference,
    });
  } catch (error) {
    console.error('Error storing reference stacked position:', error);
    res.status(500).json({
      error: 'Failed to store reference stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/stacked-position/reference/:id
 * Get a reference stacked position by ID
 */
router.get('/stacked-position/reference/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reference = await getReferenceStackedPosition(id);

    if (!reference) {
      return res.status(404).json({
        error: `Reference stacked position ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: reference,
    });
  } catch (error) {
    console.error('Error fetching reference stacked position:', error);
    res.status(500).json({
      error: 'Failed to fetch reference stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/stacked-position/default/:stance
 * Get default reference stacked position for a stance
 */
router.get('/stacked-position/default/:stance', async (req: Request, res: Response) => {
  try {
    const { stance } = req.params;

    if (!['regular', 'goofy'].includes(stance)) {
      return res.status(400).json({
        error: 'Invalid stance. Must be "regular" or "goofy"',
      });
    }

    const reference = await getDefaultStackedPosition(stance as 'regular' | 'goofy');

    if (!reference) {
      return res.status(404).json({
        error: `No default stacked position found for ${stance} stance`,
      });
    }

    res.json({
      success: true,
      data: reference,
    });
  } catch (error) {
    console.error('Error fetching default stacked position:', error);
    res.status(500).json({
      error: 'Failed to fetch default stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/stacked-position/list/:stance
 * List all reference stacked positions for a stance
 */
router.get('/stacked-position/list/:stance', async (req: Request, res: Response) => {
  try {
    const { stance } = req.params;

    if (!['regular', 'goofy'].includes(stance)) {
      return res.status(400).json({
        error: 'Invalid stance. Must be "regular" or "goofy"',
      });
    }

    const references = await getStackedPositionsForStance(stance as 'regular' | 'goofy');

    res.json({
      success: true,
      data: references,
    });
  } catch (error) {
    console.error('Error listing stacked positions:', error);
    res.status(500).json({
      error: 'Failed to list stacked positions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/stacked-position/analyze
 * Analyze rider stacked position against a reference
 *
 * Body:
 * {
 *   videoId: string,
 *   referenceId?: string,  // If not provided, uses default for stance
 *   phaseStartFrame?: number,
 *   phaseEndFrame?: number
 * }
 */
router.post('/stacked-position/analyze', async (req: Request, res: Response) => {
  try {
    const { videoId, referenceId, phaseStartFrame, phaseEndFrame } = req.body;

    if (!videoId) {
      return res.status(400).json({
        error: 'Missing required field: videoId',
      });
    }

    // Fetch rider video analysis
    const riderAnalysis = (await db
      .collection('videoAnalyses')
      .findOne({ videoId })) as VideoAnalysis | null;

    if (!riderAnalysis) {
      return res.status(404).json({
        error: `Video ${videoId} not found`,
      });
    }

    // Get reference stacked position
    let reference;
    if (referenceId) {
      reference = await getReferenceStackedPosition(referenceId);
    } else {
      reference = await getDefaultStackedPosition(riderAnalysis.stance);
    }

    if (!reference) {
      return res.status(404).json({
        error: 'No reference stacked position found',
      });
    }

    // Determine frames to analyze
    const startFrame = phaseStartFrame || 0;
    const endFrame = phaseEndFrame || riderAnalysis.poseTimeline.length - 1;
    const framesToAnalyze = riderAnalysis.poseTimeline.slice(startFrame, endFrame + 1);

    // Calculate average rider metrics
    const riderMetrics = calculateAverageStackedPosition(framesToAnalyze);

    // Compare to reference
    const deltas = compareStackedPositions(reference.metrics, riderMetrics, reference.acceptableRanges);

    // Generate feedback
    const feedback = generateStackedPositionFeedback(deltas);

    // Calculate overall score
    const deviationCount = deltas.filter((d) => d.isDeviation).length;
    const overallScore = Math.max(0, 100 - deviationCount * 20);

    res.json({
      success: true,
      data: {
        videoId,
        referenceId: reference._id,
        referenceName: reference.name,
        riderMetrics,
        referenceMetrics: reference.metrics,
        deltas,
        feedback,
        overallScore,
        isStacked: overallScore > 70,
      },
    });
  } catch (error) {
    console.error('Error analyzing stacked position:', error);
    res.status(500).json({
      error: 'Failed to analyze stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/stacked-position/reference/:id
 * Update a reference stacked position
 */
router.put('/stacked-position/reference/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await updateReferenceStackedPosition(id, updates);

    if (!updated) {
      return res.status(404).json({
        error: `Reference stacked position ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating reference stacked position:', error);
    res.status(500).json({
      error: 'Failed to update reference stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/stacked-position/reference/:id/set-default
 * Set a reference stacked position as default
 */
router.post('/stacked-position/reference/:id/set-default', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stance } = req.body;

    if (!stance || !['regular', 'goofy'].includes(stance)) {
      return res.status(400).json({
        error: 'Invalid stance. Must be "regular" or "goofy"',
      });
    }

    await setAsDefaultStackedPosition(id, stance);

    res.json({
      success: true,
      message: `Reference stacked position ${id} set as default for ${stance} stance`,
    });
  } catch (error) {
    console.error('Error setting default stacked position:', error);
    res.status(500).json({
      error: 'Failed to set default stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/stacked-position/reference/:id
 * Delete a reference stacked position
 */
router.delete('/stacked-position/reference/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteReferenceStackedPosition(id);

    if (!deleted) {
      return res.status(404).json({
        error: `Reference stacked position ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Reference stacked position ${id} deleted`,
    });
  } catch (error) {
    console.error('Error deleting reference stacked position:', error);
    res.status(500).json({
      error: 'Failed to delete reference stacked position',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
