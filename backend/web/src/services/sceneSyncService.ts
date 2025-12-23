/**
 * Service for synchronizing multiple 3D scenes
 * Handles frame-independent playback with synchronized timing
 */

export interface SceneState {
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;
  cameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
}

export class SceneSyncService {
  private playbackStartTime: number = 0;
  private pausedTime: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;

  /**
   * Start synchronized playback across all scenes
   */
  startPlayback(): void {
    if (!this.isPlaying) {
      this.playbackStartTime = performance.now() - this.pausedTime;
      this.isPlaying = true;
    }
  }

  /**
   * Pause synchronized playback
   */
  pausePlayback(): void {
    if (this.isPlaying) {
      this.pausedTime = performance.now() - this.playbackStartTime;
      this.isPlaying = false;
    }
  }

  /**
   * Set playback speed for all scenes
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  /**
   * Get current elapsed time in milliseconds
   */
  getElapsedTime(): number {
    if (this.isPlaying) {
      return (performance.now() - this.playbackStartTime) * this.playbackSpeed;
    }
    return this.pausedTime * this.playbackSpeed;
  }

  /**
   * Calculate frame number based on elapsed time and FPS
   */
  calculateFrame(fps: number, totalFrames: number): number {
    const elapsedSeconds = this.getElapsedTime() / 1000;
    const frame = Math.floor(elapsedSeconds * fps);
    return Math.min(frame, totalFrames - 1);
  }

  /**
   * Sync all scenes to frame 1 with default camera
   */
  syncScenes(): void {
    this.playbackStartTime = 0;
    this.pausedTime = 0;
    this.isPlaying = false;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.playbackStartTime = 0;
    this.pausedTime = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1;
  }
}

export const sceneSyncService = new SceneSyncService();
