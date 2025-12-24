/**
 * Pose Detection API Endpoints
 * 
 * Provides HTTP endpoints for pose detection using the process pool manager.
 */

import { Router, Request, Response } from 'express';
import logger from '../logger';
import { ProcessPoolManager, PoolStatus } from '../services/processPoolManager';
import { PoseFrame, PoseResult } from '../services/poseServiceExecWrapper';

export function createPoseRouter(poolManager: ProcessPoolManager): Router {
  const router = Router();

  /**
   * POST /api/pose/detect
   * 
   * Detect pose from frames.
   * 
   * Request body:
   * {
   *   "frames": [
   *     {
   *       "frameNumber": 0,
   *       "imageBase64": "base64-encoded-image"
   *     },
   *     {
   *       "frameNumber": 1,
   *       "imagePath": "/path/to/image.jpg"
   *     }
   *   ]
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "frameNumber": 0,
   *       "keypoints": [...],
   *       "has3d": true,
   *       "processingTimeMs": 250
   *     }
   *   ],
   *   "timestamp": "2025-01-15T10:30:00Z"
   * }
   */
  router.post('/detect', async (req: Request, res: Response) => {
    try {
      const { frames } = req.body;

      // Validate input
      if (!frames || !Array.isArray(frames)) {
        logger.warn('Invalid pose detection request', {
          hasFrames: !!frames,
          isArray: Array.isArray(frames)
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid request: frames must be an array',
          timestamp: new Date().toISOString()
        });
      }

      if (frames.length === 0) {
        logger.warn('Empty frames array in pose detection request');
        return res.status(400).json({
          success: false,
          error: 'Invalid request: frames array cannot be empty',
          timestamp: new Date().toISOString()
        });
      }

      // Validate each frame
      for (const frame of frames) {
        if (!frame.frameNumber && frame.frameNumber !== 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request: each frame must have frameNumber',
            timestamp: new Date().toISOString()
          });
        }

        if (!frame.imageBase64 && !frame.imagePath) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request: each frame must have imageBase64 or imagePath',
            timestamp: new Date().toISOString()
          });
        }
      }

      logger.info('Processing pose detection request', {
        frameCount: frames.length
      });

      // Process frames
      const results = await poolManager.processRequest(frames as PoseFrame[]);

      logger.info('Pose detection completed', {
        frameCount: frames.length,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      });

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Pose detection error', {
        error: error.message
      });

      const statusCode = error.message?.includes('Queue full') ? 429 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to process pose detection',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/pose/health
   * 
   * Get pool health status.
   * 
   * Response:
   * {
   *   "status": "healthy",
   *   "pool": {
   *     "activeProcesses": 1,
   *     "queuedRequests": 5,
   *     "totalProcessed": 1234,
   *     "totalErrors": 2,
   *     "uptime": 86400000
   *   },
   *   "timestamp": "2025-01-15T10:30:00Z"
   * }
   */
  router.get('/health', (req: Request, res: Response) => {
    try {
      const status = poolManager.getStatus();

      res.json({
        status: 'healthy',
        pool: status,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Health check error', { error: error.message });
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/pose/metrics
   * 
   * Get performance metrics.
   * 
   * Response:
   * {
   *   "avgProcessingTimeMs": 250,
   *   "successRate": 0.998,
   *   "errorRate": 0.002,
   *   "uptime": 86400000,
   *   "totalRequests": 1236,
   *   "totalSuccesses": 1234,
   *   "totalErrors": 2,
   *   "timestamp": "2025-01-15T10:30:00Z"
   * }
   */
  router.get('/metrics', (req: Request, res: Response) => {
    try {
      const status = poolManager.getStatus();

      const totalRequests = status.totalProcessed + status.totalErrors;
      const successRate = totalRequests > 0 ? status.totalProcessed / totalRequests : 0;
      const errorRate = totalRequests > 0 ? status.totalErrors / totalRequests : 0;

      res.json({
        avgProcessingTimeMs: totalRequests > 0 ? status.uptime / totalRequests : 0,
        successRate,
        errorRate,
        uptime: status.uptime,
        totalRequests,
        totalSuccesses: status.totalProcessed,
        totalErrors: status.totalErrors,
        activeProcesses: status.activeProcesses,
        queuedRequests: status.queuedRequests,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Metrics error', { error: error.message });
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
