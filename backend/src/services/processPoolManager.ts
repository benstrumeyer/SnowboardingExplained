/**
 * ProcessPoolManager
 * 
 * Manages a pool of pose detection requests.
 * Can use either:
 * - PoseServiceExecWrapper: Spawns local Python processes
 * - PoseServiceHttpWrapper: Sends HTTP requests to external service
 * 
 * Enforces concurrency limits and queues excess requests.
 */

import logger from '../logger';
import { PoseServiceExecWrapper, PoseFrame, PoseResult } from './poseServiceExecWrapper';
import { PoseServiceHttpWrapper } from './poseServiceHttpWrapper';

export interface PoolConfig {
  pythonServicePath?: string;
  useHttpService?: boolean;  // If true, use HTTP wrapper instead of process spawning
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
  private useHttpService: boolean;
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
    this.pythonServicePath = config.pythonServicePath || '';
    this.useHttpService = config.useHttpService || false;
    this.maxConcurrentProcesses = config.maxConcurrentProcesses || 2;
    this.queueMaxSize = config.queueMaxSize || 100;
    this.processTimeoutMs = config.processTimeoutMs || 120000;
    this.debug = config.debug || false;

    logger.info('ProcessPoolManager initialized', {
      mode: this.useHttpService ? 'HTTP' : 'Process',
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
    console.log(`[POOL-MANAGER] processRequest called with ${frames.length} frames`);
    console.log(`[POOL-MANAGER] Current state: activeProcesses=${this.activeProcesses}, queueSize=${this.queue.length}, maxConcurrent=${this.maxConcurrentProcesses}`);
    
    if (!this.acceptingRequests) {
      console.error(`[POOL-MANAGER] Pool is shutting down, rejecting request`);
      throw new Error('Pool is shutting down, not accepting new requests');
    }

    // Check if at capacity
    if (this.activeProcesses >= this.maxConcurrentProcesses) {
      console.log(`[POOL-MANAGER] At capacity (${this.activeProcesses}/${this.maxConcurrentProcesses}), queueing request`);
      // Queue the request
      return new Promise((resolve, reject) => {
        if (this.queue.length >= this.queueMaxSize) {
          console.error(`[POOL-MANAGER] Queue full! Size: ${this.queue.length}/${this.queueMaxSize}`);
          reject(new Error(`Queue full (max ${this.queueMaxSize} requests)`));
        } else {
          this.queue.push({ frames, resolve, reject });
          console.log(`[POOL-MANAGER] Request queued. Queue size now: ${this.queue.length}`);
          if (this.debug) {
            logger.debug('Request queued', {
              queueSize: this.queue.length,
              frameCount: frames.length
            });
          }
        }
      });
    }

    console.log(`[POOL-MANAGER] Spawning process for ${frames.length} frames`);
    // Spawn process
    return this._spawnAndProcess(frames);
  }

  /**
   * Internal method to spawn a process or send HTTP request and handle the request.
   */
  private async _spawnAndProcess(frames: PoseFrame[]): Promise<PoseResult[]> {
    this.activeProcesses++;
    console.log(`[POOL-MANAGER] _spawnAndProcess: activeProcesses now ${this.activeProcesses}`);

    try {
      let wrapper: PoseServiceExecWrapper | PoseServiceHttpWrapper;

      if (this.useHttpService) {
        console.log(`[POOL-MANAGER] Creating HTTP wrapper for ${frames.length} frames`);
        // Use HTTP wrapper for external service
        wrapper = new PoseServiceHttpWrapper() as any;
      } else {
        console.log(`[POOL-MANAGER] Creating process wrapper for ${frames.length} frames`);
        // Use process wrapper for local spawning
        wrapper = new PoseServiceExecWrapper(
          this.pythonServicePath,
          this.processTimeoutMs
        );
      }

      console.log(`[POOL-MANAGER] Calling wrapper.getPoseInfo() with ${frames.length} frames`);
      const results = await wrapper.getPoseInfo(frames);
      console.log(`[POOL-MANAGER] wrapper.getPoseInfo() returned ${results.length} results`);
      
      this.totalProcessed++;

      // Count errors
      const errorCount = results.filter(r => r.error).length;
      if (errorCount > 0) {
        this.totalErrors += errorCount;
      }

      if (this.debug) {
        logger.debug('Request completed', {
          mode: this.useHttpService ? 'HTTP' : 'Process',
          frameCount: frames.length,
          successCount: results.filter(r => !r.error).length,
          errorCount
        });
      }

      return results;
    } catch (error) {
      this.totalErrors++;
      console.error(`[POOL-MANAGER] Error in _spawnAndProcess:`, error);
      logger.error('Request failed', {
        mode: this.useHttpService ? 'HTTP' : 'Process',
        error: error instanceof Error ? error.message : String(error),
        frameCount: frames.length
      });
      throw error;
    } finally {
      this.activeProcesses--;
      console.log(`[POOL-MANAGER] _spawnAndProcess complete: activeProcesses now ${this.activeProcesses}`);
      // Process next queued request
      this._processNextQueued();
    }
  }

  /**
   * Process the next queued request if available.
   */
  private _processNextQueued(): void {
    console.log(`[POOL-MANAGER] _processNextQueued: queue=${this.queue.length}, active=${this.activeProcesses}, max=${this.maxConcurrentProcesses}, accepting=${this.acceptingRequests}`);
    
    if (
      this.queue.length > 0 &&
      this.activeProcesses < this.maxConcurrentProcesses &&
      this.acceptingRequests
    ) {
      const { frames, resolve, reject } = this.queue.shift()!;
      console.log(`[POOL-MANAGER] Processing queued request with ${frames.length} frames. Queue now: ${this.queue.length}`);

      if (this.debug) {
        logger.debug('Processing queued request', {
          queueSize: this.queue.length,
          frameCount: frames.length
        });
      }

      this._spawnAndProcess(frames)
        .then(resolve)
        .catch(reject);
    } else {
      console.log(`[POOL-MANAGER] Cannot process next queued: queue=${this.queue.length}, active=${this.activeProcesses}, max=${this.maxConcurrentProcesses}, accepting=${this.acceptingRequests}`);
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
