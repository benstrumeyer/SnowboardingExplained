/**
 * Frame Interpolation Service
 * 
 * Orchestrates frame interpolation to fill gaps where pose detection failed.
 * Provides on-demand interpolation with caching to avoid recalculation.
 */

import logger from '../../logger';
import { FrameGapAnalyzer, FrameGap, FrameGapMetadata } from './frameGapAnalyzer';
import { KeypointInterpolator, InterpolatedKeypoint } from './keypointInterpolator';
import { MeshVertexInterpolator, InterpolatedMeshData } from './meshVertexInterpolator';

/**
 * Represents a frame with interpolation metadata
 */
export interface InterpolatedFrame {
  frameIndex: number;
  timestamp: number;
  keypoints: InterpolatedKeypoint[] | any[];
  skeleton: any;
  mesh_vertices_data: number[][];
  mesh_faces_data: number[][];
  cameraTranslation?: any;
  interpolated: boolean;
  interpolationMetadata?: {
    sourceFrames: [number, number];
    interpolationFactor: number;
  };
}

/**
 * Interpolation statistics
 */
export interface InterpolationStatistics {
  totalFrames: number;
  sourceFrames: number;
  interpolatedFrames: number;
  interpolationPercentage: number;
  cacheHitRate: number;
  averageInterpolationTime: number;
}

/**
 * Frame Interpolation Service
 * 
 * Manages frame interpolation for videos with missing pose data.
 * Interpolates on-demand and caches results for performance.
 */
export class FrameInterpolationService {
  private gaps: FrameGap[] = [];
  private sourceFrameIndices: Set<number> = new Set();
  private totalVideoFrames: number = 0;
  private cache: Map<number, InterpolatedFrame> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private interpolationTimes: number[] = [];
  private isInitialized: boolean = false;

  /**
   * Initialize the service with frame data
   * 
   * @param sourceFrameIndices - Array of frame indices that have pose data
   * @param totalVideoFrames - Total number of frames in the video
   */
  initialize(sourceFrameIndices: number[], totalVideoFrames: number): void {
    this.sourceFrameIndices = new Set(sourceFrameIndices);
    this.totalVideoFrames = totalVideoFrames;

    // Analyze gaps
    const metadata = FrameGapAnalyzer.analyzeGaps(sourceFrameIndices, totalVideoFrames);
    this.gaps = metadata.gaps;

    this.isInitialized = true;

    logger.info('Frame interpolation service initialized', {
      totalFrames: totalVideoFrames,
      sourceFrames: sourceFrameIndices.length,
      missingFrames: metadata.missingFrameCount,
      interpolationPercentage: metadata.interpolationPercentage.toFixed(1)
    });

    FrameGapAnalyzer.logGapAnalysis(metadata);
  }

  /**
   * Check if a frame needs interpolation
   * 
   * @param frameIndex - The frame index to check
   * @returns true if frame needs interpolation
   */
  isInterpolatedFrame(frameIndex: number): boolean {
    return !this.sourceFrameIndices.has(frameIndex);
  }

  /**
   * Get a single frame (interpolated if necessary)
   * 
   * @param frameIndex - The frame index to retrieve
   * @param sourceFrames - Map of source frame index to frame data
   * @returns Interpolated frame or null if not found
   */
  getFrame(
    frameIndex: number,
    sourceFrames: Map<number, any>
  ): InterpolatedFrame | null {
    if (!this.isInitialized) {
      throw new Error('Frame interpolation service not initialized');
    }

    // Check cache first
    if (this.cache.has(frameIndex)) {
      this.cacheHits++;
      return this.cache.get(frameIndex)!;
    }

    this.cacheMisses++;

    // If frame is a source frame, return it as-is
    if (this.sourceFrameIndices.has(frameIndex)) {
      const sourceFrame = sourceFrames.get(frameIndex);
      if (sourceFrame) {
        const frame: InterpolatedFrame = {
          frameIndex,
          timestamp: sourceFrame.timestamp ?? (frameIndex / 60), // Assume 60 FPS if not provided
          keypoints: sourceFrame.keypoints || [],
          skeleton: sourceFrame.skeleton || {},
          mesh_vertices_data: sourceFrame.mesh_vertices_data || [],
          mesh_faces_data: sourceFrame.mesh_faces_data || [],
          cameraTranslation: sourceFrame.cameraTranslation,
          interpolated: false
        };
        this.cache.set(frameIndex, frame);
        return frame;
      }
      return null;
    }

    // Frame needs interpolation
    const startTime = Date.now();
    const interpolated = this.interpolateFrame(frameIndex, sourceFrames);
    const endTime = Date.now();

    this.interpolationTimes.push(endTime - startTime);

    if (interpolated) {
      this.cache.set(frameIndex, interpolated);
    }

    return interpolated;
  }

  /**
   * Get a range of frames (with interpolation)
   * 
   * @param startFrame - Start frame index (inclusive)
   * @param endFrame - End frame index (inclusive)
   * @param sourceFrames - Map of source frame index to frame data
   * @returns Array of interpolated frames
   */
  getFrameRange(
    startFrame: number,
    endFrame: number,
    sourceFrames: Map<number, any>
  ): InterpolatedFrame[] {
    if (!this.isInitialized) {
      throw new Error('Frame interpolation service not initialized');
    }

    const frames: InterpolatedFrame[] = [];

    for (let i = startFrame; i <= endFrame; i++) {
      const frame = this.getFrame(i, sourceFrames);
      if (frame) {
        frames.push(frame);
      }
    }

    return frames;
  }

  /**
   * Interpolate a single frame
   * 
   * @param frameIndex - The frame index to interpolate
   * @param sourceFrames - Map of source frame index to frame data
   * @returns Interpolated frame or null if cannot interpolate
   */
  private interpolateFrame(
    frameIndex: number,
    sourceFrames: Map<number, any>
  ): InterpolatedFrame | null {
    // Find the gap containing this frame
    const gap = FrameGapAnalyzer.findGapForFrame(frameIndex, this.gaps);
    if (!gap) {
      return null; // Frame is not in a gap
    }

    // Get source frames for interpolation
    const sourceFrameIndices = FrameGapAnalyzer.getSourceFramesForInterpolation(
      frameIndex,
      this.gaps,
      Array.from(this.sourceFrameIndices).sort((a, b) => a - b)
    );

    if (!sourceFrameIndices) {
      return null;
    }

    const beforeFrame = sourceFrames.get(sourceFrameIndices.beforeFrame);
    const afterFrame = sourceFrames.get(sourceFrameIndices.afterFrame);

    if (!beforeFrame || !afterFrame) {
      logger.warn(`Missing source frames for interpolation at frame ${frameIndex}`, {
        beforeFrame: sourceFrameIndices.beforeFrame,
        afterFrame: sourceFrameIndices.afterFrame,
        beforeExists: !!beforeFrame,
        afterExists: !!afterFrame
      });
      return null;
    }

    // Calculate interpolation factor
    const factor = FrameGapAnalyzer.getInterpolationFactor(frameIndex, gap);

    // Interpolate keypoints
    const beforeKeypoints = beforeFrame.keypoints || [];
    const afterKeypoints = afterFrame.keypoints || [];
    const interpolatedKeypoints = KeypointInterpolator.interpolateFrame(
      beforeKeypoints,
      afterKeypoints,
      factor,
      sourceFrameIndices.beforeFrame,
      sourceFrameIndices.afterFrame
    );

    // Interpolate mesh vertices
    const beforeVertices = beforeFrame.mesh_vertices_data || [];
    const afterVertices = afterFrame.mesh_vertices_data || [];
    const beforeFaces = beforeFrame.mesh_faces_data || [];
    const afterFaces = afterFrame.mesh_faces_data || [];

    const interpolatedMesh = MeshVertexInterpolator.interpolateMesh(
      beforeVertices,
      afterVertices,
      beforeFaces,
      afterFaces,
      factor,
      sourceFrameIndices.beforeFrame,
      sourceFrameIndices.afterFrame
    );

    // Interpolate camera translation if available
    let cameraTranslation = null;
    if (beforeFrame.cameraTranslation || afterFrame.cameraTranslation) {
      cameraTranslation = MeshVertexInterpolator.interpolateCameraTranslation(
        beforeFrame.cameraTranslation,
        afterFrame.cameraTranslation,
        factor
      );
    }

    // Calculate timestamp
    const fps = 60; // Default FPS, should be passed in if different
    const timestamp = frameIndex / fps;

    const interpolatedFrame: InterpolatedFrame = {
      frameIndex,
      timestamp,
      keypoints: interpolatedKeypoints,
      skeleton: beforeFrame.skeleton || afterFrame.skeleton || {},
      mesh_vertices_data: interpolatedMesh.vertices,
      mesh_faces_data: interpolatedMesh.faces,
      cameraTranslation,
      interpolated: true,
      interpolationMetadata: {
        sourceFrames: [sourceFrameIndices.beforeFrame, sourceFrameIndices.afterFrame],
        interpolationFactor: factor
      }
    };

    return interpolatedFrame;
  }

  /**
   * Get interpolation statistics
   * 
   * @returns Statistics about interpolation performance
   */
  getStatistics(): InterpolationStatistics {
    const totalCacheAccesses = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheAccesses > 0
      ? (this.cacheHits / totalCacheAccesses) * 100
      : 0;

    const averageInterpolationTime = this.interpolationTimes.length > 0
      ? this.interpolationTimes.reduce((a, b) => a + b, 0) / this.interpolationTimes.length
      : 0;

    const sourceFrameCount = this.sourceFrameIndices.size;
    const interpolatedFrameCount = this.totalVideoFrames - sourceFrameCount;
    const interpolationPercentage = this.totalVideoFrames > 0
      ? (interpolatedFrameCount / this.totalVideoFrames) * 100
      : 0;

    return {
      totalFrames: this.totalVideoFrames,
      sourceFrames: sourceFrameCount,
      interpolatedFrames: interpolatedFrameCount,
      interpolationPercentage,
      cacheHitRate,
      averageInterpolationTime
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.interpolationTimes = [];
    logger.info('Frame interpolation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
  } {
    const totalAccesses = this.cacheHits + this.cacheMisses;
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: totalAccesses > 0 ? (this.cacheHits / totalAccesses) * 100 : 0
    };
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.gaps = [];
    this.sourceFrameIndices.clear();
    this.totalVideoFrames = 0;
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.interpolationTimes = [];
    this.isInitialized = false;
    logger.info('Frame interpolation service reset');
  }
}

export default FrameInterpolationService;
