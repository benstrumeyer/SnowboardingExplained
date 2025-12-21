/**
 * Video Metadata Service
 * 
 * Utility functions for video metadata calculations.
 * Note: Actual metadata extraction happens in VideoPlayer component
 * via expo-av's AVPlaybackStatus. This service provides helper functions
 * for frame calculations and conversions.
 */

export interface VideoMetadata {
  duration: number;
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
}

class VideoMetadataService {
  /**
   * Calculate total frames from duration and FPS
   */
  calculateTotalFrames(duration: number, fps: number): number {
    return Math.floor((duration / 1000) * fps);
  }

  /**
   * Convert frame number to timestamp (milliseconds)
   */
  calculateFrameTimestamp(frameNumber: number, fps: number): number {
    return (frameNumber / fps) * 1000;
  }

  /**
   * Convert timestamp (milliseconds) to frame number
   */
  calculateFrameNumber(timestamp: number, fps: number): number {
    return Math.floor((timestamp / 1000) * fps);
  }

  /**
   * Calculate frame duration in milliseconds
   */
  calculateFrameDuration(fps: number): number {
    return 1000 / fps;
  }

  /**
   * Validate video metadata
   */
  validateMetadata(metadata: VideoMetadata): boolean {
    return (
      metadata.duration > 0 &&
      metadata.fps > 0 &&
      metadata.totalFrames > 0 &&
      metadata.width > 0 &&
      metadata.height > 0
    );
  }

  /**
   * Format duration for display (MM:SS)
   */
  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get aspect ratio from dimensions
   */
  getAspectRatio(width: number, height: number): number {
    return width / height;
  }
}

export const videoMetadataService = new VideoMetadataService();
