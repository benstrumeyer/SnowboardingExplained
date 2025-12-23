/**
 * Playback Sync Service (Frontend)
 * Manages synchronized playback speed across multiple scenes
 * Each scene maintains its independent frame position
 */

export interface PlaybackSyncServiceConfig {
  fps?: number;
  defaultSpeed?: number;
}

export interface ScenePlaybackState {
  sceneId: string;
  frameIndex: number;
  isPlaying: boolean;
  speed: number;
}

type FrameChangeCallback = (frameIndex: number) => void;

export class PlaybackSyncService {
  private sceneStates: Map<string, ScenePlaybackState> = new Map();
  private frameChangeCallbacks: Map<string, Set<FrameChangeCallback>> = new Map();
  private globalSpeed: number = 1.0;
  private isGloballyPlaying: boolean = false;
  private fps: number;
  private frameAdvanceInterval: NodeJS.Timeout | null = null;
  private readonly FRAME_ADVANCE_INTERVAL = 33; // ~30 FPS

  constructor(config: PlaybackSyncServiceConfig = {}) {
    this.fps = config.fps || 30;
    this.globalSpeed = config.defaultSpeed || 1.0;
  }

  /**
   * Initialize playback for multiple scenes with independent frame tracking
   */
  async initializePlayback(videoIds: string[], fps: number = 30): Promise<void> {
    this.fps = fps;

    for (const videoId of videoIds) {
      this.sceneStates.set(videoId, {
        sceneId: videoId,
        frameIndex: 0,
        isPlaying: false,
        speed: this.globalSpeed
      });

      this.frameChangeCallbacks.set(videoId, new Set());
    }
  }

  /**
   * Advance all scenes by one frame (maintains independent positions)
   */
  advanceFrame(): void {
    for (const [sceneId, state] of this.sceneStates.entries()) {
      if (state.isPlaying) {
        state.frameIndex += 1;

        // Notify subscribers
        this.notifyFrameChange(sceneId, state.frameIndex);
      }
    }
  }

  /**
   * Seek all scenes by the same frame offset (maintains independent positions)
   */
  async seekByOffset(frameOffset: number): Promise<void> {
    for (const [sceneId, state] of this.sceneStates.entries()) {
      const newFrameIndex = Math.max(0, state.frameIndex + frameOffset);
      state.frameIndex = newFrameIndex;

      // Notify subscribers
      this.notifyFrameChange(sceneId, newFrameIndex);
    }
  }

  /**
   * Set playback speed for all scenes
   */
  setPlaybackSpeed(speed: number): void {
    if (speed <= 0) {
      throw new Error('Playback speed must be positive');
    }

    this.globalSpeed = speed;

    // Update speed for all scenes
    for (const state of this.sceneStates.values()) {
      state.speed = speed;
    }
  }

  /**
   * Pause all scenes at their current independent frame positions
   */
  pause(): void {
    this.isGloballyPlaying = false;

    for (const state of this.sceneStates.values()) {
      state.isPlaying = false;
    }

    if (this.frameAdvanceInterval) {
      clearInterval(this.frameAdvanceInterval);
      this.frameAdvanceInterval = null;
    }
  }

  /**
   * Resume all scenes from their current independent frame positions
   */
  play(): void {
    this.isGloballyPlaying = true;

    for (const state of this.sceneStates.values()) {
      state.isPlaying = true;
    }

    // Start frame advancement loop
    if (!this.frameAdvanceInterval) {
      this.frameAdvanceInterval = setInterval(() => {
        this.advanceFrame();
      }, this.FRAME_ADVANCE_INTERVAL);
    }
  }

  /**
   * Get current frame index for a specific scene
   */
  getSceneFrameIndex(sceneId: string): number {
    const state = this.sceneStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }
    return state.frameIndex;
  }

  /**
   * Set frame index for a specific scene
   */
  setSceneFrameIndex(sceneId: string, frameIndex: number): void {
    const state = this.sceneStates.get(sceneId);
    if (!state) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    state.frameIndex = Math.max(0, frameIndex);
    this.notifyFrameChange(sceneId, state.frameIndex);
  }

  /**
   * Subscribe to frame changes for a specific scene
   */
  onSceneFrameChange(sceneId: string, callback: FrameChangeCallback): () => void {
    if (!this.frameChangeCallbacks.has(sceneId)) {
      this.frameChangeCallbacks.set(sceneId, new Set());
    }

    const callbacks = this.frameChangeCallbacks.get(sceneId)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Get playback state for all scenes
   */
  getAllSceneStates(): ScenePlaybackState[] {
    return Array.from(this.sceneStates.values());
  }

  /**
   * Get global playback state
   */
  getGlobalState() {
    return {
      isPlaying: this.isGloballyPlaying,
      speed: this.globalSpeed,
      fps: this.fps,
      sceneCount: this.sceneStates.size
    };
  }

  /**
   * Notify subscribers of frame change
   */
  private notifyFrameChange(sceneId: string, frameIndex: number): void {
    const callbacks = this.frameChangeCallbacks.get(sceneId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(frameIndex);
        } catch (error) {
          console.error(`Error in frame change callback for ${sceneId}:`, error);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.frameAdvanceInterval) {
      clearInterval(this.frameAdvanceInterval);
      this.frameAdvanceInterval = null;
    }

    this.sceneStates.clear();
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
