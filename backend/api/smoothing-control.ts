/**
 * Smoothing Control API Routes
 * Endpoints to control Kalman filter smoothing for pose data
 */

import express, { Request, Response } from 'express';
import logger from '../src/logger';
import { meshDataService } from '../src/services/meshDataService';

const router = express.Router();

/**
 * GET /api/smoothing/status
 * Get current smoothing status
 */
router.get('/smoothing/status', (req: Request, res: Response) => {
  try {
    const enabled = meshDataService.isSmoothingEnabled();
    res.json({
      success: true,
      smoothingEnabled: enabled,
      message: `Kalman smoothing is ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    logger.error('Error getting smoothing status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/smoothing/enable
 * Enable Kalman smoothing
 */
router.post('/smoothing/enable', (req: Request, res: Response) => {
  try {
    meshDataService.setSmoothingEnabled(true);
    res.json({
      success: true,
      message: 'Kalman smoothing enabled'
    });
  } catch (error) {
    logger.error('Error enabling smoothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/smoothing/disable
 * Disable Kalman smoothing
 */
router.post('/smoothing/disable', (req: Request, res: Response) => {
  try {
    meshDataService.setSmoothingEnabled(false);
    res.json({
      success: true,
      message: 'Kalman smoothing disabled'
    });
  } catch (error) {
    logger.error('Error disabling smoothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/smoothing/reset
 * Reset all Kalman filters (call when loading a new video)
 */
router.post('/smoothing/reset', (req: Request, res: Response) => {
  try {
    meshDataService.resetSmoothing();
    res.json({
      success: true,
      message: 'Kalman filters reset'
    });
  } catch (error) {
    logger.error('Error resetting smoothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/smoothing/parameters
 * Adjust Kalman filter parameters
 * Body: { processNoise: number, measurementNoise: number }
 */
router.post('/smoothing/parameters', (req: Request, res: Response) => {
  try {
    const { processNoise = 0.01, measurementNoise = 4.0 } = req.body;

    if (typeof processNoise !== 'number' || typeof measurementNoise !== 'number') {
      return res.status(400).json({
        error: 'Invalid parameters. Expected processNoise and measurementNoise as numbers.'
      });
    }

    if (processNoise < 0 || measurementNoise < 0) {
      return res.status(400).json({
        error: 'Parameters must be non-negative'
      });
    }

    meshDataService.setSmoothingParameters(processNoise, measurementNoise);

    res.json({
      success: true,
      message: 'Kalman parameters updated',
      parameters: {
        processNoise,
        measurementNoise
      }
    });
  } catch (error) {
    logger.error('Error updating smoothing parameters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
