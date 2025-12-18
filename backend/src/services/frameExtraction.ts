import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import logger from '../logger';
import { FrameExtractionResult } from '../types';

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
   * Extract frames from video at specified FPS
   */
  static async extractFrames(videoPath: string, videoId: string, fps: number = FRAMES_PER_SECOND): Promise<FrameExtractionResult> {
    return new Promise((resolve, reject) => {
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
        .on('end', () => {
          logger.info(`Frame extraction completed for video: ${videoId}`);
          
          // Get video duration and frame count
          ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
            if (err) {
              logger.error(`Failed to get video metadata: ${err.message}`, { videoId });
              reject(err);
              return;
            }

            const duration = metadata.format.duration || 0;
            const frameCount = Math.floor(duration * framesPerSecond);
            
            // Read extracted frames
            const files = fs.readdirSync(outputDir).sort();
            const frames = files.map((file, index) => ({
              frameNumber: index,
              timestamp: index / framesPerSecond,
              imagePath: path.join(outputDir, file)
            }));

            logger.info(`Frame extraction result: ${frameCount} frames from ${duration}s video`, {
              videoId,
              frameCount,
              duration
            });

            resolve({
              frameCount,
              videoDuration: duration,
              frames,
              cacheHit: false
            });
          });
        })
        .screenshots({
          count: framesPerSecond,
          folder: outputDir,
          filename: 'frame-%i.png'
        });
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

    const files = fs.readdirSync(outputDir).sort();
    if (files.length === 0) {
      return null;
    }

    const frames = files.map((file, index) => ({
      frameNumber: index,
      timestamp: index / FRAMES_PER_SECOND,
      imagePath: path.join(outputDir, file)
    }));

    logger.info(`Retrieved cached frames for video: ${videoId}`, {
      videoId,
      frameCount: frames.length
    });

    return {
      frameCount: frames.length,
      videoDuration: frames.length / FRAMES_PER_SECOND,
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
