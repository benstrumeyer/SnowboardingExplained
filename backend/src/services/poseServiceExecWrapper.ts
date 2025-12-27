/**
 * PoseServiceExecWrapper
 * 
 * Spawns isolated Python processes for pose detection.
 * Each request gets its own fresh process for memory isolation and crash resilience.
 */

import { spawn, ChildProcess } from 'child_process';
import logger from '../logger';

export interface PoseFrame {
  frameNumber: number;
  imageBase64?: string;      // Base64-encoded image
  imagePath?: string;        // Path to image file
}

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface PoseResult {
  frameNumber: number;
  keypoints: Keypoint[];
  has3d: boolean;
  jointAngles3d?: Record<string, number>;
  mesh_vertices_data?: number[][];
  mesh_faces_data?: number[][];
  cameraTranslation?: number[];
  processingTimeMs: number;
  error?: string;
}

export class PoseServiceExecWrapper {
  private pythonServicePath: string;
  private timeoutMs: number;
  private process: ChildProcess | null = null;
  private static lastProcessSpawnTime: number = 0;
  private static readonly MIN_SPAWN_INTERVAL_MS: number = 50; // Minimum 50ms between process spawns

  constructor(pythonServicePath: string, timeoutMs: number = 120000) {
    this.pythonServicePath = pythonServicePath;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Add a small delay between process spawns to prevent overwhelming the system.
   * This backpressure helps prevent stdin write failures when many processes spawn rapidly.
   */
  private static async _enforceSpawnInterval(): Promise<void> {
    const timeSinceLastSpawn = Date.now() - PoseServiceExecWrapper.lastProcessSpawnTime;
    if (timeSinceLastSpawn < PoseServiceExecWrapper.MIN_SPAWN_INTERVAL_MS) {
      const delayMs = PoseServiceExecWrapper.MIN_SPAWN_INTERVAL_MS - timeSinceLastSpawn;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    PoseServiceExecWrapper.lastProcessSpawnTime = Date.now();
  }

  /**
   * Spawn a Python process and get pose data for frames.
   * 
   * @param frames Array of frames to process
   * @returns Promise resolving to array of pose results
   */
  async getPoseInfo(frames: PoseFrame[]): Promise<PoseResult[]> {
    return new Promise(async (resolve, reject) => {
      try {
        // Enforce minimum spawn interval to prevent overwhelming the system
        await PoseServiceExecWrapper._enforceSpawnInterval();

        // Spawn Python process
        this.process = spawn('python', ['app.py'], {
          cwd: this.pythonServicePath,
          stdio: ['pipe', 'pipe', 'pipe'],  // stdin, stdout, stderr
          timeout: this.timeoutMs
        });

        if (!this.process) {
          reject(new Error('Failed to spawn Python process'));
          return;
        }

        // Prepare input data
        const inputData = JSON.stringify({ frames });
        let stdinWriteError: Error | null = null;

        // Handle stdin errors (e.g., when process closes stdin unexpectedly)
        this.process.stdin!.on('error', (error) => {
          stdinWriteError = error;
          logger.warn('stdin error (process may have crashed on startup)', {
            error: error.message,
            frameCount: frames.length,
            code: (error as any).code
          });
        });

        // Send frames to stdin with error handling
        try {
          this.process.stdin!.write(inputData, 'utf8', (error) => {
            if (error) {
              stdinWriteError = error;
              logger.warn('Failed to write to stdin', {
                error: error.message,
                frameCount: frames.length,
                code: (error as any).code
              });
            }
          });
          this.process.stdin!.end();
        } catch (writeError) {
          logger.error('Error writing to stdin', {
            error: writeError,
            frameCount: frames.length
          });
          reject(writeError);
          return;
        }

        // Collect stdout data
        let output = '';
        this.process.stdout!.on('data', (data) => {
          output += data.toString();
        });

        // Collect stderr for error logging
        let stderr = '';
        this.process.stderr!.on('data', (data) => {
          stderr += data.toString();
        });

        // Setup timeout
        const timeout = setTimeout(() => {
          if (this.process) {
            logger.warn('Python process timeout, killing process', {
              timeoutMs: this.timeoutMs,
              frameCount: frames.length
            });
            this.process.kill('SIGKILL');
          }
          reject(new Error(`Process timeout after ${this.timeoutMs}ms`));
        }, this.timeoutMs);

        // Handle process completion
        this.process.on('close', (code) => {
          clearTimeout(timeout);

          // If there was a stdin write error, report it
          if (stdinWriteError) {
            logger.error('Process closed after stdin write error', {
              exitCode: code,
              stdinError: stdinWriteError.message,
              stderr,
              frameCount: frames.length
            });
            reject(new Error(`stdin write failed: ${stdinWriteError.message}`));
            return;
          }

          if (code !== 0) {
            logger.error('Python process exited with error', {
              exitCode: code,
              stderr,
              frameCount: frames.length
            });
            reject(new Error(`Process exited with code ${code}: ${stderr}`));
            return;
          }

          try {
            const results = JSON.parse(output) as PoseResult[];
            logger.info('Pose detection completed', {
              frameCount: frames.length,
              successCount: results.filter(r => !r.error).length,
              errorCount: results.filter(r => r.error).length
            });
            resolve(results);
          } catch (parseError) {
            logger.error('Failed to parse Python output', {
              error: parseError,
              output: output.substring(0, 500),
              stderr
            });
            reject(new Error(`Failed to parse Python output: ${parseError}`));
          }
        });

        // Handle process errors
        this.process.on('error', (error) => {
          clearTimeout(timeout);
          logger.error('Python process error', {
            error: error.message,
            frameCount: frames.length
          });
          reject(error);
        });

      } catch (error) {
        logger.error('Failed to spawn Python process', { error });
        reject(error);
      }
    });
  }

  /**
   * Cleanup resources and ensure no zombie processes remain.
   */
  async cleanup(): Promise<void> {
    if (this.process) {
      try {
        if (!this.process.killed) {
          this.process.kill('SIGTERM');
          
          // Wait a bit for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Force kill if still running
          if (!this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }
      } catch (error) {
        logger.warn('Error during cleanup', { error });
      }
      this.process = null;
    }
  }
}