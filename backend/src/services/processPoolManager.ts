/**
 * ProcessPoolManager
 * 
 * Manages a pool of Python processes for pose detection.
 * Enforces concurrency limits and queues excess requests.
 */

import logger from '../logger';
import { PoseServiceExecWrapper, PoseFrame, PoseResult } from './poseServiceExecWrapper';

export interface PoolConfig {
  pythonServicePath: string;
  maxConcurrentProcesses?: number;
  queueMaxSize?: number;
  processTimeoutMs?: number;
  debug?: boolean;
}

export interface PoolStatus {
  activeProcesses: number;
  queuedRequests: number;
  totalProcessed: number;
  totalErrors: number;
  uptime: number;
}

interface QueuedRequest {
  frames: PoseFrame[];
  resolve: (results: PoseResult[]) => void;
  reject: (error: Error) => void;
}

export class ProcessPoolManager {
  private pythonServicePath: string;
  private maxConcurrentProcesses: number;
  private queueMaxSize: number;
  private processTimeoutMs: number;
  private debug: boolean;

  private activeProcesses: number = 0;
  private queue: QueuedRequest[] = [];
  private totalProcessed: number = 0;
  private totalErrors: number = 0;
  private acceptingRequests: boolean = true;
  private startTime: number = Date.now();

  constructor(config: PoolConfig) {
    this.pythonServicePath = config.pythonServicePath;
    this.maxConcurrentProcesses = config.maxConcurrentProcesses || 2;
    this.queueMaxSize = config.queueMaxSize || 100;
    this.processTimeoutMs = config.processTimeoutMs || 120000;
    this.debug = config.debug || false;

    logger.info('ProcessPoolManager initialized', {
      pythonServicePath: this.pythonServicePath,
      maxConcurrentProcesses: this.maxConcurrentProcesses,
      queueMaxSize: this.queueMaxSize,
      processTimeoutMs: this.processTimeoutMs
    });
  }

  /**
   * Process a request (spawn process or queue if at capacity).
   * 
   * @param frames Array of frames to process
   * @returns Promise resolving to array of pose results
   */
  async processRequest(frames: PoseFrame[]): Promise<PoseResult[]> {
    if (!this.acceptingRequests) {
      throw new Error('Pool is shutting down, not accepting new requests');
    }

    // Check if at capacity
    if (this.activeProcesses >= this.maxConcurrentProcesses) {
      // Queue the request
      return new Promise((resolve, reject) => {
        if (this.queue.length >= this.queueMaxSize) {
          reject(new Error(`Queue full (max ${this.queueMaxSize} requests)`));
        } else {
          this.queue.push({ frames, resolve, reject });
          if (this.debug) {
            logger.debug('Request queued', {
              queueSize: this.queue.length,
              frameCount: frames.length
            });
          }
        }
      });
    }

    // Spawn process
    return this._spawnAndProcess(frames);
  }

  /**
   * Internal method to spawn a process and handle the request.
   */
  private async _spawnAndProcess(frames: PoseFrame[]): Promise<PoseResult[]> {
    this.activeProcesses++;

    try {
      const wrapper = new PoseServiceExecWrapper(
        this.pythonServicePath,
        this.processTimeoutMs
      );

      const results = await wrapper.getPoseInfo(frames);
      this.totalProcessed++;

      // Count errors
      const errorCount = results.filter(r => r.error).length;
      if (errorCount > 0) {
        this.totalErrors += errorCount;
      }

      if (this.debug) {
        logger.debug('Process completed', {
          frameCount: frames.length,
          successCount: results.filter(r => !r.error).length,
          errorCount
        });
      }

      return results;
    } catch (error) {
      this.totalErrors++;
      logger.error('Process failed', {
        error: error instanceof Error ? error.message : String(error),
        frameCount: frames.length
      });
      throw error;
    } finally {
      this.activeProcesses--;
      // Process next queued request
      this._processNextQueued();
    }
  }

  /**
   * Process the next queued request if available.
   */
  private _processNextQueued(): void {
    if (
      this.queue.length > 0 &&
      this.activeProcesses < this.maxConcurrentProcesses &&
      this.acceptingRequests
    ) {
      const { frames, resolve, reject } = this.queue.shift()!;

      if (this.debug) {
        logger.debug('Processing queued request', {
          queueSize: this.queue.length,
          frameCount: frames.length
        });
      }

      this._spawnAndProcess(frames)
        .then(resolve)
        .catch(reject);
    }
  }

  /**
   * Get current pool status.
   */
  getStatus(): PoolStatus {
    return {
      activeProcesses: this.activeProcesses,
      queuedRequests: this.queue.length,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Gracefully shutdown the pool.
   * Waits for in-flight processes to complete before returning.
   */
  async shutdown(): Promise<void> {
    logger.info('ProcessPoolManager shutting down...');

    // Stop accepting new requests
    this.acceptingRequests = false;

    // Reject all queued requests
    while (this.queue.length > 0) {
      const { reject } = this.queue.shift()!;
      reject(new Error('Pool is shutting down'));
    }

    // Wait for in-flight processes to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeProcesses > 0) {
      if (Date.now() - startTime > shutdownTimeout) {
        logger.warn('Shutdown timeout exceeded, forcing termination', {
          activeProcesses: this.activeProcesses
        });
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('ProcessPoolManager shutdown complete', {
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      uptime: Date.now() - this.startTime
    });
  }
}
