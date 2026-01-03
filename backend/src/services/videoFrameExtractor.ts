import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedFrame {
  frameNumber: number;
  timestamp: number;
  imageBuffer: Buffer;
  videoType: 'original' | 'overlay';
}

export async function extractVideoFrames(
  videoPath: string,
  videoType: 'original' | 'overlay',
  fps: number = 30
): Promise<ExtractedFrame[]> {
  console.log(`[FRAME_EXTRACTOR] 🎬 Extracting frames from ${videoType} video: ${videoPath}`);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const frames: ExtractedFrame[] = [];
  const tempDir = path.join(path.dirname(videoPath), `frames_${videoType}_${Date.now()}`);

  try {
    console.log(`[FRAME_EXTRACTOR] Creating temp directory: ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const framePattern = path.join(tempDir, 'frame_%06d.png');
    const ffmpegCmd = `ffmpeg -i "${videoPath}" -vf fps=${fps} "${framePattern}" -y 2>&1`;

    console.log(`[FRAME_EXTRACTOR] Running ffmpeg command...`);
    console.log(`[FRAME_EXTRACTOR] Command: ${ffmpegCmd}`);

    try {
      const output = execSync(ffmpegCmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
      console.log(`[FRAME_EXTRACTOR] ffmpeg output: ${output.substring(0, 200)}...`);
    } catch (execError: any) {
      console.error(`[FRAME_EXTRACTOR] ffmpeg execution error: ${execError.message}`);
      console.error(`[FRAME_EXTRACTOR] ffmpeg stderr: ${execError.stderr || 'N/A'}`);
      throw execError;
    }

    const frameFiles = fs.readdirSync(tempDir)
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

    console.log(`[FRAME_EXTRACTOR] ✓ Found ${frameFiles.length} frame files in ${tempDir}`);

    if (frameFiles.length === 0) {
      throw new Error(`No frames extracted from video. Check ffmpeg output above.`);
    }

    for (let i = 0; i < frameFiles.length; i++) {
      const frameFile = frameFiles[i];
      const framePath = path.join(tempDir, frameFile);

      if (!fs.existsSync(framePath)) {
        console.warn(`[FRAME_EXTRACTOR] Frame file missing: ${framePath}`);
        continue;
      }

      const imageBuffer = fs.readFileSync(framePath);

      frames.push({
        frameNumber: i,
        timestamp: (i / fps) * 1000,
        imageBuffer,
        videoType,
      });

      if ((i + 1) % 30 === 0) {
        console.log(`[FRAME_EXTRACTOR] Extracted ${i + 1}/${frameFiles.length} frames`);
      }
    }

    console.log(`[FRAME_EXTRACTOR] ✓ Extracted ${frames.length} frames from ${videoType} video`);

    if (frames.length === 0) {
      throw new Error(`Failed to extract any frames from video`);
    }

    fs.rmSync(tempDir, { recursive: true, force: true });

    return frames;
  } catch (error: any) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore cleanup errors
    }
    console.error(`[FRAME_EXTRACTOR] ✗ Error extracting frames: ${error.message}`);
    throw error;
  }
}

export async function extractBothVideoFrames(
  originalVideoPath: string,
  overlayVideoPath: string,
  fps: number = 30
): Promise<{ original: ExtractedFrame[]; overlay: ExtractedFrame[] }> {
  console.log(`[FRAME_EXTRACTOR] 🎬 Extracting frames from both videos`);

  const [originalFrames, overlayFrames] = await Promise.all([
    extractVideoFrames(originalVideoPath, 'original', fps),
    extractVideoFrames(overlayVideoPath, 'overlay', fps),
  ]);

  console.log(`[FRAME_EXTRACTOR] ✓ Extracted ${originalFrames.length} original + ${overlayFrames.length} overlay frames`);

  return { original: originalFrames, overlay: overlayFrames };
}
