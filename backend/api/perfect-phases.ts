import { Router, Request, Response } from 'express';
import { perfectPhaseService } from '../src/services/perfectPhaseService';

const router = Router();

/**
 * POST /api/perfect-phases/save
 * Save a new perfect phase
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const {
      trickName,
      phaseName,
      stance,
      frames,
      dataQuality,
    } = req.body;

    // Validate required fields
    if (!trickName || !phaseName || !stance || !frames || frames.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: trickName, phaseName, stance, frames',
      });
    }

    // Save perfect phase
    const result = await perfectPhaseService.savePerfectPhase({
      trickName,
      phaseName,
      stance,
      frames,
      dataQuality,
    });

    res.json({
      id: result.id,
      success: true,
      message: 'Perfect phase saved successfully',
    });
  } catch (error) {
    console.error('Error saving perfect phase:', error);
    res.status(500).json({
      error: 'Failed to save perfect phase',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/perfect-phases
 * Get all perfect phases with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { trickName, phaseName, stance } = req.query;

    const filters: any = {};
    if (trickName) filters.trickName = trickName;
    if (phaseName) filters.phaseName = phaseName;
    if (stance) filters.stance = stance;

    const phases = await perfectPhaseService.getPerfectPhases(filters);

    res.json(phases);
  } catch (error) {
    console.error('Error fetching perfect phases:', error);
    res.status(500).json({
      error: 'Failed to fetch perfect phases',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/perfect-phases/:id
 * Get a specific perfect phase by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const phase = await perfectPhaseService.getPerfectPhaseById(id);

    if (!phase) {
      return res.status(404).json({
        error: 'Perfect phase not found',
      });
    }

    res.json(phase);
  } catch (error) {
    console.error('Error fetching perfect phase:', error);
    res.status(500).json({
      error: 'Failed to fetch perfect phase',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/perfect-phases/:id
 * Delete a perfect phase
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await perfectPhaseService.deletePerfectPhase(id);

    if (!result) {
      return res.status(404).json({
        error: 'Perfect phase not found',
      });
    }

    res.json({
      success: true,
      message: 'Perfect phase deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting perfect phase:', error);
    res.status(500).json({
      error: 'Failed to delete perfect phase',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/frames/:frameId/analysis
 * Get frame analysis data
 */
router.get('/frames/:frameId/analysis', async (req: Request, res: Response) => {
  try {
    const { frameId } = req.params;

    const analysis = await perfectPhaseService.getFrameAnalysis(frameId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Frame analysis not found',
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching frame analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch frame analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/frames/:frameId/phase-indicator
 * Get phase indicator data for a frame
 */
router.get(
  '/frames/:frameId/phase-indicator',
  async (req: Request, res: Response) => {
    try {
      const { frameId } = req.params;

      const indicator = await perfectPhaseService.getPhaseIndicator(frameId);

      if (!indicator) {
        return res.status(404).json({
          error: 'Phase indicator not found',
        });
      }

      res.json(indicator);
    } catch (error) {
      console.error('Error fetching phase indicator:', error);
      res.status(500).json({
        error: 'Failed to fetch phase indicator',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
