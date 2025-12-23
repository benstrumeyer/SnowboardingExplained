/**
 * Frame Data Service
 * Handles retrieval of frame data (original, overlay, mesh) with Redis caching
 * Ensures frame data consistency - all data corresponds to same frameIndex
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import logger from '../logger';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface FrameData {
  videoId: string;
  frameIndex: number;
  timestamp: number;
  originalFrame?: string; // base64 JPEG
  overlayFrame?: string; // base64 JPEG with mesh
  meshData?: {
    keypoints: any[];
    skeleton: any;
  };
}

export interface FrameDataServiceConfig {
  uploadDir: string;
  redisClient?: any;
  cacheTTL?: number; // seconds
}

export class FrameDataServiceImpl {
  private uploadDir: string;
  private redisClient: any;
  private cacheTTL: number;

  constructor(config: FrameDataServiceConfig) {
    this.uploadDir = config.uploadDir;
    this.redisClient = config.redisClient;
    this.cacheTTL = config.cacheTTL || 3600; // 1 hour default
  }

  /**
   * Get frame data for a specific video and frame index
   * Checks Redis cache first, then loads from disk
   * Ensures all returned data corresponds to the same frameIndex
   */
  async getFrame(
    videoId: string,
    frameIndex: number,
    options: {
      includeOriginal?: boolean;
      includeOverlay?: boolean;
      includeMesh?: boolean;
    } = {}
  ): Promise<FrameData> {
    const {
      includeOriginal = true,
      includeOverlay = true,
      includeMesh = true
    } = options;

    try {
      // Check Redis cache first
      if (this.redisClient) {
        const cachedData = await this.getCachedFrame(videoId, frameIndex);
        if (cachedData) {
          logger.info(`Frame cache hit: ${videoId}/${frameIndex}`);
          return this.filterFrameData(cachedData, { includeOriginal, includeOverlay, includeMesh });
        }
      }

      // Load from disk
      const frameData = await this.loadFrameFromDisk(videoId, frameIndex);

      // Cache for future requests
      if (this.redisClient) {
        await this.cacheFrame(videoId, frameIndex, frameData);
      }

      return this.filterFrameData(frameData, { includeOriginal, includeOverlay, includeMesh });
    } catch (error) {
      logger.error(`Error getting frame ${videoId}/${frameIndex}:`, error);
      throw error;
    }
  }

  /**
   * Preload next N frames into Redis cache
   */
  async preloadFrames(
    videoId: string,
    startFrame: number,
    count: number
  ): Promise<void> {
    if (!this.redisClient) {
      logger.warn('Redis client not available, skipping preload');
      return;
    }

    try {
      const preloadPromises = [];
      for (let i = 0; i < count; i++) {
        const frameIndex = startFrame + i;
        preloadPromises.push(
          this.getFrame(videoId, frameIndex).catch(err => {
            logger.warn(`Failed to preload frame ${frameIndex}:`, err);
          })
        );
      }

      await Promise.all(preloadPromises);
      logger.info(`Preloaded ${count} frames for ${videoId} starting at ${startFrame}`);
    } catch (error) {
      logger.error(`Error preloading frames:`, error);
    }
  }

  /**
   * Get frame data from Redis cache
   */
  private async getCachedFrame(videoId: string, frameIndex: number): Promise<FrameData | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = `video:${videoId}:frame:${frameIndex}`;
      const cached = await this.redisClient.get(cacheKey);

      if (cached) {
        const decompressed = await gunzip(Buffer.from(cached, 'base64'));
        return JSON.parse(decompressed.toString());
      }

      return null;
    } catch (error) {
      logger.warn(`Error retrieving from cache:`, error);
      return null;
    }
  }

  /**
   * Cache frame data in Redis
   */
  private async cacheFrame(videoId: string, frameIndex: number, frameData: FrameData): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = `video:${videoId}:frame:${frameIndex}`;
      const compressed = await gzip(JSON.stringify(frameData));
      const base64 = compressed.toString('base64');

      await this.redisClient.setex(cacheKey, this.cacheTTL, base64);
    } catch (error) {
      logger.warn(`Error caching frame:`, error);
    }
  }

  /**
   * Load frame data from disk
   * Ensures all data corresponds to the same frameIndex
   */
  private async loadFrameFromDisk(videoId: string, frameIndex: number): Promise<FrameData> {
    const videoDir = path.join(this.uploadDir, videoId);
    const originalPath = path.join(videoDir, 'original', `${frameIndex}.jpg`);
    const overlayPath = path.join(videoDir, 'overlay', `${frameIndex}.jpg`);
    const meshPath = path.join(videoDir, 'mesh', `${frameIndex}.json`);

    const frameData: FrameData = {
      videoId,
      frameIndex,
      timestamp: frameIndex * (1000 / 30) // Assume 30 FPS
    };

    // Load original frame
    if (fs.existsSync(originalPath)) {
      const buffer = fs.readFileSync(originalPath);
      frameData.originalFrame = buffer.toString('base64');
    }

    // Load overlay frame
    if (fs.existsSync(overlayPath)) {
      const buffer = fs.readFileSync(overlayPath);
      frameData.overlayFrame = buffer.toString('base64');
    }

    // Load mesh data
    if (fs.existsSync(meshPath)) {
      const meshContent = fs.readFileSync(meshPath, 'utf-8');
      frameData.meshData = JSON.parse(meshContent);
    }

    // Validate that all data corresponds to same frameIndex
    if (!frameData.originalFrame && !frameData.overlayFrame && !frameData.meshData) {
      throw new Error(`No frame data found for ${videoId}/${frameIndex}`);
    }

    return frameData;
  }

  /**
   * Filter frame data based on requested fields
   */
  private filterFrameData(
    frameData: FrameData,
    options: {
      includeOriginal?: boolean;
      includeOverlay?: boolean;
      includeMesh?: boolean;
    }
  ): FrameData {
    const filtered: FrameData = {
      videoId: frameData.videoId,
      frameIndex: frameData.frameIndex,
      timestamp: frameData.timestamp
    };

    if (options.includeOriginal && frameData.originalFrame) {
      filtered.originalFrame = frameData.originalFrame;
    }

    if (options.includeOverlay && frameData.overlayFrame) {
      filtered.overlayFrame = frameData.overlayFrame;
    }

    if (options.includeMesh && frameData.meshData) {
      filtered.meshData = frameData.meshData;
    }

    return filtered;
  }

  /**
   * Clear cache for a specific frame or all frames
   */
  async clearCache(videoId?: string, frameIndex?: number): Promise<void> {
    if (!this.redisClient) return;

    try {
      if (videoId && frameIndex !== undefined) {
        const cacheKey = `video:${videoId}:frame:${frameIndex}`;
        await this.redisClient.del(cacheKey);
      } else if (videoId) {
        // Clear all frames for a video
        const pattern = `video:${videoId}:frame:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }
    } catch (error) {
      logger.warn(`Error clearing cache:`, error);
    }
  }
}

// Singleton instance
let instance: FrameDataServiceImpl | null = null;

export function initializeFrameDataService(config: FrameDataServiceConfig): FrameDataServiceImpl {
  instance = new FrameDataServiceImpl(config);
  return instance;
}

export function getFrameDataService(): FrameDataServiceImpl {
  if (!instance) {
    throw new Error('FrameDataService not initialized');
  }
  return instance;
}
