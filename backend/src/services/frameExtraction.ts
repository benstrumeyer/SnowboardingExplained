import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import logger from '../logger';
import { FrameExtractionResult } from '../types';
import { meshDataService } from './meshDataService';

// Import static ffmpeg/ffprobe paths
import ffmpegStatic from 'ffmpeg-static';
const ffprobeStatic = require('ffprobe-static') as any;

const FRAMES_PER_SECOND = 30; // Extract at higher frame rate for better quality
// Use system temp directory to keep paths short (Windows has 260 char limit)
const TEMP_DIR = path.join(os.tmpdir(), 'snowboard-frames');

// Set ffmpeg and ffprobe paths
// Try ffmpeg-static first, fall back to system ffmpeg
if (ffmpegStatic) {
  console.log(`[FFMPEG] Using ffmpeg-static at: ${ffmpegStatic}`);
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.log(`[FFMPEG] ffmpeg-static not available, using system ffmpeg`);
}

if (ffprobeStatic && ffprobeStatic.path) {
  console.log(`[FFMPEG] Using ffprobe-static at: ${ffprobeStatic.path}`);
  ffmpeg.setFfprobePath(ffprobeStatic.path);
} else {
  console.log(`[FFMPEG] ffprobe-static not available, using system ffprobe`);
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generate a short hash from videoId to avoid path length issues on Windows
 * Uses MD5 hash to create a unique 8-character identifier
 */
function getShortVideoPath(videoId: string): string {
  // Create an 8-character hash from the videoId to keep paths short
  // This prevents Windows ENAMETOOLONG errors while maintaining uniqueness
  const hash = crypto.createHash('md5').update(videoId).digest('hex').substring(0, 8);
  return hash;
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
   * Extract frames from video at specified FPS or specific frame indices
   * Checks MongoDB cache first before extracting
   * 
   * @param videoPath - Path to video file
   * @param videoId - Video ID for caching
   * @param fps - Frames per second (default: 4)
   * @param frameIndices - Optional: specific frame indices to extract (for mesh-aligned extraction)
   */
  static async extractFrames(
    videoPath: string,
    videoId: string,
    fps: number = FRAMES_PER_SECOND,
    frameIndices?: number[]
  ): Promise<FrameExtractionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check MongoDB cache first (but don't fail if MongoDB is unavailable)
        let cachedMeshData = null;
        try {
          cachedMeshData = await meshDataService.getMeshData(videoId);
        } catch (mongoError) {
          logger.warn(`MongoDB unavailable for cache check, proceeding with frame extraction`, {
            videoId,
            error: mongoError instanceof Error ? mongoError.message : String(mongoError)
          });
          // Continue with frame extraction even if MongoDB is unavailable
        }

        if (cachedMeshData) {
          logger.info(`Found cached mesh data in MongoDB for video: ${videoId}`, {
            videoId,
            frameCount: cachedMeshData.frameCount,
            fps: cachedMeshData.fps
          });

          // Convert MongoDB mesh data back to frame extraction format
          const shortPath = getShortVideoPath(videoId);
          const frames = cachedMeshData.frames.map((frame: any) => ({
            frameNumber: frame.frameNumber,
            timestamp: frame.timestamp,
            imagePath: path.join(TEMP_DIR, shortPath, `frame-${frame.frameNumber + 1}.png`)
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
        const shortPath = getShortVideoPath(videoId);
        const outputDir = path.join(TEMP_DIR, shortPath);
        const framesPerSecond = fps || FRAMES_PER_SECOND;
        
        console.log(`[FRAME_EXTRACTION] 🎬 Starting extraction for ${videoId}`);
        console.log(`[FRAME_EXTRACTION] 📁 Output dir: ${outputDir}`);
        console.log(`[FRAME_EXTRACTION] 📊 FPS: ${framesPerSecond}`);
        if (frameIndices) {
          console.log(`[FRAME_EXTRACTION] 🎯 Extracting specific frame indices: ${frameIndices.length} frames`);
        }
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(`[FRAME_EXTRACTION] ✅ Created output directory`);
        }

        logger.info(`Starting frame extraction for video: ${videoId}`, {
          videoPath,
          outputDir,
          fps: framesPerSecond,
          specificFrameIndices: frameIndices ? frameIndices.length : 'none'
        });

        // Get video metadata to calculate total frames needed
        ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
          if (err) {
            logger.error(`Failed to get video metadata: ${err.message}`, { videoId });
            reject(err);
            return;
          }

          const duration = metadata.format.duration || 0;
          
          // Get actual video frame rate from metadata
          let videoFrameRate = FRAMES_PER_SECOND;
          if (metadata.streams && metadata.streams.length > 0) {
            const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
            if (videoStream && videoStream.r_frame_rate) {
              // r_frame_rate is in format "num/den" like "30/1" or "24000/1001"
              const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
              videoFrameRate = num / (den || 1);
            }
          }
          
          // Determine which frames to extract
          let totalFrames: number;
          
          if (frameIndices && frameIndices.length > 0) {
            // Extract only specific frame indices (mesh-aligned)
            totalFrames = frameIndices.length;
            console.log(`[FRAME_EXTRACTION] 🎯 Extracting ${totalFrames} specific frames aligned with mesh data`);
          } else {
            // Use video's native FPS, capped at 60 FPS max
            const MAX_FPS = 60;
            const targetFps = Math.min(videoFrameRate, MAX_FPS);
            totalFrames = Math.ceil(duration * targetFps);
            
            // Cap frames to avoid Windows command line length limits
            const MAX_FRAMES = 500;
            if (totalFrames > MAX_FRAMES) {
              console.log(`[FRAME_EXTRACTION] ⚠️  Capping frames from ${totalFrames} to ${MAX_FRAMES} to avoid path length limits`);
              totalFrames = MAX_FRAMES;
            }
            
            console.log(`[FRAME_EXTRACTION] 📹 Video: ${duration}s @ ${videoFrameRate.toFixed(2)} fps, extracting ${totalFrames} frames @ ${targetFps.toFixed(2)} fps`);
          }

          // Use raw ffmpeg command to extract frames
          // For videos with multiple streams, we skip the -map option and let ffmpeg handle it
          const ffmpegPath = ffmpegStatic || 'ffmpeg';
          
          // Verify ffmpeg is available
          console.log(`[FRAME_EXTRACTION] Using ffmpeg at: ${ffmpegPath}`);
          
          // Calculate target FPS for frame extraction
          const MAX_FPS = 60;
          const targetFps = Math.min(videoFrameRate, MAX_FPS);
          
          const args = [
            '-i', videoPath,  // Input file
            '-vf', `fps=${targetFps},scale=640:360`,  // Extract at target FPS and scale down
            '-q:v', '2',  // Quality (lower is better, 2 is high quality)
            path.join(outputDir, 'frame-%d.png')  // Output pattern
          ];
          
          console.log(`[FRAME_EXTRACTION] Running ffmpeg command:`);
          console.log(`[FRAME_EXTRACTION] ${ffmpegPath} ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`);
          
          execFile(ffmpegPath, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
              logger.error(`Frame extraction error: ${error.message}`, { videoId, error });
              console.error(`[FRAME_EXTRACTION] ✗ ffmpeg error:`, error.message);
              console.error(`[FRAME_EXTRACTION] ffmpeg stderr:`, stderr);
              console.error(`[FRAME_EXTRACTION] ffmpeg stdout:`, stdout);
              reject(error);
              return;
            }
            
            logger.info(`Frame extraction completed for video: ${videoId}`);
            console.log(`[FRAME_EXTRACTION] ffmpeg stdout:`, stdout);
            console.log(`[FRAME_EXTRACTION] ffmpeg stderr:`, stderr);
            
            // Read extracted frames
            let files: string[] = [];
            try {
              files = fs.readdirSync(outputDir)
                .filter(f => f.endsWith('.png'))
                .sort();
            } catch (readErr) {
              console.error(`[FRAME_EXTRACTION] ✗ Failed to read output directory:`, readErr);
              logger.error(`Failed to read output directory: ${readErr}`, { videoId, outputDir });
              reject(readErr);
              return;
            }
            
            console.log(`[FRAME_EXTRACTION] ✓ Extraction complete: found ${files.length} PNG files`);
            console.log(`[FRAME_EXTRACTION] Files:`, files.slice(0, 5).join(', '), files.length > 5 ? `... and ${files.length - 5} more` : '');
            
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
              extractedAt: new Date().toISOString(),
              meshAligned: frameIndices ? true : false,
              requestedFrameIndices: frameIndices || null
            }, null, 2));

            logger.info(`Frame extraction result: ${frames.length} frames from ${duration}s video`, {
              videoId,
              frameCount: frames.length,
              duration,
              fps: framesPerSecond,
              meshAligned: frameIndices ? true : false
            });

            resolve({
              frameCount: frames.length,
              videoDuration: duration,
              fps: framesPerSecond,
              frames,
              cacheHit: false
            });
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
    const shortPath = getShortVideoPath(videoId);
    const outputDir = path.join(TEMP_DIR, shortPath);
    
    if (!fs.existsSync(outputDir)) {
      return null;
    }

    // Try to read metadata to get the correct FPS and other info
    let framesPerSecond = FRAMES_PER_SECOND;
    let videoDuration = 0;
    const metadataPath = path.join(outputDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        framesPerSecond = metadata.fps || FRAMES_PER_SECOND;
        videoDuration = metadata.duration || 0;
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
      fps: framesPerSecond,
      videoDuration
    });

    return {
      frameCount: frames.length,
      videoDuration: videoDuration || frames.length / framesPerSecond,
      fps: framesPerSecond,
      frames,
      cacheHit: true
    };
  }

  /**
   * Filter and keep only frames that have corresponding mesh data
   * Deletes frames without mesh data to save storage
   * 
   * @param videoId - Video ID
   * @param meshFrameIndices - Array of frame indices that have mesh data
   */
  static filterFramesToMeshData(videoId: string, meshFrameIndices: number[]): void {
    const shortPath = getShortVideoPath(videoId);
    const outputDir = path.join(TEMP_DIR, shortPath);
    
    if (!fs.existsSync(outputDir)) {
      logger.warn(`Output directory not found for ${videoId}`, { outputDir });
      return;
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png'))
      .sort();
    
    if (files.length === 0) {
      return;
    }

    // Create a set of indices to keep for faster lookup
    const indicesToKeep = new Set(meshFrameIndices);
    let deletedCount = 0;

    // Delete frames that don't have mesh data
    for (let i = 0; i < files.length; i++) {
      if (!indicesToKeep.has(i)) {
        const filePath = path.join(outputDir, files[i]);
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (err) {
          logger.warn(`Failed to delete frame ${i}:`, err);
        }
      }
    }

    logger.info(`Filtered frames for ${videoId}: kept ${meshFrameIndices.length}, deleted ${deletedCount}`, {
      videoId,
      keptFrames: meshFrameIndices.length,
      deletedFrames: deletedCount
    });
  }

  /**
   * Rename frames to match mesh frame indices
   * After filtering, renames frames so they're sequential (0, 1, 2, ...)
   * 
   * @param videoId - Video ID
   * @param meshFrameIndices - Original frame indices that have mesh data
   */
  static renameFramesToSequential(videoId: string, meshFrameIndices: number[]): void {
    const shortPath = getShortVideoPath(videoId);
    const outputDir = path.join(TEMP_DIR, shortPath);
    
    if (!fs.existsSync(outputDir)) {
      logger.warn(`Output directory not found for ${videoId}`, { outputDir });
      return;
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png'))
      .sort();
    
    if (files.length === 0) {
      return;
    }

    // Create a mapping from old index to new index
    const indexMapping = new Map<number, number>();
    meshFrameIndices.forEach((oldIndex, newIndex) => {
      indexMapping.set(oldIndex, newIndex);
    });

    // Rename files to be sequential
    for (let i = 0; i < files.length; i++) {
      const oldPath = path.join(outputDir, files[i]);
      const newPath = path.join(outputDir, `frame-${i + 1}.png`);
      
      if (oldPath !== newPath) {
        try {
          fs.renameSync(oldPath, newPath);
        } catch (err) {
          logger.warn(`Failed to rename frame ${i}:`, err);
        }
      }
    }

    logger.info(`Renamed frames to sequential for ${videoId}`, {
      videoId,
      totalFrames: files.length
    });
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

  /**
   * Clear cached frames for a video
   */
  static clearCache(videoId: string): void {
    const shortPath = getShortVideoPath(videoId);
    const outputDir = path.join(TEMP_DIR, shortPath);
    
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
      logger.info(`Cleared frame cache for video: ${videoId}`, { videoId });
    }
  }
}
