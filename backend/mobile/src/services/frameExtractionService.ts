import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface ExtractedFrame {
  frameNumber: number;
  timestamp: number;
  imageUri: string;
  width: number;
  height: number;
}

class FrameExtractionService {
  private frameCache: Map<string, ExtractedFrame> = new Map();
  private cacheDir = `${FileSystem.cacheDirectory}frames/`;

  async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize frame cache directory:', error);
    }
  }

  async extractFrameAtTimestamp(
    videoRef: React.RefObject<Video>,
    timestamp: number,
    videoUri: string
  ): Promise<ExtractedFrame> {
    const cacheKey = `${videoUri}_${timestamp}`;

    // Check cache
    if (this.frameCache.has(cacheKey)) {
      return this.frameCache.get(cacheKey)!;
    }

    try {
      // Seek to timestamp
      await videoRef.current?.setPositionAsync(timestamp);

      // Get video status to extract frame
      const status = await videoRef.current?.getStatusAsync();

      if (!status?.isLoaded) {
        throw new Error('Failed to load video for frame extraction');
      }

      const width = status.videoDetails?.width || 1920;
      const height = status.videoDetails?.height || 1080;

      // In a real implementation, you would use a native module to capture the frame
      // For now, we'll create a placeholder
      const imageUri = await this.createFramePlaceholder(
        width,
        height,
        timestamp
      );

      const frame: ExtractedFrame = {
        frameNumber: Math.floor((timestamp / 1000) * 30), // Assuming 30 FPS
        timestamp,
        imageUri,
        width,
        height,
      };

      this.frameCache.set(cacheKey, frame);
      return frame;
    } catch (error) {
      console.error('Failed to extract frame:', error);
      throw error;
    }
  }

  async extractFrameRange(
    videoRef: React.RefObject<Video>,
    startTimestamp: number,
    endTimestamp: number,
    videoUri: string,
    fps: number = 30,
    interval: number = 1 // Extract every Nth frame
  ): Promise<ExtractedFrame[]> {
    const frames: ExtractedFrame[] = [];
    const frameDuration = 1000 / fps; // milliseconds per frame

    try {
      let currentTimestamp = startTimestamp;

      while (currentTimestamp <= endTimestamp) {
        const frame = await this.extractFrameAtTimestamp(
          videoRef,
          currentTimestamp,
          videoUri
        );
        frames.push(frame);
        currentTimestamp += frameDuration * interval;
      }

      return frames;
    } catch (error) {
      console.error('Failed to extract frame range:', error);
      throw error;
    }
  }

  private async createFramePlaceholder(
    width: number,
    height: number,
    timestamp: number
  ): Promise<string> {
    // In production, this would capture actual video frame
    // For now, return a placeholder URI
    const filename = `frame_${timestamp}.jpg`;
    const fileUri = `${this.cacheDir}${filename}`;

    // Create a simple placeholder file
    try {
      await FileSystem.writeAsStringAsync(fileUri, 'placeholder', {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return fileUri;
    } catch (error) {
      console.error('Failed to create frame placeholder:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    this.frameCache.clear();
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.cacheDir, {
        intermediates: true,
      });
    } catch (error) {
      console.error('Failed to clear frame cache:', error);
    }
  }

  getCachedFrame(videoUri: string, timestamp: number): ExtractedFrame | null {
    const cacheKey = `${videoUri}_${timestamp}`;
    return this.frameCache.get(cacheKey) || null;
  }
}

export const frameExtractionService = new FrameExtractionService();
