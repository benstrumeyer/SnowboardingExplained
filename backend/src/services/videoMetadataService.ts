import { execSync } from 'child_process';
import * as fs from 'fs';

export interface VideoMetadata {
  fps: number;
  duration: number;
  resolution: [number, number];
  frameCount: number;
  filename: string;
  filesize: number;
}

export async function extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  console.log(`[VIDEO_METADATA] 🚀 Extracting metadata from ${videoPath}`);

  try {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const filesize = fs.statSync(videoPath).size;
    const filename = videoPath.split('/').pop() || 'video.mp4';

    const ffprobeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,duration,width,height -of csv=p=0 "${videoPath}"`;
    const output = execSync(ffprobeCmd, { encoding: 'utf-8' });

    const parts = output.trim().split(',');
    
    // ffprobe returns: r_frame_rate, duration, width, height
    // But the order might be different, so we need to parse carefully
    let fps = 30;
    let duration = 0;
    let width = 1920;
    let height = 1080;

    if (parts.length >= 4) {
      // Try to identify which part is which based on content
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        
        // r_frame_rate contains a slash (e.g., "30/1" or "60000/1001")
        if (part.includes('/')) {
          const fpsParts = part.split('/');
          fps = parseInt(fpsParts[0]) / (parseInt(fpsParts[1]) || 1);
        }
        // duration is a decimal number
        else if (part.includes('.') && !part.includes('/')) {
          duration = parseFloat(part);
        }
        // width and height are integers, width is typically larger
        else {
          const num = parseInt(part);
          if (num > 0) {
            if (width === 1920) {
              width = num;
            } else if (height === 1080) {
              height = num;
            }
          }
        }
      }
    }

    const frameCount = Math.round(duration * fps);

    const metadata: VideoMetadata = {
      fps,
      duration,
      resolution: [width, height],
      frameCount,
      filename,
      filesize,
    };

    console.log(`[VIDEO_METADATA] ✓ Extracted metadata:`, metadata);
    return metadata;
  } catch (error: any) {
    console.error(`[VIDEO_METADATA] ✗ Error extracting metadata: ${error.message}`);
    throw error;
  }
}
