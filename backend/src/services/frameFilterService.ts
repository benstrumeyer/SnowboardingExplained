import logger from '../logger';
import { FrameQuality, FilteredFrameSequence, PoseKeypoint } from '../types';

/**
 * Frame Filter & Interpolator Service
 * 
 * Removes low-quality frames and interpolates outliers to create smooth pose sequences.
 */
class FrameFilterService {
  private maxInterpolationGap: number;
  private debugMode: boolean;

  constructor(config?: { maxInterpolationGap?: number; debugMode?: boolean }) {
    this.maxInterpolationGap = config?.maxInterpolationGap ?? 10;
    this.debugMode = config?.debugMode ?? false;
  }

  /**
   * Filter frames and interpolate outliers
   * 
   * Returns filtered frame sequence with tracking of removed and interpolated frames
   */
  filterAndInterpolate(
    frames: Array<{ frameNumber: number; keypoints: PoseKeypoint[] }>,
    qualities: FrameQuality[]
  ): FilteredFrameSequence {
    if (frames.length === 0) {
      return {
        frames: [],
        removedFrames: [],
        interpolatedFrames: [],
        frameIndexMap: new Map(),
        statistics: {
          originalCount: 0,
          processedCount: 0,
          removedCount: 0,
          interpolatedCount: 0
        }
      };
    }

    // Step 1: Identify frames to remove (off-screen and low-confidence)
    const framesToRemove = new Set<number>();
    const framesToInterpolate = new Set<number>();

    for (let i = 0; i < qualities.length; i++) {
      const quality = qualities[i];

      // Remove off-screen frames entirely
      if (quality.flags.offScreen) {
        framesToRemove.add(i);
        if (this.debugMode) {
          logger.debug(`Frame ${i} marked for removal: off-screen`);
        }
      }
      // Remove low-confidence frames
      else if (quality.flags.lowConfidence) {
        framesToRemove.add(i);
        if (this.debugMode) {
          logger.debug(`Frame ${i} marked for removal: low confidence (${quality.averageConfidence.toFixed(2)})`);
        }
      }
      // Mark outliers for interpolation
      else if (quality.flags.outlier) {
        framesToInterpolate.add(i);
        if (this.debugMode) {
          logger.debug(`Frame ${i} marked for interpolation: outlier (deviation: ${quality.deviationFromNeighbors.toFixed(2)})`);
        }
      }
    }

    // Step 2: Remove consecutive off-screen frames as blocks
    const finalRemoveSet = this.removeConsecutiveBlocks(framesToRemove, frames.length);

    // Step 3: Create filtered frame list
    const filteredFrames: Array<{ frameNumber: number; keypoints: PoseKeypoint[]; interpolated?: boolean }> = [];
    const frameIndexMap = new Map<number, number>();

    for (let i = 0; i < frames.length; i++) {
      if (finalRemoveSet.has(i)) {
        continue;
      }

      // Check if this frame needs interpolation
      if (framesToInterpolate.has(i)) {
        // Find nearest good frames before and after
        const beforeFrame = this.findNearestGoodFrame(i, frames, finalRemoveSet, -1);
        const afterFrame = this.findNearestGoodFrame(i, frames, finalRemoveSet, 1);

        if (beforeFrame !== null && afterFrame !== null) {
          const gap = afterFrame - beforeFrame;

          // Only interpolate if gap is reasonable
          if (gap <= this.maxInterpolationGap) {
            const interpolatedKeypoints = this.interpolateKeypoints(
              frames[beforeFrame].keypoints,
              frames[afterFrame].keypoints,
              i - beforeFrame,
              gap
            );

            // Preserve mesh data from the nearest good frame (use beforeFrame's mesh data)
            // We can't interpolate mesh vertices, so use the closest frame's mesh
            filteredFrames.push({
              ...frames[beforeFrame],  // Spread all original frame properties (mesh_vertices_data, mesh_faces_data, etc.)
              frameNumber: frames[i].frameNumber,
              keypoints: interpolatedKeypoints,
              interpolated: true
            });

            frameIndexMap.set(i, filteredFrames.length - 1);

            if (this.debugMode) {
              logger.debug(`Frame ${i} interpolated between frames ${beforeFrame} and ${afterFrame}`);
            }
          } else {
            // Gap too large, remove the frame
            finalRemoveSet.add(i);
            if (this.debugMode) {
              logger.debug(`Frame ${i} removed: interpolation gap too large (${gap} > ${this.maxInterpolationGap})`);
            }
          }
        } else {
          // Can't interpolate, remove the frame
          finalRemoveSet.add(i);
          if (this.debugMode) {
            logger.debug(`Frame ${i} removed: no good frames to interpolate from`);
          }
        }
      } else {
        // Good frame, keep as-is (preserve ALL frame data including mesh)
        filteredFrames.push({
          ...frames[i],  // Spread all original frame properties (mesh_vertices_data, mesh_faces_data, etc.)
          frameNumber: frames[i].frameNumber,
          keypoints: frames[i].keypoints
        });

        frameIndexMap.set(i, filteredFrames.length - 1);
      }
    }

    // Step 4: Build removed and interpolated frame lists
    const removedFrames = Array.from(finalRemoveSet).sort((a, b) => a - b);
    const interpolatedFrames = Array.from(framesToInterpolate)
      .filter(i => !finalRemoveSet.has(i))
      .sort((a, b) => a - b);

    logger.info('Frame filtering complete', {
      originalCount: frames.length,
      processedCount: filteredFrames.length,
      removedCount: removedFrames.length,
      interpolatedCount: interpolatedFrames.length,
      removalPercentage: ((removedFrames.length / frames.length) * 100).toFixed(1),
      interpolationPercentage: ((interpolatedFrames.length / frames.length) * 100).toFixed(1)
    });

    return {
      frames: filteredFrames,
      removedFrames,
      interpolatedFrames,
      frameIndexMap,
      statistics: {
        originalCount: frames.length,
        processedCount: filteredFrames.length,
        removedCount: removedFrames.length,
        interpolatedCount: interpolatedFrames.length
      }
    };
  }

  /**
   * Remove consecutive blocks of frames
   * 
   * Identifies contiguous sequences of frames to remove and removes them as blocks
   */
  private removeConsecutiveBlocks(framesToRemove: Set<number>, totalFrames: number): Set<number> {
    const result = new Set(framesToRemove);

    // Find consecutive blocks
    let blockStart = -1;
    for (let i = 0; i < totalFrames; i++) {
      if (framesToRemove.has(i)) {
        if (blockStart === -1) {
          blockStart = i;
        }
      } else {
        if (blockStart !== -1) {
          // End of block
          const blockSize = i - blockStart;
          if (this.debugMode) {
            logger.debug(`Found consecutive block of ${blockSize} frames to remove: ${blockStart}-${i - 1}`);
          }
          blockStart = -1;
        }
      }
    }

    return result;
  }

  /**
   * Find nearest good frame in a direction
   */
  private findNearestGoodFrame(
    currentIndex: number,
    frames: Array<any>,
    framesToRemove: Set<number>,
    direction: -1 | 1
  ): number | null {
    let index = currentIndex + direction;

    while (index >= 0 && index < frames.length) {
      if (!framesToRemove.has(index)) {
        return index;
      }
      index += direction;
    }

    return null;
  }

  /**
   * Linear interpolation of keypoints between two frames
   */
  private interpolateKeypoints(
    beforeKeypoints: PoseKeypoint[],
    afterKeypoints: PoseKeypoint[],
    frameOffset: number,
    totalGap: number
  ): PoseKeypoint[] {
    if (beforeKeypoints.length !== afterKeypoints.length) {
      logger.warn('Keypoint count mismatch during interpolation', {
        before: beforeKeypoints.length,
        after: afterKeypoints.length
      });
      return beforeKeypoints; // Return before keypoints if mismatch
    }

    const t = frameOffset / totalGap; // Interpolation factor (0-1)

    return beforeKeypoints.map((beforeKp, index) => {
      const afterKp = afterKeypoints[index];

      return {
        x: beforeKp.x + (afterKp.x - beforeKp.x) * t,
        y: beforeKp.y + (afterKp.y - beforeKp.y) * t,
        z: beforeKp.z !== undefined && afterKp.z !== undefined
          ? beforeKp.z + (afterKp.z - beforeKp.z) * t
          : beforeKp.z,
        confidence: Math.min(beforeKp.confidence, afterKp.confidence), // Use minimum confidence
        name: beforeKp.name
      };
    });
  }
}

export default FrameFilterService;
