/**
 * Keypoint Interpolator
 * 
 * Interpolates keypoint positions between source frames using linear interpolation.
 * Creates smooth motion for missing frames.
 */

import logger from '../../logger';

/**
 * Standard keypoint structure
 */
export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name?: string;
  index?: number;
}

/**
 * Interpolated keypoint with metadata
 */
export interface InterpolatedKeypoint extends Keypoint {
  interpolated: true;
  sourceFrames: [number, number];
  interpolationFactor: number;
}

/**
 * Keypoint Interpolator
 * 
 * Performs linear interpolation of keypoint positions between two source frames.
 */
export class KeypointInterpolator {
  /**
   * Interpolate a single keypoint between two frames
   * 
   * @param beforeKp - Keypoint from the frame before the gap
   * @param afterKp - Keypoint from the frame after the gap
   * @param factor - Interpolation factor (0 = beforeKp, 1 = afterKp)
   * @param beforeFrameIndex - Index of the before frame
   * @param afterFrameIndex - Index of the after frame
   * @returns Interpolated keypoint
   */
  static interpolateKeypoint(
    beforeKp: Keypoint,
    afterKp: Keypoint,
    factor: number,
    beforeFrameIndex: number,
    afterFrameIndex: number
  ): InterpolatedKeypoint {
    // Clamp factor to [0, 1]
    const t = Math.max(0, Math.min(1, factor));

    // Linear interpolation: result = before + (after - before) * t
    const x = beforeKp.x + (afterKp.x - beforeKp.x) * t;
    const y = beforeKp.y + (afterKp.y - beforeKp.y) * t;

    // Interpolate z if both have it
    let z: number | undefined;
    if (beforeKp.z !== undefined && afterKp.z !== undefined) {
      z = beforeKp.z + (afterKp.z - beforeKp.z) * t;
    } else if (beforeKp.z !== undefined) {
      z = beforeKp.z;
    } else if (afterKp.z !== undefined) {
      z = afterKp.z;
    }

    // Use minimum confidence (conservative approach)
    const confidence = Math.min(beforeKp.confidence, afterKp.confidence);

    // Preserve name and index from before keypoint
    const name = beforeKp.name || afterKp.name;
    const index = beforeKp.index ?? afterKp.index;

    return {
      x,
      y,
      z,
      confidence,
      name,
      index,
      interpolated: true,
      sourceFrames: [beforeFrameIndex, afterFrameIndex],
      interpolationFactor: t
    };
  }

  /**
   * Interpolate all keypoints for a frame
   * 
   * @param beforeKeypoints - Keypoints from the frame before the gap
   * @param afterKeypoints - Keypoints from the frame after the gap
   * @param factor - Interpolation factor (0 = before, 1 = after)
   * @param beforeFrameIndex - Index of the before frame
   * @param afterFrameIndex - Index of the after frame
   * @returns Array of interpolated keypoints
   */
  static interpolateFrame(
    beforeKeypoints: Keypoint[],
    afterKeypoints: Keypoint[],
    factor: number,
    beforeFrameIndex: number,
    afterFrameIndex: number
  ): InterpolatedKeypoint[] {
    if (beforeKeypoints.length === 0 && afterKeypoints.length === 0) {
      logger.warn('Both source frames have no keypoints');
      return [];
    }

    // Handle mismatched keypoint counts
    if (beforeKeypoints.length !== afterKeypoints.length) {
      logger.warn('Keypoint count mismatch during interpolation', {
        beforeCount: beforeKeypoints.length,
        afterCount: afterKeypoints.length
      });

      // Use the frame with more keypoints as reference
      if (beforeKeypoints.length > afterKeypoints.length) {
        // Pad afterKeypoints with duplicates from beforeKeypoints
        const paddedAfter = [...afterKeypoints];
        for (let i = afterKeypoints.length; i < beforeKeypoints.length; i++) {
          paddedAfter.push(beforeKeypoints[i]);
        }
        return this.interpolateFrameAligned(
          beforeKeypoints,
          paddedAfter,
          factor,
          beforeFrameIndex,
          afterFrameIndex
        );
      } else {
        // Pad beforeKeypoints with duplicates from afterKeypoints
        const paddedBefore = [...beforeKeypoints];
        for (let i = beforeKeypoints.length; i < afterKeypoints.length; i++) {
          paddedBefore.push(afterKeypoints[i]);
        }
        return this.interpolateFrameAligned(
          paddedBefore,
          afterKeypoints,
          factor,
          beforeFrameIndex,
          afterFrameIndex
        );
      }
    }

    return this.interpolateFrameAligned(
      beforeKeypoints,
      afterKeypoints,
      factor,
      beforeFrameIndex,
      afterFrameIndex
    );
  }

  /**
   * Interpolate aligned keypoint arrays (same length)
   */
  private static interpolateFrameAligned(
    beforeKeypoints: Keypoint[],
    afterKeypoints: Keypoint[],
    factor: number,
    beforeFrameIndex: number,
    afterFrameIndex: number
  ): InterpolatedKeypoint[] {
    const result: InterpolatedKeypoint[] = [];

    for (let i = 0; i < beforeKeypoints.length; i++) {
      const interpolated = this.interpolateKeypoint(
        beforeKeypoints[i],
        afterKeypoints[i],
        factor,
        beforeFrameIndex,
        afterFrameIndex
      );
      result.push(interpolated);
    }

    return result;
  }

  /**
   * Duplicate keypoints from a single frame (for edge cases)
   * 
   * Used when there's no frame to interpolate from (start/end of video)
   * 
   * @param keypoints - Keypoints to duplicate
   * @param sourceFrameIndex - Index of the source frame
   * @returns Array of keypoints marked as interpolated
   */
  static duplicateKeypoints(
    keypoints: Keypoint[],
    sourceFrameIndex: number
  ): InterpolatedKeypoint[] {
    return keypoints.map(kp => ({
      ...kp,
      interpolated: true as const,
      sourceFrames: [sourceFrameIndex, sourceFrameIndex] as [number, number],
      interpolationFactor: 0
    }));
  }
}

export default KeypointInterpolator;
