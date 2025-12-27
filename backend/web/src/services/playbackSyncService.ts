/**
 * Playback Sync Service (Frontend)
 * Syncs mesh frames to HTML5 video element playback
 * The video element drives all timing - we just listen and update mesh frames
 */

export interface PlaybackSyncServiceConfig {
  fps?: number;
}

type FrameChangeCallback = (frameIndex: number) => void;

export class PlaybackSyncService {
  private frameChangeCallbacks: Map<string, Set<FrameChangeCallback>> = new Map();
  private fps: number;
  private videoElement: HTMLVideoElement | null = null;
  private lastSyncedFrame: number = -1;
  private onTimeUpdate: ((e: Event) => void) | null = null;

  constructor(config: PlaybackSyncServiceConfig = {}) {
    this.fps = config.fps || 30;
  }

  /**
   * Sync to video element's timeupdate event
   * This is the ONLY source of truth for frame timing
   * The video element handles all playback smoothness
   */
  syncToVideoElement(videoElement: HTMLVideoElement): void {
    // Clean up old listener
    if (this.videoElement && this.onTimeUpdate) {
      this.videoElement.removeEventListener('timeupdate', this.onTimeUpdate);
    }

    this.videoElement = videoElement;
    this.lastSyncedFrame = -1;

    // Listen to timeupdate - fires frequently during playback
    this.onTimeUpdate = () => {
      if (!this.videoElement) return;

      const videoTimeInSeconds = this.videoElement.currentTime;
      const newFrameIndex = Math.floor(videoTimeInSeconds * this.fps);

      // Only notify if frame actually changed
      if (newFrameIndex !== this.lastSyncedFrame) {
        this.lastSyncedFrame = newFrameIndex;
        this.notifyAllFrameChange(newFrameIndex);
      }
    };

    this.videoElement.addEventListener('timeupdate', this.onTimeUpdate);
  }

  /**
   * Subscribe to frame changes
   */
  onFrameChange(sceneId: string, callback: FrameChangeCallback): () => void {
    if (!this.frameChangeCallbacks.has(sceneId)) {
      this.frameChangeCallbacks.set(sceneId, new Set());
    }

    const callbacks = this.frameChangeCallbacks.get(sceneId)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of frame change
   */
  private notifyAllFrameChange(frameIndex: number): void {
    this.frameChangeCallbacks.forEach((callbacks) => {
      callbacks.forEach((callback) => {
        try {
          callback(frameIndex);
        } catch (error) {
          console.error('Error in frame change callback:', error);
        }
      });
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.videoElement && this.onTimeUpdate) {
      this.videoElement.removeEventListener('timeupdate', this.onTimeUpdate);
    }

    this.videoElement = null;
    this.onTimeUpdate = null;
    this.frameChangeCallbacks.clear();
  }
}

// Singleton instance
let instance: PlaybackSyncService | null = null;

export function initializePlaybackSyncService(config?: PlaybackSyncServiceConfig): PlaybackSyncService {
  instance = new PlaybackSyncService(config);
  return instance;
}

export function getPlaybackSyncService(): PlaybackSyncService {
  if (!instance) {
    instance = new PlaybackSyncService();
  }
  return instance;
}
