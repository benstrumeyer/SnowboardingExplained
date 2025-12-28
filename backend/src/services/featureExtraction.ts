import { PoseData } from '../types';

/**
 * Feature Extraction Service
 * Extracts biomechanical features from pose data
 */
export class FeatureExtractionService {
  /**
   * Extract features from frame data
   */
  static extractFeatures(frameData: PoseData): Record<string, number> {
    const features: Record<string, number> = {};

    if (frameData.keypoints && frameData.keypoints.length > 0) {
      // Extract basic keypoint positions
      frameData.keypoints.forEach((kp, index) => {
        features[`kp_${index}_x`] = kp.x;
        features[`kp_${index}_y`] = kp.y;
        if (kp.confidence !== undefined) {
          features[`kp_${index}_conf`] = kp.confidence;
        }
      });
    }

    return features;
  }

  /**
   * Extract temporal features from sequence of frames
   */
  static extractTemporalFeatures(frames: PoseData[]): Record<string, number> {
    const features: Record<string, number> = {};

    if (frames.length < 2) {
      return features;
    }

    // Calculate velocities and accelerations
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1];
      const curr = frames[i];

      if (prev.keypoints && curr.keypoints) {
        for (let j = 0; j < Math.min(prev.keypoints.length, curr.keypoints.length); j++) {
          const prevKp = prev.keypoints[j];
          const currKp = curr.keypoints[j];

          const dx = currKp.x - prevKp.x;
          const dy = currKp.y - prevKp.y;
          const velocity = Math.sqrt(dx * dx + dy * dy);

          features[`kp_${j}_velocity`] = velocity;
        }
      }
    }

    return features;
  }
}

export default FeatureExtractionService;
