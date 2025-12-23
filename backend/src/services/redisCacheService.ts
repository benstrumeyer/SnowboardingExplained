/**
 * Redis Cache Service
 * Manages frame caching with LRU eviction and TTL expiration
 * Ensures high cache hit rate for preloaded frames
 */

import redis from 'redis';
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
  private client: redis.RedisClient | null = null;
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
      const options: any = {
        host: this.config.host || 'localhost',
        port: this.config.port || 6379,
        db: this.config.db || 0,
        retry_strategy: (options: any) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.warn('Redis connection refused, retrying...');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      };

      if (this.config.password) {
        options.password = this.config.password;
      }

      this.client = redis.createClient(options);

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
      });

      // Configure Redis for LRU eviction
      if (this.config.maxMemory) {
        this.client.config('SET', 'maxmemory', this.config.maxMemory, (err) => {
          if (err) logger.warn('Failed to set maxmemory:', err);
        });
      }

      if (this.config.maxMemoryPolicy) {
        this.client.config('SET', 'maxmemory-policy', this.config.maxMemoryPolicy, (err) => {
          if (err) logger.warn('Failed to set maxmemory-policy:', err);
        });
      }

      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Redis client not initialized'));
          return;
        }
        this.client.ping((err, reply) => {
          if (err) reject(err);
          else {
            logger.info('Redis ping successful:', reply);
            resolve();
          }
        });
      });
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
      const data = await this.getAsync(key);

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

      await this.setexAsync(key, this.FRAME_TTL, base64Data);
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
      const preloadPromises = [];

      for (let i = 0; i < this.PRELOAD_COUNT; i++) {
        const frameIndex = startFrame + i;
        preloadPromises.push(
          frameLoader(frameIndex)
            .then(data => {
              if (data) {
                return this.setFrame(videoId, frameIndex, data);
              }
            })
            .catch(err => {
              logger.warn(`Failed to preload frame ${frameIndex}:`, err);
            })
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
        await this.delAsync(key);
        logger.info(`Cleared cache for ${key}`);
      } else {
        // Clear all frames for video
        const pattern = `video:${videoId}:frame:*`;
        await this.delPatternAsync(pattern);
        logger.info(`Cleared all cache for ${videoId}`);
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
      await new Promise<void>((resolve) => {
        this.client?.quit(() => {
          logger.info('Redis disconnected');
          resolve();
        });
      });
    }
  }

  /**
   * Helper: Generate cache key
   */
  private getCacheKey(videoId: string, frameIndex: number): string {
    return `video:${videoId}:frame:${frameIndex}`;
  }

  /**
   * Helper: Promisified Redis GET
   */
  private getAsync(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Redis client not initialized'));
        return;
      }
      this.client.get(key, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Helper: Promisified Redis SETEX
   */
  private setexAsync(key: string, ttl: number, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Redis client not initialized'));
        return;
      }
      this.client.setex(key, ttl, value, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Helper: Promisified Redis DEL
   */
  private delAsync(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Redis client not initialized'));
        return;
      }
      this.client.del(key, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Helper: Delete all keys matching pattern
   */
  private delPatternAsync(pattern: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Redis client not initialized'));
        return;
      }
      this.client.keys(pattern, (err, keys) => {
        if (err) {
          reject(err);
          return;
        }
        if (keys.length === 0) {
          resolve();
          return;
        }
        this.client!.del(...keys, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
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
