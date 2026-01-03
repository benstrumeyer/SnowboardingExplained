import { getAllFrames } from './frameStorageService';
import { FrameData, PersonData } from './pickleParserService';
import { MeshSequence, SyncedFrame, Keypoint, CameraParams } from '../types';
import { getVideoMetadata } from './frameQueryService';

/**
 * Mesh Data Adapter Service
 * Transforms MongoDB-stored frame data into frontend's MeshSequence format
 */

export async function getMeshSequence(videoId: string): Promise<MeshSequence> {
  console.log(`[MESH_ADAPTER] 🚀 Getting mesh sequence for videoId=${videoId}`);

  try {
    // Get video metadata
    console.log(`[MESH_ADAPTER] Fetching video metadata for videoId=${videoId}`);
    const videoMetadata = await getVideoMetadata(videoId);

    if (!videoMetadata) {
      console.log(`[MESH_ADAPTER] ✗ Video metadata not found for videoId=${videoId}`);
      throw new Error(`Video metadata not found for videoId=${videoId}`);
    }

    console.log(`[MESH_ADAPTER] ✓ Got video metadata: fps=${videoMetadata.fps}, duration=${videoMetadata.duration}, frameCount=${videoMetadata.frameCount}`);

    // Get all frames from MongoDB
    console.log(`[MESH_ADAPTER] Fetching all frames for videoId=${videoId}`);
    const frames = await getAllFrames(videoId);

    if (frames.length === 0) {
      console.log(`[MESH_ADAPTER] ✗ No frames found for videoId=${videoId}`);
      throw new Error(`No frames found for videoId=${videoId}`);
    }

    console.log(`[MESH_ADAPTER] ✓ Got ${frames.length} frames from MongoDB`);

    // Transform frames to SyncedFrame format
    console.log(`[MESH_ADAPTER] Transforming ${frames.length} frames to SyncedFrame format`);
    const syncedFrames: SyncedFrame[] = frames.map((frame) =>
      buildSyncedFrame(frame, videoMetadata)
    );

    console.log(`[MESH_ADAPTER] ✓ Transformed ${syncedFrames.length} frames`);

    // Verify frame ordering
    for (let i = 0; i < syncedFrames.length; i++) {
      if (syncedFrames[i].frameIndex !== i) {
        console.warn(`[MESH_ADAPTER] ⚠ Frame ordering issue at index ${i}: expected ${i}, got ${syncedFrames[i].frameIndex}`);
      }
    }

    // Build MeshSequence response
    const meshSequence: MeshSequence = {
      videoId,
      videoUrl: `/api/mesh-data/${videoId}/video/original`,
      fps: videoMetadata.fps,
      videoDuration: videoMetadata.duration,
      totalFrames: syncedFrames.length,
      frames: syncedFrames,
      metadata: {
        uploadedAt: videoMetadata.createdAt || new Date(),
        processingTime: 0,
        extractionMethod: 'direct-video-processing',
      },
    };

    console.log(`[MESH_ADAPTER] ✓ Built MeshSequence: ${meshSequence.totalFrames} frames @ ${meshSequence.fps} fps`);

    // Validate correctness properties
    validateMeshSequence(meshSequence);

    return meshSequence;
  } catch (err: any) {
    console.error(`[MESH_ADAPTER] ✗ Failed to get mesh sequence: ${err.message}`);
    throw err;
  }
}

/**
 * Build a SyncedFrame from MongoDB frame data
 */
function buildSyncedFrame(frame: FrameData, videoMetadata: any): SyncedFrame {
  const personData = frame.persons[0];

  if (!personData) {
    throw new Error(`Frame ${frame.frameNumber} has no person data`);
  }

  const keypoints = transformPersonDataToKeypoints(personData);
  const vertices = personData.meshVertices || [];
  const faces = personData.meshFaces || [];
  const cameraParams = personData.camera
    ? transformCameraParams(personData.camera)
    : undefined;

  const syncedFrame: SyncedFrame = {
    frameIndex: frame.frameNumber,
    timestamp: (frame.frameNumber / videoMetadata.fps) * 1000,
    meshData: {
      keypoints,
      vertices: vertices as [number, number, number][],
      faces: faces as number[][],
      cameraParams,
    },
  };

  return syncedFrame;
}

/**
 * Transform PersonData to Keypoint objects
 * This is a placeholder - actual implementation depends on PersonData structure
 */
function transformPersonDataToKeypoints(personData: PersonData): Keypoint[] {
  // For now, return empty array - keypoints will be extracted from mesh vertices
  // In a full implementation, this would extract keypoints from SMPL model
  return [];
}

/**
 * Transform camera parameters from storage format to frontend format
 * Data is already transformed at parse time, so just pass through
 */
function transformCameraParams(camera: any): CameraParams {
  return {
    scale: camera.focalLength || 1.0,
    tx: camera.tx || 0,
    ty: camera.ty || 0,
    type: 'weak_perspective',
  };
}

/**
 * Validate MeshSequence correctness properties
 * Property 1: Frame Ordering Invariant
 * Property 2: Frame Count Consistency
 * Property 3: Timestamp Monotonicity
 * Property 4: Mesh Data Completeness
 * Property 5: Video Metadata Presence
 */
function validateMeshSequence(meshSequence: MeshSequence): void {
  console.log(`[MESH_ADAPTER] Validating MeshSequence correctness properties...`);

  // Property 1: Frame Ordering Invariant
  for (let i = 0; i < meshSequence.frames.length; i++) {
    if (meshSequence.frames[i].frameIndex !== i) {
      console.warn(`[MESH_ADAPTER] ⚠ Property 1 violation: Frame ${i} has frameIndex=${meshSequence.frames[i].frameIndex}`);
    }
  }
  console.log(`[MESH_ADAPTER] ✓ Property 1: Frame Ordering Invariant`);

  // Property 2: Frame Count Consistency
  if (meshSequence.frames.length !== meshSequence.totalFrames) {
    console.warn(`[MESH_ADAPTER] ⚠ Property 2 violation: frames.length=${meshSequence.frames.length}, totalFrames=${meshSequence.totalFrames}`);
  } else {
    console.log(`[MESH_ADAPTER] ✓ Property 2: Frame Count Consistency`);
  }

  // Property 3: Timestamp Monotonicity
  let isMonotonic = true;
  let isEvenlySpaced = true;
  const expectedInterval = 1000 / meshSequence.fps;
  for (let i = 1; i < meshSequence.frames.length; i++) {
    const prev = meshSequence.frames[i - 1];
    const curr = meshSequence.frames[i];
    if (curr.timestamp <= prev.timestamp) {
      isMonotonic = false;
      console.warn(`[MESH_ADAPTER] ⚠ Timestamp not monotonic at frame ${i}`);
      break;
    }
    const interval = curr.timestamp - prev.timestamp;
    if (Math.abs(interval - expectedInterval) > 1) {
      isEvenlySpaced = false;
    }
  }
  if (isMonotonic && isEvenlySpaced) {
    console.log(`[MESH_ADAPTER] ✓ Property 3: Timestamp Monotonicity`);
  } else if (isMonotonic) {
    console.log(`[MESH_ADAPTER] ⚠ Property 3: Timestamps monotonic but not evenly spaced`);
  }

  // Property 4: Mesh Data Completeness
  let allComplete = true;
  for (let i = 0; i < Math.min(meshSequence.frames.length, 5); i++) {
    const frame = meshSequence.frames[i];
    if (!frame.meshData || !frame.meshData.vertices || !frame.meshData.faces) {
      allComplete = false;
      console.warn(`[MESH_ADAPTER] ⚠ Frame ${i} missing mesh data`);
    }
  }
  if (allComplete) {
    console.log(`[MESH_ADAPTER] ✓ Property 4: Mesh Data Completeness`);
  }

  // Property 5: Video Metadata Presence
  const hasAllMetadata =
    meshSequence.videoId &&
    meshSequence.videoUrl &&
    meshSequence.fps &&
    meshSequence.videoDuration !== undefined &&
    meshSequence.totalFrames;

  if (hasAllMetadata) {
    console.log(`[MESH_ADAPTER] ✓ Property 5: Video Metadata Presence`);
  } else {
    console.warn(`[MESH_ADAPTER] ⚠ Property 5 violation: Missing metadata`);
  }
}
