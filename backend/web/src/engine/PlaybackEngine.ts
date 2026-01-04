export interface PlaybackState {
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

export interface SceneConfig {
  sceneId: string;
  offset: number;
  windowStart: number;
  windowDuration: number;
}

export type PlaybackListener = (state: PlaybackState) => void;

const DRIFT_THRESHOLD = 50;

export class PlaybackEngine {
  private playbackTime: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private listeners: Set<PlaybackListener> = new Set();
  private scenes: Map<string, SceneConfig> = new Map();

  constructor() {
    this.startRafLoop();
  }

  private startRafLoop(): void {
    const loop = (currentTime: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }

      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      if (this.isPlaying) {
        this.playbackTime += deltaTime * this.playbackSpeed;
      }

      this.notifyListeners();
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
    console.log('%c[PlaybackEngine] 🎬 RAF loop started', 'color: #4ECDC4; font-weight: bold;');
  }

  private notifyListeners(): void {
    const state: PlaybackState = {
      playbackTime: this.playbackTime,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
    };

    if (this.isPlaying && this.playbackTime % 1000 < 50) {
      console.log('%c[PlaybackEngine] ⏱️  Playback advancing:', 'color: #4ECDC4;', {
        playbackTime: this.playbackTime,
        isPlaying: this.isPlaying,
      });
    }

    this.listeners.forEach((listener) => listener(state));
  }

  play(): void {
    console.log('%c[PlaybackEngine] ▶️  Play', 'color: #00FF00; font-weight: bold;', {
      playbackTime: this.playbackTime,
      sceneCount: this.scenes.size,
    });
    this.isPlaying = true;
    this.lastFrameTime = 0;
    this.notifyListeners();
  }

  pause(): void {
    console.log('%c[PlaybackEngine] ⏸️  Pause', 'color: #FF6B6B; font-weight: bold;', {
      playbackTime: this.playbackTime,
    });
    this.isPlaying = false;
    this.notifyListeners();
  }

  seek(time: number): void {
    const clampedTime = Math.max(0, time);
    console.log('%c[PlaybackEngine] ⏱️  Seek', 'color: #4ECDC4;', {
      from: this.playbackTime,
      to: clampedTime,
      sceneCount: this.scenes.size,
    });
    this.playbackTime = clampedTime;
    this.lastFrameTime = 0;
    this.notifyListeners();
  }

  setSpeed(speed: number): void {
    const clampedSpeed = Math.max(0, speed);
    console.log('%c[PlaybackEngine] 🎚️  Speed changed:', 'color: #4ECDC4;', {
      from: this.playbackSpeed,
      to: clampedSpeed,
    });
    this.playbackSpeed = clampedSpeed;
    this.notifyListeners();
  }

  getPlaybackTime(): number {
    return this.playbackTime;
  }

  getState(): PlaybackState {
    return {
      playbackTime: this.playbackTime,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
    };
  }

  getSceneLocalTime(sceneId: string): number {
    const scene = this.scenes.get(sceneId);
    if (!scene) return 0;

    const localTime = this.playbackTime - scene.offset;
    return Math.max(
      scene.windowStart,
      Math.min(localTime, scene.windowStart + scene.windowDuration)
    );
  }

  getSceneConfig(sceneId: string): SceneConfig | undefined {
    return this.scenes.get(sceneId);
  }

  registerScene(config: SceneConfig): void {
    console.log('%c[PlaybackEngine] 📋 Scene registered:', 'color: #4ECDC4;', {
      sceneId: config.sceneId,
      offset: config.offset,
      windowStart: config.windowStart,
      windowDuration: config.windowDuration,
      totalScenes: this.scenes.size + 1,
    });
    this.scenes.set(config.sceneId, config);
  }

  unregisterScene(sceneId: string): void {
    console.log('%c[PlaybackEngine] 🗑️  Scene unregistered:', 'color: #FF6B6B;', {
      sceneId,
      remainingScenes: this.scenes.size - 1,
    });
    this.scenes.delete(sceneId);
  }

  subscribe(listener: PlaybackListener): () => void {
    console.log('%c[PlaybackEngine] 👂 Listener subscribed', 'color: #4ECDC4;', {
      totalListeners: this.listeners.size + 1,
    });
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      console.log('%c[PlaybackEngine] 👂 Listener unsubscribed', 'color: #FF6B6B;', {
        remainingListeners: this.listeners.size - 1,
      });
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.listeners.clear();
    this.scenes.clear();
  }
}

let globalPlaybackEngine: PlaybackEngine | null = null;

export function getGlobalPlaybackEngine(): PlaybackEngine {
  if (!globalPlaybackEngine) {
    globalPlaybackEngine = new PlaybackEngine();
  }
  return globalPlaybackEngine;
}

export function destroyGlobalPlaybackEngine(): void {
  if (globalPlaybackEngine) {
    globalPlaybackEngine.destroy();
    globalPlaybackEngine = null;
  }
}
