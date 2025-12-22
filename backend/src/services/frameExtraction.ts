import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import logger from '../logger';
import { FrameExtractionResult } from '../types';
import { meshDataService } from './meshDataService';

// Import static ffmpeg/ffprobe paths
import ffmpegStatic from 'ffmpeg-static';
const ffprobeStatic = require('ffprobe-static');

const FRAMES_PER_SECOND = 4;
const TEMP_DIR = path.join(__dirname, '../../temp/frames');

// Set ffmpeg and ffprobe paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export class FrameExtractionService {
  /**
   * Normalize frame rate between multiple videos
   * If videos have different FPS, use the lowest common FPS
   */
  static normalizeFrameRates(videoFpsArray: number[]): number {
    if (videoFpsArray.length === 0) return FRAMES_PER_SECOND;
    if (videoFpsArray.length === 1) return videoFpsArray[0];
    
    // Return the minimum FPS to ensure compatibility
    const minFps = Math.min(...videoFpsArray);
    logger.info(`Normalized frame rates: ${videoFpsArray.join(', ')} -> ${minFps} FPS`);
    return minFps;
  }

  /**
   * Extract frames from video at specified FPS
   * Checks MongoDB cache first before extracting
   */
  static async extractFrames(videoPath: string, videoId: string, fps: number = FRAMES_PER_SECOND): Promise<FrameExtractionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check MongoDB cache first
        const cachedMeshData = await meshDataService.getMeshData(videoId);
        if (cachedMeshData) {
          logger.info(`Found cached mesh data in MongoDB for video: ${videoId}`, {
            videoId,
            frameCount: cachedMeshData.frameCount,
            fps: cachedMeshData.fps
          });

          // Convert MongoDB mesh data back to frame extraction format
          const frames = cachedMeshData.frames.map((frame: any) => ({
            frameNumber: frame.frameNumber,
            timestamp: frame.timestamp,
            imagePath: path.join(TEMP_DIR, videoId, `frame-${frame.frameNumber + 1}.png`)
          }));

          return resolve({
            frameCount: cachedMeshData.frameCount,
            videoDuration: cachedMeshData.videoDuration,
            fps: cachedMeshData.fps,
            frames,
            cacheHit: true
          });
        }

        // Check local filesystem cache
        const localCache = FrameExtractionService.getCachedFrames(videoId);
        if (localCache) {
          logger.info(`Found cached frames locally for video: ${videoId}`, {
            videoId,
            frameCount: localCache.frameCount
          });
          return resolve(localCache);
        }

        // Extract frames if not cached
        const outputDir = path.join(TEMP_DIR, videoId);
        const framesPerSecond = fps || FRAMES_PER_SECOND;
        
        console.log(`[FRAME_EXTRACTION] 🎬 Starting extraction for ${videoId}`);
        console.log(`[FRAME_EXTRACTION] 📁 Output dir: ${outputDir}`);
        console.log(`[FRAME_EXTRACTION] 📊 FPS: ${framesPerSecond}`);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`[FRAME_EXTRACTION] ✅ Created output directory`);
        }

        logger.info(`Starting frame extraction for video: ${videoId}`, {
          videoPath,
          outputDir,
          fps: framesPerSecond
        });

        // Get video metadata to calculate total frames needed
        ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
          if (err) {
            logger.error(`Failed to get video metadata: ${err.message}`, { videoId });
            reject(err);
            return;
          }

          const duration = metadata.format.duration || 0;
          const totalFrames = Math.ceil(duration * framesPerSecond);
          
          console.log(`[FRAME_EXTRACTION] 📹 Video duration: ${duration}s, extracting ${totalFrames} frames`);

          ffmpeg(videoPath)
            .on('filenames', (filenames: any) => {
              logger.info(`Frame extraction filenames generated: ${filenames.length} frames`);
            })
            .on('progress', (progress: any) => {
              logger.debug(`Frame extraction progress: ${progress.percent}%`);
            })
            .on('error', (err: any) => {
              logger.error(`Frame extraction error: ${err.message}`, { videoId, error: err });
              reject(err);
            })
            .on('end', async () => {
              logger.info(`Frame extraction completed for video: ${videoId}`);
              
              // Read extracted frames
              const files = fs.readdirSync(outputDir).sort();
              const frames = files.map((file, index) => ({
                frameNumber: index,
                timestamp: index / framesPerSecond,
                imagePath: path.join(outputDir, file)
              }));

              // Save FPS metadata for later retrieval
              const metadataPath = path.join(outputDir, 'metadata.json');
              fs.writeFileSync(metadataPath, JSON.stringify({
                fps: framesPerSecond,
                duration: duration,
                frameCount: frames.length,
                extractedAt: new Date().toISOString()
              }, null, 2));

              logger.info(`Frame extraction result: ${frames.length} frames from ${duration}s video`, {
                videoId,
                frameCount: frames.length,
                duration,
                fps: framesPerSecond
              });

              resolve({
                frameCount: frames.length,
                videoDuration: duration,
                fps: framesPerSecond,
                frames,
                cacheHit: false
              });
            })
            .screenshots({
              count: totalFrames,
              folder: outputDir,
              filename: 'frame-%i.png'
            });
        });
      } catch (err) {
        logger.error(`Frame extraction error: ${err}`, { videoId, error: err });
        reject(err);
      }
    });
  }

  /**
   * Get cached frames if they exist
   */
  static getCachedFrames(videoId: string): FrameExtractionResult | null {
    const outputDir = path.join(TEMP_DIR, videoId);
    
    if (!fs.existsSync(outputDir)) {
      return null;
    }

    // Try to read metadata to get the correct FPS
    let framesPerSecond = FRAMES_PER_SECOND;
    const metadataPath = path.join(outputDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        framesPerSecond = metadata.fps || FRAMES_PER_SECOND;
      } catch (err) {
        logger.warn(`Failed to read metadata for ${videoId}, using default FPS`, { error: err });
      }
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png'))
      .sort();
    
    if (files.length === 0) {
      return null;
    }

    const frames = files.map((file, index) => ({
      frameNumber: index,
      timestamp: index / framesPerSecond,
      imagePath: path.join(outputDir, file)
    }));

    logger.info(`Retrieved cached frames for video: ${videoId}`, {
      videoId,
      frameCount: frames.length,
      fps: framesPerSecond
    });

    return {
      frameCount: frames.length,
      videoDuration: frames.length / framesPerSecond,
      fps: framesPerSecond,
      frames,
      cacheHit: true
    };
  }

  /**
   * Clear cached frames for a video
   */
  static clearCache(videoId: string): void {
    const outputDir = path.join(TEMP_DIR, videoId);
    
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      logger.info(`Cleared frame cache for video: ${videoId}`, { videoId });
    }
  }

  /**
   * Get frame as base64 string
   */
  static getFrameAsBase64(framePath: string): string {
    try {
      const imageBuffer = fs.readFileSync(framePath);
      return imageBuffer.toString('base64');
    } catch (err) {
      logger.error(`Failed to read frame: ${framePath}`, { error: err });
      throw err;
    }
  }
}
