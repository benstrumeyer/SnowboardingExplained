/**
 * PoseServiceHttpWrapper
 * 
 * HTTP client wrapper for connecting to external pose service running on WSL.
 * Implements the same interface as PoseServiceExecWrapper but uses HTTP instead of spawning processes.
 * 
 * Architecture:
 * - Pose Service App runs on WSL (Python, already set up)
 * - This wrapper sends HTTP requests to the service
 * - ProcessPoolManager queues requests and limits concurrency
 * - Each HTTP request represents one "process" in the pool
 */

import { detectPoseHybrid } from './pythonPoseService';
import logger from '../logger';

export interface PoseFrame {
  frameNumber: number;
  imageBase64?: string;      // Base64-encoded image
  imagePath?: string;        // Path to image file
}

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface PoseResult {
  frameNumber: number;
  keypoints: Keypoint[];
  has3d: boolean;
  jointAngles3d?: Record<string, number>;
  mesh_vertices_data?: number[][];
  mesh_faces_data?: number[][];
  cameraTranslation?: number[];
  processingTimeMs: number;
  error?: string;
}

/**
 * HTTP wrapper for pose service.
 * 
 * Implements the same interface as PoseServiceExecWrapper but communicates with
 * the external pose service via HTTP instead of spawning local processes.
 * 
 * Each call to getPoseInfo() represents one "process" in the pool.
 */
export class PoseServiceHttpWrapper {
  private static readonly MIN_REQUEST_INTERVAL_MS: number = 50; // Backpressure between requests
  private static lastRequestTime: number = 0;

  /**
   * Add a small delay between requests to prevent overwhelming the service.
   * This mimics the spawn interval backpressure from the process wrapper.
   */
  private static async _enforceRequestInterval(): Promise<void> {
    const timeSinceLastRequest = Date.now() - PoseServiceHttpWrapper.lastRequestTime;
    if (timeSinceLastRequest < PoseServiceHttpWrapper.MIN_REQUEST_INTERVAL_MS) {
      const delayMs = PoseServiceHttpWrapper.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    PoseServiceHttpWrapper.lastRequestTime = Date.now();
  }

  /**
   * Send frames to external pose service via HTTP.
   * 
   * This method has the same signature as PoseServiceExecWrapper.getPoseInfo()
   * so it can be used interchangeably with the process wrapper.
   * 
   * @param frames Array of frames to process
   * @returns Promise resolving to array of pose results
   */
  async getPoseInfo(frames: PoseFrame[]): Promise<PoseResult[]> {
    const results: PoseResult[] = [];
    
    console.log(`[HTTP-WRAPPER] getPoseInfo called with ${frames.length} frames`);
    logger.info('HTTP wrapper getPoseInfo called', { frameCount: frames.length });

    for (const frame of frames) {
      try {
        // Enforce backpressure between requests (same as process spawn interval)
        await PoseServiceHttpWrapper._enforceRequestInterval();

        if (!frame.imageBase64) {
          console.warn(`[HTTP-WRAPPER] Frame ${frame.frameNumber} missing imageBase64`);
          logger.warn('Frame missing imageBase64', { frameNumber: frame.frameNumber });
          results.push({
            frameNumber: frame.frameNumber,
            keypoints: [],
            has3d: false,
            processingTimeMs: 0,
            error: 'Missing imageBase64'
          });
          continue;
        }

        console.log(`[HTTP-WRAPPER] Sending frame ${frame.frameNumber} to HTTP service (image size: ${frame.imageBase64.length} bytes)`);
        logger.debug('Sending frame to HTTP service', {
          frameNumber: frame.frameNumber,
          imageSize: frame.imageBase64.length
        });

        // Send to external service via HTTP
        const poseResult = await detectPoseHybrid(frame.imageBase64, frame.frameNumber);

        // Map response to PoseResult format
        const result: PoseResult = {
          frameNumber: poseResult.frameNumber,
          keypoints: poseResult.keypoints,
          has3d: poseResult.has3d,
          jointAngles3d: poseResult.jointAngles3d,
          mesh_vertices_data: poseResult.mesh_vertices_data || undefined,
          mesh_faces_data: poseResult.mesh_faces_data || undefined,
          cameraTranslation: poseResult.cameraTranslation || undefined,
          processingTimeMs: poseResult.processingTimeMs,
          error: poseResult.error
        };

        results.push(result);

        console.log(`[HTTP-WRAPPER] Frame ${frame.frameNumber} processed successfully (${result.processingTimeMs}ms, ${result.keypoints.length} keypoints)`);
        logger.debug('Frame processed via HTTP', {
          frameNumber: frame.frameNumber,
          success: !result.error,
          processingTimeMs: result.processingTimeMs,
          keypointCount: result.keypoints.length
        });

      } catch (error) {
        console.error(`[HTTP-WRAPPER] Error processing frame ${frame.frameNumber}:`, error);
        logger.error('Error processing frame via HTTP', {
          frameNumber: frame.frameNumber,
          error: error instanceof Error ? error.message : String(error)
        });

        results.push({
          frameNumber: frame.frameNumber,
          keypoints: [],
          has3d: false,
          processingTimeMs: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;

    console.log(`[HTTP-WRAPPER] Batch complete: ${successCount} successful, ${errorCount} errors`);
    logger.info('HTTP wrapper batch complete', {
      frameCount: frames.length,
      successCount,
      errorCount
    });

    return results;
  }

  /**
   * Cleanup (no-op for HTTP wrapper, but kept for interface compatibility).
   */
  async cleanup(): Promise<void> {
    // No cleanup needed for HTTP wrapper
  }
}
