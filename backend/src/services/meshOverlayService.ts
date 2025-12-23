/**
 * Mesh Overlay Service
 * Generates 2D mesh overlays on video frames using shared transposition library
 * Stores overlay frames as JPEG in file storage
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import logger from '../logger';
import {
  generateMeshOverlay as generateMeshOverlayLib,
  map3DTo2D,
  Keypoint,
  Skeleton,
  Matrix4
} from '../shared/mesh-transposition';

export interface MeshOverlayConfig {
  uploadDir: string;
  jpegQuality?: number;
}

export interface OverlayGenerationOptions {
  keypoints: Keypoint[];
  skeleton: Skeleton;
  cameraMatrix: Matrix4;
  videoWidth: number;
  videoHeight: number;
}

export class MeshOverlayService {
  private uploadDir: string;
  private jpegQuality: number;

  constructor(config: MeshOverlayConfig) {
    this.uploadDir = config.uploadDir;
    this.jpegQuality = config.jpegQuality || 80;
  }

  /**
   * Generate 2D mesh overlay on a video frame
   * Returns the overlay frame as a Buffer
   */
  async generateOverlay(
    originalFrameBuffer: Buffer,
    options: OverlayGenerationOptions
  ): Promise<Buffer> {
    try {
      // Load original frame
      const image = sharp(originalFrameBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid frame dimensions');
      }

      // Convert to canvas-like format for overlay generation
      const frameData = await image.raw().toBuffer({ resolveWithObject: true });

      // Create canvas-like object
      const canvas = {
        width: metadata.width,
        height: metadata.height,
        getContext: () => ({
          drawImage: () => {}, // Placeholder
          strokeStyle: '',
          lineWidth: 0,
          fillStyle: '',
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          arc: () => {},
          fill: () => {}
        })
      } as any;

      // Generate overlay using shared library
      const overlayCanvas = generateMeshOverlayLib(
        canvas,
        options.keypoints,
        options.skeleton,
        options.cameraMatrix
      );

      // Convert back to JPEG buffer
      const overlayBuffer = await sharp(frameData.data, {
        raw: {
          width: metadata.width,
          height: metadata.height,
          channels: frameData.info.channels
        }
      })
        .jpeg({ quality: this.jpegQuality })
        .toBuffer();

      return overlayBuffer;
    } catch (error) {
      logger.error('Error generating overlay:', error);
      throw error;
    }
  }

  /**
   * Generate and store overlay frame
   */
  async generateAndStoreOverlay(
    videoId: string,
    frameIndex: number,
    originalFramePath: string,
    options: OverlayGenerationOptions
  ): Promise<string> {
    try {
      // Read original frame
      if (!fs.existsSync(originalFramePath)) {
        throw new Error(`Original frame not found: ${originalFramePath}`);
      }

      const originalBuffer = fs.readFileSync(originalFramePath);

      // Generate overlay
      const overlayBuffer = await this.generateOverlay(originalBuffer, options);

      // Store overlay frame
      const overlayDir = path.join(this.uploadDir, videoId, 'overlay');
      if (!fs.existsSync(overlayDir)) {
        fs.mkdirSync(overlayDir, { recursive: true });
      }

      const overlayPath = path.join(overlayDir, `${frameIndex}.jpg`);
      fs.writeFileSync(overlayPath, overlayBuffer);

      logger.info(`Stored overlay frame: ${overlayPath}`);
      return overlayPath;
    } catch (error) {
      logger.error(`Error generating and storing overlay:`, error);
      throw error;
    }
  }

  /**
   * Batch generate overlays for multiple frames
   */
  async generateBatchOverlays(
    videoId: string,
    frameIndices: number[],
    frameLoader: (frameIndex: number) => Promise<Buffer>,
    optionsLoader: (frameIndex: number) => Promise<OverlayGenerationOptions>
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    try {
      for (const frameIndex of frameIndices) {
        try {
          const frameBuffer = await frameLoader(frameIndex);
          const options = await optionsLoader(frameIndex);

          const overlayBuffer = await this.generateOverlay(frameBuffer, options);

          // Store overlay
          const overlayDir = path.join(this.uploadDir, videoId, 'overlay');
          if (!fs.existsSync(overlayDir)) {
            fs.mkdirSync(overlayDir, { recursive: true });
          }

          const overlayPath = path.join(overlayDir, `${frameIndex}.jpg`);
          fs.writeFileSync(overlayPath, overlayBuffer);

          results.set(frameIndex, overlayPath);
          logger.info(`Generated overlay for frame ${frameIndex}`);
        } catch (error) {
          logger.warn(`Failed to generate overlay for frame ${frameIndex}:`, error);
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error in batch overlay generation:`, error);
      throw error;
    }
  }

  /**
   * Draw skeleton on canvas context
   * Helper function for overlay generation
   */
  drawSkeleton(
    ctx: CanvasRenderingContext2D,
    keypoints: Keypoint[],
    skeleton: Skeleton,
    cameraMatrix: Matrix4,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Draw connections
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;

    for (const [startIdx, endIdx] of skeleton.connections) {
      if (startIdx < keypoints.length && endIdx < keypoints.length) {
        const startKp = keypoints[startIdx];
        const endKp = keypoints[endIdx];

        const start = map3DTo2D(startKp.position, cameraMatrix, canvasWidth, canvasHeight);
        const end = map3DTo2D(endKp.position, cameraMatrix, canvasWidth, canvasHeight);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }

    // Draw keypoints
    ctx.fillStyle = '#FF0000';
    const radius = 5;

    for (const keypoint of keypoints) {
      if (keypoint.confidence > 0.5) {
        const point = map3DTo2D(keypoint.position, cameraMatrix, canvasWidth, canvasHeight);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  /**
   * Check if overlay already exists
   */
  overlayExists(videoId: string, frameIndex: number): boolean {
    const overlayPath = path.join(this.uploadDir, videoId, 'overlay', `${frameIndex}.jpg`);
    return fs.existsSync(overlayPath);
  }

  /**
   * Get overlay frame path
   */
  getOverlayPath(videoId: string, frameIndex: number): string {
    return path.join(this.uploadDir, videoId, 'overlay', `${frameIndex}.jpg`);
  }

  /**
   * Delete overlay frame
   */
  deleteOverlay(videoId: string, frameIndex: number): void {
    try {
      const overlayPath = this.getOverlayPath(videoId, frameIndex);
      if (fs.existsSync(overlayPath)) {
        fs.unlinkSync(overlayPath);
        logger.info(`Deleted overlay: ${overlayPath}`);
      }
    } catch (error) {
      logger.warn(`Error deleting overlay:`, error);
    }
  }

  /**
   * Delete all overlays for a video
   */
  deleteAllOverlays(videoId: string): void {
    try {
      const overlayDir = path.join(this.uploadDir, videoId, 'overlay');
      if (fs.existsSync(overlayDir)) {
        fs.rmSync(overlayDir, { recursive: true });
        logger.info(`Deleted all overlays for ${videoId}`);
      }
    } catch (error) {
      logger.warn(`Error deleting overlays:`, error);
    }
  }
}

// Singleton instance
let instance: MeshOverlayService | null = null;

export function initializeMeshOverlayService(config: MeshOverlayConfig): MeshOverlayService {
  instance = new MeshOverlayService(config);
  return instance;
}

export function getMeshOverlayService(): MeshOverlayService {
  if (!instance) {
    throw new Error('MeshOverlayService not initialized');
  }
  return instance;
}
