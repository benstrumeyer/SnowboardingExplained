import logger from '../logger';
import { FrameExtractionService } from './frameExtraction';
import { meshDataService } from './meshDataService';

/**
 * Frame index mapping: maps mesh frame index to original video information
 */
export interface FrameIndexMapping {
  [meshFrameIndex: number]: {
    timestamp: number;
    originalFrameNumber: number;
  };
}

/**
 * Result of video extraction with mesh alignment
 */
export interface VideoExtractionResult {
  videoId: string;
  extractedFrames: number;
  frameIndexMapping: FrameIndexMapping;
  storageLocation: string;
  meshAligned: boolean;
}

/**
 * VideoExtractionService handles extracting video frames aligned with mesh frame indices
 * 
 * Key principle: Instead of extracting all frames sequentially (0, 1, 2, 3...),
 * this service queries the mesh service to find which frame indices have mesh data,
 * then extracts ONLY those frames and stores them with the mesh frame indices.
 * This ensures frame N in video storage corresponds to frame N in mesh storage.
 */
export class VideoExtractionService {
  /**
   * Get mesh frame indices from the mesh data service
   * 
   * @param videoId - Video ID to get mesh frame indices for
   * @returns Array of frame indices that have mesh data
   */
  static async getMeshFrameIndices(videoId: string): Promise<number[]> {
    try {
      const meshData = await meshDataService.getMeshData(videoId);
      
      if (!meshData || !meshData.frames || meshData.frames.length === 0) {
        logger.warn(`No mesh data found for video: ${videoId}`, { videoId });
        return [];
      }

      // Extract frame indices from mesh data
      const frameIndices = meshData.frames.map((frame: any) => frame.frameIndex);
      
      logger.info(`Retrieved mesh frame indices for video: ${videoId}`, {
        videoId,
        frameCount: frameIndices.length,
        indices: frameIndices.slice(0, 10) // Log first 10 for debugging
      });

      return frameIndices;
    } catch (err) {
      logger.error(`Failed to get mesh frame indices for video: ${videoId}`, {
        videoId,
        error: err
      });
      throw err;
    }
  }

  /**
   * Extract video frames at specific mesh indices for automatic alignment
   * 
   * This is the core method that ensures video and mesh frames are aligned.
   * It queries the mesh service for frame indices, then extracts ONLY those frames.
   * 
   * @param videoPath - Path to video file
   * @param videoId - Video ID for caching
   * @param fps - Frames per second (used if mesh indices not available)
   * @returns VideoExtractionResult with frame mapping
   */
  static async extractFramesAtMeshIndices(
    videoPath: string,
    videoId: string,
    fps: number = 4
  ): Promise<VideoExtractionResult> {
    try {
      logger.info(`Starting mesh-aligned frame extraction for video: ${videoId}`, {
        videoId,
        videoPath,
        fps
      });

      // Get mesh frame indices
      const meshFrameIndices = await this.getMeshFrameIndices(videoId);

      if (meshFrameIndices.length === 0) {
        logger.warn(`No mesh frame indices found for video: ${videoId}, falling back to standard extraction`, {
          videoId
        });
        
        // Fall back to standard extraction if no mesh data
        const result = await FrameExtractionService.extractFrames(videoPath, videoId, fps);
        
        return {
          videoId,
          extractedFrames: result.frameCount,
          frameIndexMapping: {},
          storageLocation: videoPath,
          meshAligned: false
        };
      }

      logger.info(`Extracting ${meshFrameIndices.length} frames at mesh indices for video: ${videoId}`, {
        videoId,
        frameCount: meshFrameIndices.length,
        indices: meshFrameIndices.slice(0, 10)
      });

      // Extract frames at specific mesh indices
      const result = await FrameExtractionService.extractFrames(
        videoPath,
        videoId,
        fps,
        meshFrameIndices // Pass mesh indices to extract only those frames
      );

      // Generate frame index mapping
      const frameIndexMapping = this.generateFrameIndexMapping(
        meshFrameIndices,
        result.fps,
        result.videoDuration
      );

      logger.info(`Mesh-aligned frame extraction completed for video: ${videoId}`, {
        videoId,
        extractedFrames: result.frameCount,
        meshAligned: true,
        fps: result.fps,
        duration: result.videoDuration
      });

      return {
        videoId,
        extractedFrames: result.frameCount,
        frameIndexMapping,
        storageLocation: videoPath,
        meshAligned: true
      };
    } catch (err) {
      logger.error(`Mesh-aligned frame extraction failed for video: ${videoId}`, {
        videoId,
        error: err
      });
      throw err;
    }
  }

  /**
   * Generate frame index mapping from mesh indices
   * Maps mesh frame index to original video timestamp and frame number
   * 
   * @param meshFrameIndices - Array of frame indices that have mesh data
   * @param fps - Frames per second of the video
   * @param videoDuration - Total duration of the video in seconds
   * @returns FrameIndexMapping object
   */
  static generateFrameIndexMapping(
    meshFrameIndices: number[],
    fps: number,
    videoDuration: number
  ): FrameIndexMapping {
    const mapping: FrameIndexMapping = {};

    meshFrameIndices.forEach((originalFrameIndex, meshFrameIndex) => {
      mapping[meshFrameIndex] = {
        timestamp: originalFrameIndex / fps,
        originalFrameNumber: originalFrameIndex
      };
    });

    logger.debug(`Generated frame index mapping for ${meshFrameIndices.length} frames`, {
      fps,
      videoDuration,
      mappingSize: Object.keys(mapping).length
    });

    return mapping;
  }

  /**
   * Verify that video and mesh frames are aligned
   * Checks that frame N in video storage corresponds to frame N in mesh storage
   * 
   * @param videoId - Video ID to verify
   * @returns true if aligned, false otherwise
   */
  static async verifyFrameAlignment(videoId: string): Promise<boolean> {
    try {
      const meshData = await meshDataService.getMeshData(videoId);
      
      if (!meshData || !meshData.frames) {
        logger.warn(`No mesh data found for verification: ${videoId}`, { videoId });
        return false;
      }

      // Get cached video frames
      const videoFrames = FrameExtractionService.getCachedFrames(videoId);
      
      if (!videoFrames) {
        logger.warn(`No video frames found for verification: ${videoId}`, { videoId });
        return false;
      }

      // Check that frame counts match
      if (videoFrames.frameCount !== meshData.frames.length) {
        logger.error(`Frame count mismatch for video: ${videoId}`, {
          videoId,
          videoFrameCount: videoFrames.frameCount,
          meshFrameCount: meshData.frames.length
        });
        return false;
      }

      // Check that timestamps match (within tolerance)
      const TIMESTAMP_TOLERANCE = 0.1; // 100ms tolerance
      let mismatchCount = 0;

      for (let i = 0; i < videoFrames.frames.length; i++) {
        const videoFrame = videoFrames.frames[i];
        const meshFrame = meshData.frames[i];

        const timeDiff = Math.abs(videoFrame.timestamp - meshFrame.timestamp);
        if (timeDiff > TIMESTAMP_TOLERANCE) {
          mismatchCount++;
          logger.warn(`Timestamp mismatch at frame ${i}`, {
            videoTimestamp: videoFrame.timestamp,
            meshTimestamp: meshFrame.timestamp,
            difference: timeDiff
          });
        }
      }

      if (mismatchCount > 0) {
        logger.error(`Frame alignment verification failed for video: ${videoId}`, {
          videoId,
          mismatchCount,
          totalFrames: videoFrames.frameCount
        });
        return false;
      }

      logger.info(`Frame alignment verified for video: ${videoId}`, {
        videoId,
        frameCount: videoFrames.frameCount
      });

      return true;
    } catch (err) {
      logger.error(`Frame alignment verification error for video: ${videoId}`, {
        videoId,
        error: err
      });
      return false;
    }
  }
}
