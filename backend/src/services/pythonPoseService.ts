/**
 * Python Pose Service Client
 * Calls the local Python MediaPipe service for pose detection
 */

import axios from 'axios';
import logger from '../logger';

const POSE_SERVICE_URL = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
const POSE_SERVICE_TIMEOUT = parseInt(process.env.POSE_SERVICE_TIMEOUT || '10000');

// Log on module load
console.log(`[POSE_SERVICE_CLIENT] Initialized with URL: ${POSE_SERVICE_URL}`);
console.log(`[POSE_SERVICE_CLIENT] Timeout: ${POSE_SERVICE_TIMEOUT}ms`);

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
 * Pose service status response
 */
export interface PoseServiceStatus {
  status: 'ready' | 'warming_up' | 'not_ready' | 'offline';
  models: {
    hmr2: 'loaded' | 'not_loaded';
    vitdet: 'loaded' | 'not_loaded';
  };
  ready: boolean;
}

/**
 * Check if the pose service is healthy (simple boolean)
 */
export async function checkPoseServiceHealth(): Promise<boolean> {
  try {
    logger.info(`[POSE SERVICE] Checking health at: ${POSE_SERVICE_URL}`);
    const response = await axios.get(`${POSE_SERVICE_URL}/health`, {
      timeout: 5000
    });
    const isHealthy = response.data?.status === 'ready' || response.data?.status === 'healthy';
    logger.info(`[POSE SERVICE] Health check response:`, { 
      status: response.data?.status,
      isHealthy,
      statusCode: response.status
    });
    return isHealthy;
  } catch (error: any) {
    logger.warn('[POSE SERVICE] Health check failed', { 
      url: POSE_SERVICE_URL,
      error: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });
    return false;
  }
}

/**
 * Get full pose service status including model loading state
 */
export async function getPoseServiceStatus(): Promise<PoseServiceStatus> {
  try {
    const response = await axios.get(`${POSE_SERVICE_URL}/health`, {
      timeout: 5000
    });
    
    const data = response.data;
    return {
      status: data.status || (data.ready ? 'ready' : 'not_ready'),
      models: data.models || {
        hmr2: 'not_loaded',
        vitdet: 'not_loaded'
      },
      ready: data.ready || false
    };
  } catch (error) {
    logger.warn('[POSE SERVICE] Status check failed', { error });
    return {
      status: 'offline',
      models: { hmr2: 'not_loaded', vitdet: 'not_loaded' },
      ready: false
    };
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

// 4D-Humans (HMR2) specific types
export interface HybridPoseFrame extends PoseFrame {
  has3d: boolean;
  joints3dRaw?: number[][] | null;
  jointAngles3d?: Record<string, number>;
  cameraTranslation?: number[] | null;
  meshVertices?: number;
  mesh_vertices_data?: number[][] | null;
  mesh_faces_data?: number[][] | null;
  trackingConfidence?: number;
  visualization?: string; // Base64 image with skeleton overlay from Python
}

/**
 * Detect pose using 4D-Humans (HMR2) hybrid endpoint
 * Returns 3D joint positions and angles that work even when back-facing
 * @param visualize - If true, Python service returns image with skeleton overlay
 */
export async function detectPoseHybrid(
  imageBase64: string,
  frameNumber: number = 0,
  visualize: boolean = false
): Promise<HybridPoseFrame> {
  const startTime = Date.now();
  
  try {
    console.log(`[4D-HUMANS] Starting request for frame ${frameNumber}`);
    console.log(`[4D-HUMANS] URL: ${POSE_SERVICE_URL}/pose/hybrid`);
    console.log(`[4D-HUMANS] Image base64 length: ${imageBase64.length}`);
    console.log(`[4D-HUMANS] Timeout: 120000ms`);
    
    logger.debug(`[4D-HUMANS] Detecting 3D pose for frame ${frameNumber}`);
    
    const response = await axios.post(
      `${POSE_SERVICE_URL}/pose/hybrid`,
      {
        image_base64: imageBase64,
        frame_number: frameNumber,
        visualize: visualize
      },
      {
        timeout: 120000, // 2 min timeout for 3D pose (first run downloads ~500MB model)
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[4D-HUMANS] Got response for frame ${frameNumber}: status ${response.status}`);
    
    const data = response.data;
    
    const result: HybridPoseFrame = {
      frameNumber: data.frame_number,
      frameWidth: data.frame_width,
      frameHeight: data.frame_height,
      keypoints: data.keypoints || [],
      keypointCount: data.keypoint_count || 0,
      processingTimeMs: data.processing_time_ms,
      modelVersion: data.model_version,
      has3d: data.has_3d || false,
      joints3dRaw: data.joints_3d_raw,
      jointAngles3d: data.joint_angles_3d,
      cameraTranslation: data.camera_translation,
      meshVertices: data.mesh_vertices,
      mesh_vertices_data: data.mesh_vertices_data,
      mesh_faces_data: data.mesh_faces_data,
      trackingConfidence: data.tracking_confidence,
      visualization: data.visualization // Python-generated skeleton overlay
    };
    
    logger.info(`[4D-HUMANS] Frame ${frameNumber} completed`, {
      keypointCount: result.keypointCount,
      has3d: result.has3d,
      hasVisualization: !!result.visualization,
      processingTimeMs: result.processingTimeMs,
      totalTimeMs: Date.now() - startTime
    });
    
    return result;
    
  } catch (error: any) {
    console.error(`[4D-HUMANS] Error for frame ${frameNumber}:`, {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      timeout: error.timeout,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    });
    
    logger.error(`[4D-HUMANS] Error`, { frameNumber, error: error.message });
    
    return {
      frameNumber,
      frameWidth: 0,
      frameHeight: 0,
      keypoints: [],
      keypointCount: 0,
      processingTimeMs: 0,
      modelVersion: 'unknown',
      has3d: false,
      error: error.code === 'ECONNREFUSED' 
        ? 'Pose service not available. Start it with: cd backend/pose-service && .\\venv\\Scripts\\python.exe app.py'
        : error.message || 'Unknown error'
    };
  }
}

/**
 * Detect 3D pose from multiple frames
 * @param visualize - If true, Python service returns images with skeleton overlay
 */
export async function detectPoseHybridBatch(
  frames: Array<{ imageBase64: string; frameNumber: number }>,
  visualize: boolean = false
): Promise<HybridPoseFrame[]> {
  const startTime = Date.now();
  
  logger.info(`[4D-HUMANS] Processing ${frames.length} frames`, { visualize });
  
  // Process sequentially to avoid GPU memory issues
  const results: HybridPoseFrame[] = [];
  for (const frame of frames) {
    const result = await detectPoseHybrid(frame.imageBase64, frame.frameNumber, visualize);
    results.push(result);
  }
  
  const successCount = results.filter(r => !r.error).length;
  const has3dCount = results.filter(r => r.has3d).length;
  const vizCount = results.filter(r => r.visualization).length;
  
  logger.info(`[4D-HUMANS] Batch complete`, {
    totalFrames: frames.length,
    successCount,
    has3dCount,
    visualizationsGenerated: vizCount,
    totalTimeMs: Date.now() - startTime
  });
  
  return results;
}
