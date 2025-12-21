/**
 * Video Analysis Pipeline Implementation
 * Task 6: Complete video upload and processing pipeline
 * Orchestrates pose extraction, phase detection, and storage
 */

import { Db } from 'mongodb';
import { PoseFrame, VideoAnalysis } from '../types/formAnalysis';
import { detectPhases } from '../utils/phaseDetector';
import { v4 as uuidv4 } from 'uuid';

// Lazy load to avoid circular dependencies
let getVideoAnalysisCollection: any = null;

async function getCollection(db: Db) {
  if (!getVideoAnalysisCollection) {
    const schemas = await import('../../mcp-server/src/db/formAnalysisSchemas');
    getVideoAnalysisCollection = schemas.getVideoAnalysisCollection;
  }
  return getVideoAnalysisCollection(db);
}

export interface UploadVideoRequest {
  videoPath: string;
  intendedTrick?: string;
  stance?: 'regular' | 'goofy';
}

export interface UploadVideoResponse {
  videoId: string;
  status: 'processing' | 'complete' | 'failed';
  estimatedProcessingTime?: number;
  error?: string;
}

/**
 * Main video upload and analysis pipeline
 */
export async function processVideoUpload(
  db: Db,
  request: UploadVideoRequest
): Promise<UploadVideoResponse> {
  const videoId = uuidv4();

  try {
    console.log(`[${videoId}] Starting video processing pipeline...`);

    // Step 1: Extract pose data from video
    console.log(`[${videoId}] Step 1: Extracting pose data...`);
    const poseTimeline = await extractPoseDataFromVideo(request.videoPath);

    if (!poseTimeline || poseTimeline.length === 0) {
      throw new Error('Failed to extract pose data from video');
    }

    console.log(`[${videoId}] Extracted ${poseTimeline.length} frames of pose data`);

    // Step 2: Detect trick phases
    console.log(`[${videoId}] Step 2: Detecting trick phases...`);
    const phases = detectPhases(poseTimeline);

    console.log(`[${videoId}] Detected phases:`, {
      trickType: phases.trickType,
      coverage: phases.coverage.toFixed(1) + '%',
    });

    // Step 3: Auto-detect stance if not provided
    let stance = request.stance || 'regular';
    if (!request.stance) {
      stance = autoDetectStance(poseTimeline);
      console.log(`[${videoId}] Auto-detected stance: ${stance}`);
    }

    // Step 4: Create VideoAnalysis document
    console.log(`[${videoId}] Step 3: Creating analysis document...`);
    const videoAnalysis: VideoAnalysis = {
      videoId,
      uploadedAt: new Date(),
      duration: poseTimeline[poseTimeline.length - 1].timestamp,
      frameCount: poseTimeline.length,
      fps: calculateFPS(poseTimeline),
      intendedTrick: request.intendedTrick || null,
      stance: stance as 'regular' | 'goofy',
      analysisStatus: 'in_progress',
      poseTimeline,
      phases,
      measurements: {}, // Will be populated in post-MVP
      evaluations: {}, // Will be populated in post-MVP
      comparison: null, // Will be populated in post-MVP
      summary: {
        trickIdentified: request.intendedTrick || 'unknown',
        confidence: 0,
        phasesDetected: Object.keys(phases.phases)
          .filter((p) => phases.phases[p as keyof typeof phases.phases] !== null)
          .map((p) => p as any),
        keyIssues: [],
        keyPositives: [],
        recommendedFocusAreas: [],
        overallAssessment: 'Analysis in progress',
        progressionAdvice: '',
      },
    };

    // Step 5: Store in MongoDB
    console.log(`[${videoId}] Step 4: Storing analysis in database...`);
    const collection = await getCollection(db);
    await collection.insertOne(videoAnalysis as any);

    console.log(`[${videoId}] ✓ Video processing complete`);

    return {
      videoId,
      status: 'complete',
    };
  } catch (error) {
    console.error(`[${videoId}] Error processing video:`, error);

    // Store error in database
    try {
      const collection = await getCollection(db);
      await collection.insertOne({
        videoId,
        uploadedAt: new Date(),
        analysisStatus: 'failed',
        processingErrors: [
          {
            stage: 'pipeline',
            error: String(error),
            timestamp: new Date(),
          },
        ],
      } as any);
    } catch (dbError) {
      console.error(`[${videoId}] Failed to store error in database:`, dbError);
    }

    return {
      videoId,
      status: 'failed',
      error: String(error),
    };
  }
}

/**
 * Extract pose data from video file
 * Calls the pose service (WSL) to extract 3D joint positions
 */
async function extractPoseDataFromVideo(videoPath: string): Promise<PoseFrame[]> {
  // This would call the pose service endpoint
  // For MVP, we'll create a placeholder that returns mock data
  // In production, this calls: POST http://localhost:5000/extract-poses

  console.log(`Extracting poses from: ${videoPath}`);

  // Mock implementation for MVP testing
  const mockPoseTimeline: PoseFrame[] = [];

  // Generate 300 frames of mock pose data (10 seconds at 30fps)
  for (let i = 0; i < 300; i++) {
    mockPoseTimeline.push({
      frameNumber: i,
      timestamp: i / 30, // 30 fps
      joints3D: generateMockJoints(i),
      jointAngles: generateMockJointAngles(i),
      confidence: 0.85 + Math.random() * 0.15,
    });
  }

  return mockPoseTimeline;
}

/**
 * Generate mock 3D joint positions for testing
 */
function generateMockJoints(frameNumber: number): any[] {
  const joints = [
    'nose',
    'left_eye',
    'right_eye',
    'left_ear',
    'right_ear',
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
  ];

  const phase = frameNumber / 300; // 0 to 1

  return joints.map((name) => {
    // Simulate motion through phases
    let x = Math.sin(phase * Math.PI * 2) * 0.3;
    let y = Math.cos(phase * Math.PI * 2) * 0.2 + 1.5;
    let z = 0.5 + Math.sin(phase * Math.PI) * 0.2;

    // Add some variation based on joint type
    if (name.includes('hip') || name.includes('knee') || name.includes('ankle')) {
      y -= 0.5; // Lower body
    }

    return {
      name,
      position: { x, y, z },
      confidence: 0.85 + Math.random() * 0.15,
    };
  });
}

/**
 * Generate mock joint angles for testing
 */
function generateMockJointAngles(frameNumber: number): any {
  const phase = frameNumber / 300;

  return {
    leftKnee: 90 + Math.sin(phase * Math.PI * 2) * 30,
    rightKnee: 90 + Math.sin(phase * Math.PI * 2) * 30,
    leftHip: 45 + Math.sin(phase * Math.PI * 2) * 20,
    rightHip: 45 + Math.sin(phase * Math.PI * 2) * 20,
    leftShoulder: 30 + Math.sin(phase * Math.PI * 2) * 40,
    rightShoulder: 30 + Math.sin(phase * Math.PI * 2) * 40,
    spine: 0 + Math.sin(phase * Math.PI * 2) * 15,
  };
}

/**
 * Auto-detect rider stance from pose data
 */
function autoDetectStance(poseTimeline: PoseFrame[]): 'regular' | 'goofy' {
  // Analyze hip positions to determine stance
  // Regular: left foot forward (left hip more forward in Z)
  // Goofy: right foot forward (right hip more forward in Z)

  let leftForwardCount = 0;
  let rightForwardCount = 0;

  for (const frame of poseTimeline) {
    const leftHip = frame.joints3D.find((j) => j.name === 'left_hip');
    const rightHip = frame.joints3D.find((j) => j.name === 'right_hip');

    if (leftHip && rightHip) {
      if (leftHip.position.z > rightHip.position.z) {
        leftForwardCount++;
      } else {
        rightForwardCount++;
      }
    }
  }

  return leftForwardCount > rightForwardCount ? 'regular' : 'goofy';
}

/**
 * Calculate FPS from pose timeline
 */
function calculateFPS(poseTimeline: PoseFrame[]): number {
  if (poseTimeline.length < 2) return 30; // Default

  const timeDiff = poseTimeline[poseTimeline.length - 1].timestamp - poseTimeline[0].timestamp;
  const frameCount = poseTimeline.length - 1;

  return Math.round(frameCount / timeDiff);
}

/**
 * Get video analysis by ID
 */
export async function getVideoAnalysis(
  db: Db,
  videoId: string
): Promise<VideoAnalysis | null> {
  const collection = await getCollection(db);
  return await collection.findOne({ videoId });
}

/**
 * List all processed videos
 */
export async function listProcessedVideos(db: Db, limit: number = 50): Promise<VideoAnalysis[]> {
  const collection = await getCollection(db);
  return await collection
    .find({})
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .toArray() as any;
}
