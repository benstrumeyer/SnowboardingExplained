/**
 * Redis Cache Service
 * Manages frame caching with LRU eviction and TTL expiration
 * Ensures high cache hit rate for preloaded frames
 */

import { createClient, RedisClientType } from 'redis';
import logger from '../logger';

export interface RedisCacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxMemory?: string; // e.g., "256mb"
  maxMemoryPolicy?: string; // e.g., "allkeys-lru"
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalFramesCached: number;
}

export class RedisCacheService {
  private client: RedisClientType | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalFramesCached: 0
  };
  private readonly FRAME_TTL = 3600; // 1 hour
  private readonly PRELOAD_COUNT = 10;

  constructor(private config: RedisCacheConfig = {}) {}

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      const url = `redis://${this.config.host || 'localhost'}:${this.config.port || 6379}`;
      
      this.client = createClient({
        url,
        password: this.config.password,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      }) as RedisClientType;

      this.client.on('error', (err: Error) => {
        logger.error('Redis error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
      });

      await this.client.connect();

      // Configure Redis for LRU eviction
      if (this.config.maxMemory) {
        try {
          await this.client.configSet('maxmemory', this.config.maxMemory);
        } catch (err) {
          logger.warn('Failed to set maxmemory:', err);
        }
      }

      if (this.config.maxMemoryPolicy) {
        try {
          await this.client.configSet('maxmemory-policy', this.config.maxMemoryPolicy);
        } catch (err) {
          logger.warn('Failed to set maxmemory-policy:', err);
        }
      }

      const pong = await this.client.ping();
      logger.info('Redis ping successful:', pong);
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get frame from cache
   */
  async getFrame(videoId: string, frameIndex: number): Promise<Buffer | null> {
    if (!this.client) {
      this.stats.misses++;
      return null;
    }

    try {
      const key = this.getCacheKey(videoId, frameIndex);
      const data = await this.client.get(key);

      if (data) {
        this.stats.hits++;
        logger.debug(`Cache hit: ${key}`);
        return Buffer.from(data, 'base64');
      } else {
        this.stats.misses++;
        logger.debug(`Cache miss: ${key}`);
        return null;
      }
    } catch (error) {
      logger.warn(`Error getting frame from cache:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set frame in cache
   */
  async setFrame(videoId: string, frameIndex: number, data: Buffer): Promise<void> {
    if (!this.client) return;

    try {
      const key = this.getCacheKey(videoId, frameIndex);
      const base64Data = data.toString('base64');

      await this.client.setEx(key, this.FRAME_TTL, base64Data);
      this.stats.totalFramesCached++;
      logger.debug(`Cached frame: ${key}`);
    } catch (error) {
      logger.warn(`Error setting frame in cache:`, error);
    }
  }

  /**
   * Preload next N frames
   */
  async preloadFrames(
    videoId: string,
    startFrame: number,
    frameLoader: (frameIndex: number) => Promise<Buffer | null>
  ): Promise<void> {
    if (!this.client) return;

    try {
      const preloadPromises: Promise<void>[] = [];

      for (let i = 0; i < this.PRELOAD_COUNT; i++) {
        const frameIndex = startFrame + i;
        preloadPromises.push(
          (async () => {
            try {
              const data = await frameLoader(frameIndex);
              if (data) {
                await this.setFrame(videoId, frameIndex, data);
              }
            } catch (err) {
              logger.warn(`Failed to preload frame ${frameIndex}:`, err);
            }
          })()
        );
      }

      await Promise.all(preloadPromises);
      logger.info(`Preloaded ${this.PRELOAD_COUNT} frames for ${videoId}`);
    } catch (error) {
      logger.error(`Error preloading frames:`, error);
    }
  }

  /**
   * Clear cache for specific frame or all frames of a video
   */
  async clearCache(videoId: string, frameIndex?: number): Promise<void> {
    if (!this.client) return;

    try {
      if (frameIndex !== undefined) {
        const key = this.getCacheKey(videoId, frameIndex);
        await this.client.del(key);
        logger.info(`Cleared cache for ${key}`);
      } else {
        // Clear all frames for video
        const pattern = `video:${videoId}:frame:*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          logger.info(`Cleared ${keys.length} cache entries for ${videoId}`);
        }
      }
    } catch (error) {
      logger.warn(`Error clearing cache:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalFramesCached: 0
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  /**
   * Helper: Generate cache key
   */
  private getCacheKey(videoId: string, frameIndex: number): string {
    return `video:${videoId}:frame:${frameIndex}`;
  }
}

// Singleton instance
let instance: RedisCacheService | null = null;

export async function initializeRedisCache(config?: RedisCacheConfig): Promise<RedisCacheService> {
  instance = new RedisCacheService(config);
  await instance.connect();
  return instance;
}

export function getRedisCache(): RedisCacheService {
  if (!instance) {
    throw new Error('Redis cache not initialized');
  }
  return instance;
}
