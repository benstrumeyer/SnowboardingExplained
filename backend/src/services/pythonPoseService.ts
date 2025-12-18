/**
 * Python Pose Service Client
 * Calls the local Python MediaPipe service for pose detection
 */

import axios from 'axios';
import logger from '../logger';

const POSE_SERVICE_URL = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
const POSE_SERVICE_TIMEOUT = parseInt(process.env.POSE_SERVICE_TIMEOUT || '10000');

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface PoseFrame {
  frameNumber: number;
  frameWidth: number;
  frameHeight: number;
  keypoints: Keypoint[];
  keypointCount: number;
  processingTimeMs: number;
  modelVersion: string;
  error?: string;
}

/**
 * Check if the pose service is healthy
 */
export async function checkPoseServiceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${POSE_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data?.status === 'healthy';
  } catch (error) {
    logger.warn('[POSE SERVICE] Health check failed', { error });
    return false;
  }
}

/**
 * Detect pose from a single frame
 */
export async function detectPose(
  imageBase64: string,
  frameNumber: number = 0,
  retries: number = 2
): Promise<PoseFrame> {
  const startTime = Date.now();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.info(`[POSE SERVICE] Detecting pose for frame ${frameNumber}`, {
        attempt: attempt + 1,
        maxAttempts: retries + 1
      });
      
      const response = await axios.post(
        `${POSE_SERVICE_URL}/pose`,
        {
          image_base64: imageBase64,
          frame_number: frameNumber
        },
        {
          timeout: POSE_SERVICE_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = response.data;
      
      // Map snake_case to camelCase
      const result: PoseFrame = {
        frameNumber: data.frame_number,
        frameWidth: data.frame_width,
        frameHeight: data.frame_height,
        keypoints: data.keypoints || [],
        keypointCount: data.keypoint_count || 0,
        processingTimeMs: data.processing_time_ms,
        modelVersion: data.model_version
      };
      
      logger.info(`[POSE SERVICE] Frame ${frameNumber} completed`, {
        keypointCount: result.keypointCount,
        processingTimeMs: result.processingTimeMs,
        totalTimeMs: Date.now() - startTime
      });
      
      return result;
      
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      
      if (error.code === 'ECONNREFUSED') {
        logger.error('[POSE SERVICE] Connection refused - is the Python service running?');
        if (isLastAttempt) {
          return {
            frameNumber,
            frameWidth: 0,
            frameHeight: 0,
            keypoints: [],
            keypointCount: 0,
            processingTimeMs: 0,
            modelVersion: 'unknown',
            error: 'Pose service not available. Start it with: cd backend/pose-service && python app.py'
          };
        }
      } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        logger.warn(`[POSE SERVICE] Timeout on attempt ${attempt + 1}`, { frameNumber });
        if (isLastAttempt) {
          return {
            frameNumber,
            frameWidth: 0,
            frameHeight: 0,
            keypoints: [],
            keypointCount: 0,
            processingTimeMs: 0,
            modelVersion: 'unknown',
            error: 'Pose detection timed out'
          };
        }
      } else {
        logger.error(`[POSE SERVICE] Error on attempt ${attempt + 1}`, {
          frameNumber,
          error: error.message
        });
        if (isLastAttempt) {
          return {
            frameNumber,
            frameWidth: 0,
            frameHeight: 0,
            keypoints: [],
            keypointCount: 0,
            processingTimeMs: 0,
            modelVersion: 'unknown',
            error: error.message || 'Unknown error'
          };
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Should never reach here
  return {
    frameNumber,
    frameWidth: 0,
    frameHeight: 0,
    keypoints: [],
    keypointCount: 0,
    processingTimeMs: 0,
    modelVersion: 'unknown',
    error: 'Max retries exceeded'
  };
}

/**
 * Detect pose from multiple frames in parallel
 */
export async function detectPoseParallel(
  frames: Array<{ imageBase64: string; frameNumber: number }>
): Promise<PoseFrame[]> {
  const startTime = Date.now();
  
  logger.info(`[POSE SERVICE] Processing ${frames.length} frames in parallel`);
  
  const promises = frames.map(frame => 
    detectPose(frame.imageBase64, frame.frameNumber)
  );
  
  const results = await Promise.all(promises);
  
  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;
  
  logger.info(`[POSE SERVICE] Batch complete`, {
    totalFrames: frames.length,
    successCount,
    errorCount,
    totalTimeMs: Date.now() - startTime
  });
  
  return results;
}

/**
 * Get a specific keypoint by name from a pose frame
 */
export function getKeypoint(frame: PoseFrame, name: string): Keypoint | undefined {
  return frame.keypoints.find(kp => kp.name === name);
}

/**
 * Get multiple keypoints by names
 */
export function getKeypoints(frame: PoseFrame, names: string[]): Keypoint[] {
  return names
    .map(name => getKeypoint(frame, name))
    .filter((kp): kp is Keypoint => kp !== undefined);
}

/**
 * Calculate average confidence of keypoints
 */
export function getAverageConfidence(frame: PoseFrame): number {
  if (frame.keypoints.length === 0) return 0;
  const sum = frame.keypoints.reduce((acc, kp) => acc + kp.confidence, 0);
  return sum / frame.keypoints.length;
}
