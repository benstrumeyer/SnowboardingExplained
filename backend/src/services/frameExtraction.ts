import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import logger from '../logger';
import { FrameExtractionResult } from '../types';
import { meshDataService } from './meshDataService';

// Import static ffmpeg/ffprobe paths
import ffmpegStatic from 'ffmpeg-static';
const ffprobeStatic = require('ffprobe-static');

const FRAMES_PER_SECOND = 30; // Extract at higher frame rate for better quality
// Use system temp directory to keep paths short (Windows has 260 char limit)
const TEMP_DIR = path.join(os.tmpdir(), 'snowboard-frames');

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

/**
 * Generate a short hash from videoId to avoid path length issues on Windows
 */
function getShortVideoPath(videoId: string): string {
  // Use first 8 chars of videoId to keep paths short
  const shortId = videoId.substring(0, 8);
  return shortId;
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
        // Check MongoDB cache first
        const cachedMeshData = await meshDataService.getMeshData(videoId);
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
          let framesToExtract: number[];
          let totalFrames: number;
          
          if (frameIndices && frameIndices.length > 0) {
            // Extract only specific frame indices (mesh-aligned)
            framesToExtract = frameIndices;
            totalFrames = frameIndices.length;
            console.log(`[FRAME_EXTRACTION] 🎯 Extracting ${totalFrames} specific frames aligned with mesh data`);
          } else {
            // Extract at fixed FPS
            const targetFps = fps || FRAMES_PER_SECOND;
            totalFrames = Math.ceil(duration * targetFps);
            
            // Cap frames to avoid Windows command line length limits
            const MAX_FRAMES = 500;
            if (totalFrames > MAX_FRAMES) {
              console.log(`[FRAME_EXTRACTION] ⚠️  Capping frames from ${totalFrames} to ${MAX_FRAMES} to avoid path length limits`);
              totalFrames = MAX_FRAMES;
            }
            
            // Generate frame indices for fixed FPS extraction
            framesToExtract = Array.from({ length: totalFrames }, (_, i) => i);
            console.log(`[FRAME_EXTRACTION] 📹 Video: ${duration}s @ ${videoFrameRate.toFixed(2)} fps, extracting ${totalFrames} frames @ ${targetFps} fps`);
          }

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
              const files = fs.readdirSync(outputDir)
                .filter(f => f.endsWith('.png'))
                .sort();
              
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
