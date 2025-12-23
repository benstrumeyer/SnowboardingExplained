import { MeshSequence, SyncedFrame } from '../types';

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;

/**
 * Playback Service
 * Manages synchronized playback of video and mesh animations
 */
export class PlaybackService {
  private meshSequence: MeshSequence | null = null;
  private currentFrameIndex: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: PlaybackSpeed = 1;
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(meshSequence?: MeshSequence) {
    if (meshSequence) {
      this.setMeshSequence(meshSequence);
    }
  }

  /**
   * Set the mesh sequence for playback
   */
  setMeshSequence(meshSequence: MeshSequence): void {
    this.meshSequence = meshSequence;
    this.currentFrameIndex = 0;
    this.isPlaying = false;
    this.notifyListeners();
  }

  /**
   * Start playback
   */
  play(): void {
    if (!this.meshSequence || this.isPlaying) {
      return;
    }

    this.isPlaying = true;
    this.lastUpdateTime = performance.now();
    this.scheduleNextFrame();
    this.notifyListeners();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyListeners();
  }

  /**
   * Seek to specific frame
   */
  seek(frameIndex: number): void {
    if (!this.meshSequence) {
      return;
    }

    // Clamp frame index to valid range
    this.currentFrameIndex = Math.max(0, Math.min(frameIndex, this.meshSequence.totalFrames - 1));
    this.notifyListeners();
  }

  /**
   * Seek to specific timestamp (milliseconds)
   */
  seekToTimestamp(timestamp: number): void {
    if (!this.meshSequence) {
      return;
    }

    const frameIndex = Math.floor((timestamp / 1000) * this.meshSequence.fps);
    this.seek(frameIndex);
  }

  /**
   * Advance by one frame
   */
  nextFrame(): void {
    if (!this.meshSequence) {
      return;
    }

    if (this.currentFrameIndex < this.meshSequence.totalFrames - 1) {
      this.currentFrameIndex++;
      this.notifyListeners();
    }
  }

  /**
   * Go back by one frame
   */
  previousFrame(): void {
    if (this.currentFrameIndex > 0) {
      this.currentFrameIndex--;
      this.notifyListeners();
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed = speed;
    this.notifyListeners();
  }

  /**
   * Get current frame
   */
  getCurrentFrame(): SyncedFrame | null {
    if (!this.meshSequence || this.currentFrameIndex >= this.meshSequence.frames.length) {
      return null;
    }
    return this.meshSequence.frames[this.currentFrameIndex];
  }

  /**
   * Get current frame index
   */
  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * Get current timestamp (milliseconds)
   */
  getCurrentTimestamp(): number {
    if (!this.meshSequence) {
      return 0;
    }
    return (this.currentFrameIndex / this.meshSequence.fps) * 1000;
  }

  /**
   * Get total frames
   */
  getTotalFrames(): number {
    return this.meshSequence?.totalFrames || 0;
  }

  /**
   * Get FPS
   */
  getFps(): number {
    return this.meshSequence?.fps || 0;
  }

  /**
   * Get playback speed
   */
  getSpeed(): PlaybackSpeed {
    return this.playbackSpeed;
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get mesh sequence
   */
  getMeshSequence(): MeshSequence | null {
    return this.meshSequence;
  }

  /**
   * Subscribe to playback updates
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Private: Schedule next frame update
   */
  private scheduleNextFrame(): void {
    if (!this.isPlaying || !this.meshSequence) {
      return;
    }

    this.animationFrameId = requestAnimationFrame((currentTime: number) => {
      if (!this.isPlaying || !this.meshSequence) {
        return;
      }

      // Calculate elapsed time since last update
      const elapsedTime = currentTime - this.lastUpdateTime;
      this.lastUpdateTime = currentTime;

      // Calculate frame advancement based on playback speed
      // elapsedTime is in milliseconds, convert to seconds
      const frameAdvancement = (elapsedTime / 1000) * this.meshSequence.fps * this.playbackSpeed;

      // Update frame index
      this.currentFrameIndex += frameAdvancement;

      // Check if we've reached the end
      if (this.currentFrameIndex >= this.meshSequence.totalFrames - 1) {
        this.currentFrameIndex = this.meshSequence.totalFrames - 1;
        this.isPlaying = false;
        this.notifyListeners();
        return;
      }

      this.notifyListeners();
      this.scheduleNextFrame();
    });
  }

  /**
   * Private: Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error('Error in playback listener:', err);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.pause();
    this.listeners.clear();
    this.meshSequence = null;
  }
}

/**
 * Create a singleton playback service instance
 */
let playbackServiceInstance: PlaybackService | null = null;

export function getPlaybackService(): PlaybackService {
  if (!playbackServiceInstance) {
    playbackServiceInstance = new PlaybackService();
  }
  return playbackServiceInstance;
}

export function createPlaybackService(meshSequence?: MeshSequence): PlaybackService {
  return new PlaybackService(meshSequence);
}
