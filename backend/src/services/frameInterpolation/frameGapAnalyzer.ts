/**
 * Frame Gap Analyzer
 * 
 * Identifies missing frames between source frames and calculates interpolation parameters.
 * Used to fill gaps where pose detection failed to extract poses.
 */

import logger from '../../logger';

/**
 * Represents a gap between two source frames
 */
export interface FrameGap {
  startFrame: number;      // Last frame with pose data (before gap)
  endFrame: number;        // Next frame with pose data (after gap)
  missingFrames: number[]; // Indices of missing frames
  gapSize: number;         // Number of missing frames
}

/**
 * Metadata about frame gaps in a video
 */
export interface FrameGapMetadata {
  totalVideoFrames: number;
  sourceFrameCount: number;
  missingFrameCount: number;
  gaps: FrameGap[];
  interpolationPercentage: number;
  hasStartGap: boolean;
  hasEndGap: boolean;
}

/**
 * Frame Gap Analyzer
 * 
 * Analyzes mesh data to identify which frames are missing and need interpolation.
 */
export class FrameGapAnalyzer {
  /**
   * Analyze mesh data and identify all gaps
   * 
   * @param sourceFrameIndices - Array of frame indices that have pose data
   * @param totalVideoFrames - Total number of frames in the video
   * @returns FrameGapMetadata with all gap information
   */
  static analyzeGaps(
    sourceFrameIndices: number[],
    totalVideoFrames: number
  ): FrameGapMetadata {
    if (sourceFrameIndices.length === 0) {
      logger.warn('No source frames provided for gap analysis');
      return {
        totalVideoFrames,
        sourceFrameCount: 0,
        missingFrameCount: totalVideoFrames,
        gaps: [],
        interpolationPercentage: 100,
        hasStartGap: true,
        hasEndGap: true
      };
    }

    // Sort source frame indices
    const sortedIndices = [...sourceFrameIndices].sort((a, b) => a - b);
    const gaps: FrameGap[] = [];

    // Check for gap at start (frames before first source frame)
    const firstSourceFrame = sortedIndices[0];
    if (firstSourceFrame > 0) {
      const missingFrames: number[] = [];
      for (let i = 0; i < firstSourceFrame; i++) {
        missingFrames.push(i);
      }
      gaps.push({
        startFrame: -1, // No frame before
        endFrame: firstSourceFrame,
        missingFrames,
        gapSize: missingFrames.length
      });
    }

    // Check for gaps between source frames
    for (let i = 0; i < sortedIndices.length - 1; i++) {
      const currentFrame = sortedIndices[i];
      const nextFrame = sortedIndices[i + 1];

      // If there's a gap (more than 1 frame difference)
      if (nextFrame - currentFrame > 1) {
        const missingFrames: number[] = [];
        for (let j = currentFrame + 1; j < nextFrame; j++) {
          missingFrames.push(j);
        }
        gaps.push({
          startFrame: currentFrame,
          endFrame: nextFrame,
          missingFrames,
          gapSize: missingFrames.length
        });
      }
    }

    // Check for gap at end (frames after last source frame)
    const lastSourceFrame = sortedIndices[sortedIndices.length - 1];
    if (lastSourceFrame < totalVideoFrames - 1) {
      const missingFrames: number[] = [];
      for (let i = lastSourceFrame + 1; i < totalVideoFrames; i++) {
        missingFrames.push(i);
      }
      gaps.push({
        startFrame: lastSourceFrame,
        endFrame: -1, // No frame after
        missingFrames,
        gapSize: missingFrames.length
      });
    }

    // Calculate totals
    const missingFrameCount = gaps.reduce((sum, gap) => sum + gap.gapSize, 0);
    const interpolationPercentage = totalVideoFrames > 0
      ? (missingFrameCount / totalVideoFrames) * 100
      : 0;

    const metadata: FrameGapMetadata = {
      totalVideoFrames,
      sourceFrameCount: sortedIndices.length,
      missingFrameCount,
      gaps,
      interpolationPercentage,
      hasStartGap: firstSourceFrame > 0,
      hasEndGap: lastSourceFrame < totalVideoFrames - 1
    };

    logger.info('Frame gap analysis complete', {
      totalVideoFrames,
      sourceFrameCount: sortedIndices.length,
      missingFrameCount,
      gapCount: gaps.length,
      interpolationPercentage: interpolationPercentage.toFixed(1)
    });

    return metadata;
  }

  /**
   * Get interpolation factor for a frame within a gap
   * 
   * @param frameIndex - The frame index to get factor for
   * @param gap - The gap containing this frame
   * @returns Interpolation factor (0-1), where 0 = startFrame, 1 = endFrame
   */
  static getInterpolationFactor(frameIndex: number, gap: FrameGap): number {
    // Handle edge cases
    if (gap.startFrame === -1) {
      // Gap at start - no interpolation possible, use first frame
      return 0;
    }
    if (gap.endFrame === -1) {
      // Gap at end - no interpolation possible, use last frame
      return 1;
    }

    const totalGapSize = gap.endFrame - gap.startFrame;
    const positionInGap = frameIndex - gap.startFrame;

    // Factor is position within gap divided by total gap size
    const factor = positionInGap / totalGapSize;

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, factor));
  }

  /**
   * Check if a frame needs interpolation
   * 
   * @param frameIndex - The frame index to check
   * @param sourceFrameIndices - Set of frame indices that have pose data
   * @returns true if frame needs interpolation
   */
  static isInterpolatedFrame(
    frameIndex: number,
    sourceFrameIndices: Set<number>
  ): boolean {
    return !sourceFrameIndices.has(frameIndex);
  }

  /**
   * Find the gap containing a specific frame
   * 
   * @param frameIndex - The frame index to find
   * @param gaps - Array of gaps to search
   * @returns The gap containing this frame, or null if not in a gap
   */
  static findGapForFrame(frameIndex: number, gaps: FrameGap[]): FrameGap | null {
    for (const gap of gaps) {
      if (gap.missingFrames.includes(frameIndex)) {
        return gap;
      }
    }
    return null;
  }

  /**
   * Get the source frames to use for interpolating a missing frame
   * 
   * @param frameIndex - The missing frame index
   * @param gaps - Array of gaps
   * @param sourceFrameIndices - Sorted array of source frame indices
   * @returns Object with beforeFrame and afterFrame indices, or null if not interpolatable
   */
  static getSourceFramesForInterpolation(
    frameIndex: number,
    gaps: FrameGap[],
    sourceFrameIndices: number[]
  ): { beforeFrame: number; afterFrame: number } | null {
    const gap = this.findGapForFrame(frameIndex, gaps);
    if (!gap) {
      return null; // Frame is not in a gap
    }

    // Handle edge cases
    if (gap.startFrame === -1) {
      // Gap at start - duplicate first source frame
      return {
        beforeFrame: gap.endFrame,
        afterFrame: gap.endFrame
      };
    }

    if (gap.endFrame === -1) {
      // Gap at end - duplicate last source frame
      return {
        beforeFrame: gap.startFrame,
        afterFrame: gap.startFrame
      };
    }

    return {
      beforeFrame: gap.startFrame,
      afterFrame: gap.endFrame
    };
  }

  /**
   * Log gap analysis for debugging
   */
  static logGapAnalysis(metadata: FrameGapMetadata): void {
    console.log(`[FRAME-GAP] ========== Gap Analysis ==========`);
    console.log(`[FRAME-GAP] Total video frames: ${metadata.totalVideoFrames}`);
    console.log(`[FRAME-GAP] Source frames: ${metadata.sourceFrameCount}`);
    console.log(`[FRAME-GAP] Missing frames: ${metadata.missingFrameCount}`);
    console.log(`[FRAME-GAP] Interpolation: ${metadata.interpolationPercentage.toFixed(1)}%`);
    console.log(`[FRAME-GAP] Has start gap: ${metadata.hasStartGap}`);
    console.log(`[FRAME-GAP] Has end gap: ${metadata.hasEndGap}`);
    console.log(`[FRAME-GAP] Gap count: ${metadata.gaps.length}`);

    if (metadata.gaps.length > 0) {
      console.log(`[FRAME-GAP] Gaps:`);
      metadata.gaps.forEach((gap, i) => {
        console.log(`[FRAME-GAP]   ${i + 1}. Frames ${gap.startFrame} -> ${gap.endFrame} (${gap.gapSize} missing)`);
      });
    }

    console.log(`[FRAME-GAP] ================================`);
  }
}

export default FrameGapAnalyzer;
