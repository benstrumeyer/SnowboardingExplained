import { Keypoint, SyncedFrame } from '../types';

/**
 * 1D Kalman Filter for smoothing a single coordinate
 */
class KalmanFilter1D {
  private x: number; // State estimate
  private p: number; // Estimate error
  private q: number; // Process noise
  private r: number; // Measurement noise
  private k: number; // Kalman gain

  constructor(initialValue: number, processNoise: number = 0.01, measurementNoise: number = 4.0) {
    this.x = initialValue;
    this.p = 1.0;
    this.q = processNoise;
    this.r = measurementNoise;
    this.k = 0;
  }

  update(measurement: number): number {
    // Predict
    this.p = this.p + this.q;

    // Update
    this.k = this.p / (this.p + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * this.p;

    return this.x;
  }

  reset(initialValue: number): void {
    this.x = initialValue;
    this.p = 1.0;
    this.k = 0;
  }
}

/**
 * Kalman Filter for 3D keypoints
 */
class KeypointKalmanFilter {
  private filterX: KalmanFilter1D;
  private filterY: KalmanFilter1D;
  private filterZ: KalmanFilter1D;
  private confidenceFilter: KalmanFilter1D;

  constructor(
    initialKeypoint: Keypoint,
    processNoise: number = 0.01,
    measurementNoise: number = 4.0
  ) {
    this.filterX = new KalmanFilter1D(initialKeypoint.position[0], processNoise, measurementNoise);
    this.filterY = new KalmanFilter1D(initialKeypoint.position[1], processNoise, measurementNoise);
    this.filterZ = new KalmanFilter1D(initialKeypoint.position[2], processNoise, measurementNoise);
    this.confidenceFilter = new KalmanFilter1D(initialKeypoint.confidence, processNoise * 0.1, measurementNoise * 0.1);
  }

  update(keypoint: Keypoint): Keypoint {
    return {
      ...keypoint,
      position: [
        this.filterX.update(keypoint.position[0]),
        this.filterY.update(keypoint.position[1]),
        this.filterZ.update(keypoint.position[2]),
      ],
      confidence: Math.max(0, Math.min(1, this.confidenceFilter.update(keypoint.confidence))),
    };
  }

  reset(keypoint: Keypoint): void {
    this.filterX.reset(keypoint.position[0]);
    this.filterY.reset(keypoint.position[1]);
    this.filterZ.reset(keypoint.position[2]);
    this.confidenceFilter.reset(keypoint.confidence);
  }
}

/**
 * Kalman Smoothing Service for pose data
 * Smooths keypoint trajectories across frames to reduce jitter
 */
export class KalmanSmoothingService {
  private keypointFilters: Map<number, KeypointKalmanFilter> = new Map();
  private processNoise: number;
  private measurementNoise: number;

  constructor(processNoise: number = 0.01, measurementNoise: number = 4.0) {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
  }

  /**
   * Smooth a single frame's keypoints
   */
  smoothFrame(frame: SyncedFrame): SyncedFrame {
    const smoothedKeypoints = frame.meshData.keypoints.map((keypoint) => {
      let filter = this.keypointFilters.get(keypoint.index);

      if (!filter) {
        filter = new KeypointKalmanFilter(keypoint, this.processNoise, this.measurementNoise);
        this.keypointFilters.set(keypoint.index, filter);
      }

      return filter.update(keypoint);
    });

    return {
      ...frame,
      meshData: {
        ...frame.meshData,
        keypoints: smoothedKeypoints,
      },
    };
  }

  /**
   * Smooth a sequence of frames
   */
  smoothSequence(frames: SyncedFrame[]): SyncedFrame[] {
    this.reset();
    return frames.map((frame) => this.smoothFrame(frame));
  }

  /**
   * Reset all filters (call when starting a new video)
   */
  reset(): void {
    this.keypointFilters.clear();
  }

  /**
   * Adjust smoothing parameters
   * Lower processNoise = smoother but more lag
   * Higher measurementNoise = more smoothing
   */
  setParameters(processNoise: number, measurementNoise: number): void {
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    this.reset();
  }
}

// Export singleton instance
export const kalmanSmoothingService = new KalmanSmoothingService();
