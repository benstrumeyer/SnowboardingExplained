import logger from '../logger';
import { FrameQuality, FrameQualityFlags, PoseKeypoint } from '../types';

/**
 * Frame Quality Analyzer
 * 
 * Evaluates pose quality with full frame context using trend-based outlier detection.
 * Uses a sliding window approach to detect frames that break smooth motion patterns.
 */
class FrameQualityAnalyzer {
  private videoDimensions: { width: number; height: number };
  private minConfidence: number;
  private boundaryThreshold: number;
  private offScreenConfidence: number;
  private outlierDeviationThreshold: number;
  private trendWindowSize: number;

  constructor(
    videoDimensions: { width: number; height: number } = { width: 1920, height: 1080 },
    config?: {
      minConfidence?: number;
      boundaryThreshold?: number;
      offScreenConfidence?: number;
      outlierDeviationThreshold?: number;
      trendWindowSize?: number;
    }
  ) {
    this.videoDimensions = videoDimensions;
    this.minConfidence = config?.minConfidence ?? 0.6;
    this.boundaryThreshold = config?.boundaryThreshold ?? 0.05;
    this.offScreenConfidence = config?.offScreenConfidence ?? 0.3;
    this.outlierDeviationThreshold = config?.outlierDeviationThreshold ?? 0.3;
    this.trendWindowSize = config?.trendWindowSize ?? 5;
  }

  /**
   * Analyze a single frame's quality
   */
  analyzeFrame(
    frameIndex: number,
    keypoints: PoseKeypoint[],
    neighborFrames?: { before: PoseKeypoint[][]; after: PoseKeypoint[][] }
  ): FrameQuality {
    const flags: FrameQualityFlags = {
      lowConfidence: false,
      offScreen: false,
      outlier: false
    };

    let qualityScore = 1.0;
    let averageConfidence = 0;
    let boundaryDistance = 1.0;
    let deviationFromNeighbors = 0;

    if (!keypoints || keypoints.length === 0) {
      return {
        frameIndex,
        qualityScore: 0,
        flags: { lowConfidence: true, offScreen: true, outlier: false },
        averageConfidence: 0,
        boundaryDistance: 0,
        deviationFromNeighbors: 1,
        metadata: {
          keypointCount: 0,
          lowConfidenceKeypoints: 0,
          boundaryKeypoints: 0
        }
      };
    }

    // Calculate average confidence
    averageConfidence = keypoints.reduce((sum, kp) => sum + (kp.confidence || 0), 0) / keypoints.length;

    // Check for low confidence
    if (averageConfidence < this.minConfidence) {
      flags.lowConfidence = true;
      qualityScore *= 0.5;
    }

    // Check for off-screen detection
    const { isOffScreen, minBoundaryDistance } = this.detectOffScreen(keypoints);
    boundaryDistance = minBoundaryDistance;

    if (isOffScreen) {
      flags.offScreen = true;
      qualityScore *= 0.1;
    }

    // Check for outliers using trend-based detection
    if (neighborFrames && (neighborFrames.before.length > 0 || neighborFrames.after.length > 0)) {
      const deviation = this.calculateTrendDeviation(keypoints, neighborFrames);
      deviationFromNeighbors = deviation;

      if (deviation > this.outlierDeviationThreshold) {
        flags.outlier = true;
        qualityScore *= 0.6;
      }
    }

    // Count low-confidence and boundary keypoints for metadata
    const lowConfidenceKeypoints = keypoints.filter(kp => (kp.confidence || 0) < this.minConfidence).length;
    const boundaryKeypoints = keypoints.filter(kp => this.isKeypointAtBoundary(kp)).length;

    return {
      frameIndex,
      qualityScore: Math.max(0, Math.min(1, qualityScore)),
      flags,
      averageConfidence,
      boundaryDistance,
      deviationFromNeighbors,
      metadata: {
        keypointCount: keypoints.length,
        lowConfidenceKeypoints,
        boundaryKeypoints
      }
    };
  }

  /**
   * Analyze a complete frame sequence with trend-based outlier detection
   */
  analyzeSequence(frames: Array<{ keypoints: PoseKeypoint[] }>): FrameQuality[] {
    const qualities: FrameQuality[] = [];

    for (let i = 0; i < frames.length; i++) {
      // Build neighbor context using sliding window
      const windowStart = Math.max(0, i - Math.floor(this.trendWindowSize / 2));
      const windowEnd = Math.min(frames.length - 1, i + Math.floor(this.trendWindowSize / 2));

      const beforeFrames = frames.slice(windowStart, i).map(f => f.keypoints);
      const afterFrames = frames.slice(i + 1, windowEnd + 1).map(f => f.keypoints);

      const quality = this.analyzeFrame(i, frames[i].keypoints, {
        before: beforeFrames,
        after: afterFrames
      });

      qualities.push(quality);
    }

    return qualities;
  }

  /**
   * Detect if rider is off-screen
   */
  private detectOffScreen(keypoints: PoseKeypoint[]): { isOffScreen: boolean; minBoundaryDistance: number } {
    if (keypoints.length === 0) {
      return { isOffScreen: true, minBoundaryDistance: 0 };
    }

    // Check if average confidence is too low
    const avgConfidence = keypoints.reduce((sum, kp) => sum + (kp.confidence || 0), 0) / keypoints.length;
    if (avgConfidence < this.offScreenConfidence) {
      return { isOffScreen: true, minBoundaryDistance: 0 };
    }

    // Check if keypoints are clustered at boundaries
    const boundaryThresholdPx = {
      x: this.videoDimensions.width * this.boundaryThreshold,
      y: this.videoDimensions.height * this.boundaryThreshold
    };

    let minBoundaryDistance = 1.0;
    let boundaryKeypointCount = 0;

    for (const kp of keypoints) {
      if (!this.isKeypointAtBoundary(kp)) {
        continue;
      }

      boundaryKeypointCount++;

      // Calculate distance to nearest boundary (0-1 scale)
      const distToLeft = kp.x / this.videoDimensions.width;
      const distToRight = (this.videoDimensions.width - kp.x) / this.videoDimensions.width;
      const distToTop = kp.y / this.videoDimensions.height;
      const distToBottom = (this.videoDimensions.height - kp.y) / this.videoDimensions.height;

      const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      minBoundaryDistance = Math.min(minBoundaryDistance, minDist);
    }

    // If more than 50% of keypoints are at boundaries, consider off-screen
    const isOffScreen = boundaryKeypointCount > keypoints.length * 0.5;

    return { isOffScreen, minBoundaryDistance };
  }

  /**
   * Check if a single keypoint is at the boundary
   */
  private isKeypointAtBoundary(kp: PoseKeypoint): boolean {
    const boundaryThresholdPx = {
      x: this.videoDimensions.width * this.boundaryThreshold,
      y: this.videoDimensions.height * this.boundaryThreshold
    };

    return (
      kp.x < boundaryThresholdPx.x ||
      kp.x > this.videoDimensions.width - boundaryThresholdPx.x ||
      kp.y < boundaryThresholdPx.y ||
      kp.y > this.videoDimensions.height - boundaryThresholdPx.y
    );
  }

  /**
   * Calculate trend-based deviation for outlier detection
   * 
   * Uses a sliding window to establish motion trend and detects frames
   * that deviate significantly from the expected trajectory.
   */
  private calculateTrendDeviation(
    currentKeypoints: PoseKeypoint[],
    neighborFrames: { before: PoseKeypoint[][]; after: PoseKeypoint[][] }
  ): number {
    if (currentKeypoints.length === 0) {
      return 1.0;
    }

    // Combine before and after frames to establish trend
    const allNeighbors = [...neighborFrames.before, ...neighborFrames.after];
    if (allNeighbors.length < 2) {
      return 0; // Not enough neighbors to establish trend
    }

    let totalDeviation = 0;
    let deviationCount = 0;

    // For each keypoint, calculate deviation from trend
    for (let kpIndex = 0; kpIndex < currentKeypoints.length; kpIndex++) {
      const currentKp = currentKeypoints[kpIndex];

      // Collect positions of this keypoint from neighbor frames
      const neighborPositions: Array<{ x: number; y: number; frameIndex: number }> = [];

      neighborFrames.before.forEach((frame, idx) => {
        if (frame[kpIndex]) {
          neighborPositions.push({
            x: frame[kpIndex].x,
            y: frame[kpIndex].y,
            frameIndex: -(neighborFrames.before.length - idx)
          });
        }
      });

      neighborFrames.after.forEach((frame, idx) => {
        if (frame[kpIndex]) {
          neighborPositions.push({
            x: frame[kpIndex].x,
            y: frame[kpIndex].y,
            frameIndex: idx + 1
          });
        }
      });

      if (neighborPositions.length < 2) {
        continue;
      }

      // Fit a line through neighbor positions to establish trend
      const trend = this.fitLineTrend(neighborPositions);
      if (!trend) {
        continue;
      }

      // Calculate expected position for current frame (frameIndex = 0)
      const expectedX = trend.slopeX * 0 + trend.interceptX;
      const expectedY = trend.slopeY * 0 + trend.interceptY;

      // Calculate deviation as percentage of typical motion magnitude
      const deviationX = Math.abs(currentKp.x - expectedX);
      const deviationY = Math.abs(currentKp.y - expectedY);
      const totalMotion = Math.sqrt(trend.slopeX ** 2 + trend.slopeY ** 2);

      if (totalMotion > 0) {
        const deviation = Math.sqrt(deviationX ** 2 + deviationY ** 2) / (totalMotion + 1);
        totalDeviation += Math.min(deviation, 1.0); // Cap at 1.0
        deviationCount++;
      }
    }

    return deviationCount > 0 ? totalDeviation / deviationCount : 0;
  }

  /**
   * Fit a line through positions to establish motion trend
   * Returns slope and intercept for both x and y coordinates
   */
  private fitLineTrend(
    positions: Array<{ x: number; y: number; frameIndex: number }>
  ): { slopeX: number; slopeY: number; interceptX: number; interceptY: number } | null {
    if (positions.length < 2) {
      return null;
    }

    // Simple linear regression
    const n = positions.length;
    const sumX = positions.reduce((sum, p) => sum + p.frameIndex, 0);
    const sumY = positions.reduce((sum, p) => sum + p.x, 0);
    const sumXY = positions.reduce((sum, p) => sum + p.frameIndex * p.x, 0);
    const sumX2 = positions.reduce((sum, p) => sum + p.frameIndex ** 2, 0);

    const denominator = n * sumX2 - sumX ** 2;
    if (Math.abs(denominator) < 1e-10) {
      return null;
    }

    const slopeX = (n * sumXY - sumX * sumY) / denominator;
    const interceptX = (sumY - slopeX * sumX) / n;

    // Same for Y coordinates
    const sumY2 = positions.reduce((sum, p) => sum + p.y, 0);
    const sumXY2 = positions.reduce((sum, p) => sum + p.frameIndex * p.y, 0);

    const slopeY = (n * sumXY2 - sumX * sumY2) / denominator;
    const interceptY = (sumY2 - slopeY * sumX) / n;

    return { slopeX, slopeY, interceptX, interceptY };
  }
}

export default FrameQualityAnalyzer;
