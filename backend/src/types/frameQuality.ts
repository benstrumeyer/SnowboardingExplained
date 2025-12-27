/**
 * Frame Quality Type Definitions
 */

/**
 * Quality flags for a frame
 */
export interface FrameQualityFlags {
  lowConfidence: boolean;
  offScreen: boolean;
  outlier: boolean;
}

/**
 * Quality analysis result for a single frame
 */
export interface FrameQuality {
  frameIndex: number;
  qualityScore: number; // 0-1, where 1 is perfect
  flags: FrameQualityFlags;
  averageConfidence: number;
  boundaryDistance: number; // 0-1, min distance to image edge
  deviationFromNeighbors: number; // 0-1 scale
  metadata?: {
    keypointCount: number;
    lowConfidenceKeypoints: number;
    boundaryKeypoints: number;
  };
}

/**
 * Result of frame filtering and interpolation
 */
export interface FilteredFrameSequence {
  frames: any[];
  removedFrames: number[];
  interpolatedFrames: number[];
  frameIndexMap: Map<number, number>; // original → processed index
  statistics: {
    originalCount: number;
    processedCount: number;
    removedCount: number;
    interpolatedCount: number;
  };
}

/**
 * Frame index mapping for synchronization
 */
export interface FrameIndexMapping {
  videoId: string;
  originalToProcessed: Map<number, number>;
  processedToOriginal: Map<number, number>;
  removedFrames: Set<number>;
  interpolatedFrames: Set<number>;
  metadata: {
    originalFrameCount: number;
    processedFrameCount: number;
    removedCount: number;
    interpolatedCount: number;
  };
}

/**
 * Serialized version of FrameIndexMapping for storage
 */
export interface SerializedFrameIndexMapping {
  videoId: string;
  originalToProcessed: Array<[number, number]>;
  processedToOriginal: Array<[number, number]>;
  removedFrames: number[];
  interpolatedFrames: number[];
  metadata: {
    originalFrameCount: number;
    processedFrameCount: number;
    removedCount: number;
    interpolatedCount: number;
  };
}

/**
 * Quality statistics for a video
 */
export interface QualityStatistics {
  videoId: string;
  originalFrameCount: number;
  processedFrameCount: number;
  removedCount: number;
  interpolatedCount: number;
  removalPercentage: number;
  interpolationPercentage: number;
  averageQualityScore: number;
  lowConfidenceFrameCount: number;
  offScreenFrameCount: number;
  outlierFrameCount: number;
}

/**
 * Frame quality analysis configuration
 */
export interface FrameQualityAnalysisConfig {
  minConfidence?: number;
  boundaryThreshold?: number;
  offScreenConfidence?: number;
  outlierDeviationThreshold?: number;
  maxInterpolationGap?: number;
  debugMode?: boolean;
}

/**
 * Metadata for a frame that has been processed
 */
export interface ProcessedFrameMetadata {
  interpolated?: boolean;
  interpolationSource?: [number, number]; // [prevFrameIndex, nextFrameIndex]
  originalFrameIndex?: number;
  qualityScore?: number;
  flags?: FrameQualityFlags;
}
