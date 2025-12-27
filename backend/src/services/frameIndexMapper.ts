import logger from '../logger';
import { FrameIndexMapping, SerializedFrameIndexMapping } from '../types';

/**
 * Frame Index Mapper Service
 * 
 * Maintains bidirectional mapping between original and processed frame indices
 * to ensure video playback stays synchronized with filtered/interpolated mesh data.
 */
class FrameIndexMapper {
  /**
   * Create a frame index mapping from filtering results
   */
  static createMapping(
    videoId: string,
    originalFrameCount: number,
    removedFrames: number[],
    interpolatedFrames: number[]
  ): FrameIndexMapping {
    const originalToProcessed = new Map<number, number>();
    const processedToOriginal = new Map<number, number>();
    const removedSet = new Set(removedFrames);
    const interpolatedSet = new Set(interpolatedFrames);

    let processedIndex = 0;

    for (let originalIndex = 0; originalIndex < originalFrameCount; originalIndex++) {
      if (!removedSet.has(originalIndex)) {
        originalToProcessed.set(originalIndex, processedIndex);
        processedToOriginal.set(processedIndex, originalIndex);
        processedIndex++;
      }
    }

    const mapping: FrameIndexMapping = {
      videoId,
      originalToProcessed,
      processedToOriginal,
      removedFrames: removedSet,
      interpolatedFrames: interpolatedSet,
      metadata: {
        originalFrameCount,
        processedFrameCount: processedIndex,
        removedCount: removedFrames.length,
        interpolatedCount: interpolatedFrames.length
      }
    };

    logger.info('Frame index mapping created', {
      videoId,
      originalFrameCount,
      processedFrameCount: processedIndex,
      removedCount: removedFrames.length,
      interpolatedCount: interpolatedFrames.length
    });

    return mapping;
  }

  /**
   * Get processed frame index from original frame index
   */
  static getProcessedIndex(mapping: FrameIndexMapping, originalIndex: number): number | undefined {
    return mapping.originalToProcessed.get(originalIndex);
  }

  /**
   * Get original frame index from processed frame index
   */
  static getOriginalIndex(mapping: FrameIndexMapping, processedIndex: number): number | undefined {
    return mapping.processedToOriginal.get(processedIndex);
  }

  /**
   * Check if a frame was removed
   */
  static isFrameRemoved(mapping: FrameIndexMapping, originalIndex: number): boolean {
    return mapping.removedFrames.has(originalIndex);
  }

  /**
   * Check if a frame was interpolated
   */
  static isFrameInterpolated(mapping: FrameIndexMapping, originalIndex: number): boolean {
    return mapping.interpolatedFrames.has(originalIndex);
  }

  /**
   * Serialize mapping for MongoDB storage
   */
  static serialize(mapping: FrameIndexMapping): SerializedFrameIndexMapping {
    return {
      videoId: mapping.videoId,
      originalToProcessed: Array.from(mapping.originalToProcessed.entries()),
      processedToOriginal: Array.from(mapping.processedToOriginal.entries()),
      removedFrames: Array.from(mapping.removedFrames),
      interpolatedFrames: Array.from(mapping.interpolatedFrames),
      metadata: mapping.metadata
    };
  }

  /**
   * Deserialize mapping from MongoDB storage
   */
  static deserialize(serialized: SerializedFrameIndexMapping): FrameIndexMapping {
    return {
      videoId: serialized.videoId,
      originalToProcessed: new Map(serialized.originalToProcessed),
      processedToOriginal: new Map(serialized.processedToOriginal),
      removedFrames: new Set(serialized.removedFrames),
      interpolatedFrames: new Set(serialized.interpolatedFrames),
      metadata: serialized.metadata
    };
  }

  /**
   * Get statistics about the mapping
   */
  static getStatistics(mapping: FrameIndexMapping) {
    const { originalFrameCount, processedFrameCount, removedCount, interpolatedCount } = mapping.metadata;

    return {
      originalFrameCount,
      processedFrameCount,
      removedCount,
      interpolatedCount,
      removalPercentage: ((removedCount / originalFrameCount) * 100).toFixed(1),
      interpolationPercentage: ((interpolatedCount / originalFrameCount) * 100).toFixed(1),
      retentionPercentage: ((processedFrameCount / originalFrameCount) * 100).toFixed(1)
    };
  }
}

export default FrameIndexMapper;
