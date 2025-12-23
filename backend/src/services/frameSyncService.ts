import logger from '../logger';
import { SyncedFrame, Keypoint, SkeletonConnection } from '../types';

/**
 * Frame Synchronization Service
 * Handles frame-to-frame timing calculation and alignment of video and mesh frames
 */
export class FrameSyncService {
  /**
   * Calculate frame timing for synchronized playback
   * Creates timestamp for each frame based on video FPS and duration
   */
  static calculateFrameTiming(
    videoFps: number,
    videoDuration: number,
    totalFrames: number
  ): { frameIndex: number; timestamp: number }[] {
    const frameTiming: { frameIndex: number; timestamp: number }[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const timestamp = (i / videoFps) * 1000; // Convert to milliseconds
      frameTiming.push({
        frameIndex: i,
        timestamp
      });
    }

    logger.info(`Calculated frame timing for ${totalFrames} frames`, {
      videoFps,
      videoDuration,
      totalFrames,
      firstFrameTimestamp: frameTiming[0]?.timestamp,
      lastFrameTimestamp: frameTiming[totalFrames - 1]?.timestamp
    });

    return frameTiming;
  }

  /**
   * Align mesh frames to video frames
   * Maps mesh keypoints to corresponding video frame indices
   */
  static alignMeshToVideoFrames(
    meshFrames: any[],
    videoFps: number,
    videoDuration: number
  ): SyncedFrame[] {
    const syncedFrames: SyncedFrame[] = [];
    const totalFrames = meshFrames.length;

    for (let i = 0; i < meshFrames.length; i++) {
      const meshFrame = meshFrames[i];
      const timestamp = (i / videoFps) * 1000; // milliseconds

      // Validate mesh data structure
      if (!meshFrame.keypoints || !Array.isArray(meshFrame.keypoints)) {
        logger.warn(`Invalid mesh frame at index ${i}: missing keypoints`);
        continue;
      }

      // Convert mesh keypoints to Keypoint interface
      const keypoints: Keypoint[] = meshFrame.keypoints.map((kp: any, index: number) => ({
        index,
        name: kp.name || `keypoint_${index}`,
        position: [kp.x || 0, kp.y || 0, kp.z || 0],
        confidence: kp.confidence || 0
      }));

      // Create skeleton connections (MediaPipe standard 33 keypoints)
      const skeleton = FrameSyncService.getMediaPipeSkeleton();

      // Create synced frame
      const syncedFrame: SyncedFrame = {
        frameIndex: i,
        timestamp,
        videoFrameData: {
          offset: i // Frame offset in video
        },
        meshData: {
          keypoints,
          skeleton,
          vertices: meshFrame.vertices || [],
          faces: meshFrame.faces || []
        }
      };

      syncedFrames.push(syncedFrame);
    }

    logger.info(`Aligned ${syncedFrames.length} mesh frames to video frames`, {
      videoFps,
      videoDuration,
      totalFrames,
      syncedFrames: syncedFrames.length
    });

    return syncedFrames;
  }

  /**
   * Get MediaPipe skeleton connections (33 keypoints)
   * Standard skeleton structure for pose estimation
   */
  static getMediaPipeSkeleton(): SkeletonConnection[] {
    return [
      // Head
      { from: 0, to: 1 },   // nose to left eye
      { from: 0, to: 4 },   // nose to right eye
      { from: 1, to: 2 },   // left eye to left ear
      { from: 4, to: 5 },   // right eye to right ear
      { from: 1, to: 3 },   // left eye to left eye inner
      { from: 4, to: 6 },   // right eye to right eye inner
      { from: 3, to: 7 },   // left eye inner to left ear
      { from: 6, to: 8 },   // right eye inner to right ear

      // Torso
      { from: 9, to: 10 },  // left shoulder to right shoulder
      { from: 11, to: 12 }, // left hip to right hip
      { from: 11, to: 23 }, // left hip to left knee
      { from: 12, to: 24 }, // right hip to right knee

      // Left arm
      { from: 11, to: 13 }, // left shoulder to left elbow
      { from: 13, to: 15 }, // left elbow to left wrist
      { from: 15, to: 17 }, // left wrist to left pinky
      { from: 15, to: 19 }, // left wrist to left index
      { from: 15, to: 21 }, // left wrist to left thumb

      // Right arm
      { from: 12, to: 14 }, // right shoulder to right elbow
      { from: 14, to: 16 }, // right elbow to right wrist
      { from: 16, to: 18 }, // right wrist to right pinky
      { from: 16, to: 20 }, // right wrist to right index
      { from: 16, to: 22 }, // right wrist to right thumb

      // Left leg
      { from: 23, to: 25 }, // left knee to left ankle
      { from: 25, to: 27 }, // left ankle to left foot index
      { from: 27, to: 29 }, // left foot index to left foot
      { from: 29, to: 31 }, // left foot to left heel

      // Right leg
      { from: 24, to: 26 }, // right knee to right ankle
      { from: 26, to: 28 }, // right ankle to right foot index
      { from: 28, to: 30 }, // right foot index to right foot
      { from: 30, to: 32 }  // right foot to right heel
    ];
  }

  /**
   * Validate frame synchronization
   * Ensures video and mesh frames are properly aligned
   */
  static validateSynchronization(
    syncedFrames: SyncedFrame[],
    videoFps: number,
    videoDuration: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!syncedFrames || syncedFrames.length === 0) {
      errors.push('No synced frames provided');
      return { isValid: false, errors };
    }

    // Check frame count matches expected duration
    const expectedFrameCount = Math.ceil(videoFps * videoDuration);
    if (Math.abs(syncedFrames.length - expectedFrameCount) > 1) {
      errors.push(
        `Frame count mismatch: expected ~${expectedFrameCount}, got ${syncedFrames.length}`
      );
    }

    // Check timestamps are sequential
    for (let i = 1; i < syncedFrames.length; i++) {
      const prevTimestamp = syncedFrames[i - 1].timestamp;
      const currTimestamp = syncedFrames[i].timestamp;
      const expectedDelta = 1000 / videoFps; // milliseconds between frames

      if (Math.abs(currTimestamp - prevTimestamp - expectedDelta) > 1) {
        errors.push(
          `Timestamp gap at frame ${i}: expected ${expectedDelta}ms, got ${currTimestamp - prevTimestamp}ms`
        );
      }
    }

    // Check all frames have mesh data
    for (let i = 0; i < syncedFrames.length; i++) {
      if (!syncedFrames[i].meshData || !syncedFrames[i].meshData.keypoints) {
        errors.push(`Frame ${i} missing mesh data`);
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      logger.warn(`Frame synchronization validation failed`, {
        frameCount: syncedFrames.length,
        expectedFrameCount,
        errors
      });
    } else {
      logger.info(`Frame synchronization validation passed`, {
        frameCount: syncedFrames.length,
        videoFps,
        videoDuration
      });
    }

    return { isValid, errors };
  }

  /**
   * Calculate frame index from timestamp
   * Useful for seeking to specific timestamps
   */
  static getFrameIndexFromTimestamp(timestamp: number, videoFps: number): number {
    const frameIndex = Math.floor((timestamp / 1000) * videoFps);
    return Math.max(0, frameIndex);
  }

  /**
   * Calculate timestamp from frame index
   */
  static getTimestampFromFrameIndex(frameIndex: number, videoFps: number): number {
    return (frameIndex / videoFps) * 1000; // milliseconds
  }
}
