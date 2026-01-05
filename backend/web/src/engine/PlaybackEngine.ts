export type PlaybackEvent =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'timeSet'; time: number }
  | { type: 'speedChanged'; speed: number }
  | { type: 'windowChange'; sceneId: string };

export interface SceneConfig {
  sceneId: string;
  offset: number;
  windowStart: number;
  windowDuration: number;
  videoElement?: HTMLVideoElement;
}

export type PlaybackEventListener = (event: PlaybackEvent) => void;

export class PlaybackEngine {
  playbackTime: number = 0;
  isPlaying: boolean = false;
  playbackSpeed: number = 1;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private eventListeners: Set<PlaybackEventListener> = new Set();
  private scenes: Map<string, SceneConfig> = new Map();
  private videoElements: Map<string, HTMLVideoElement> = new Map();

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

      for (const scene of this.scenes.values()) {
        if (scene.videoElement && !scene.videoElement.paused) {
          this.playbackTime = scene.videoElement.currentTime * 1000;
        }
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
    console.log('%c[PlaybackEngine] 🎬 RAF loop started', 'color: #4ECDC4; font-weight: bold;');
  }

  private emitEvent(event: PlaybackEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  play(): void {
    if (this.isPlaying) return;

    console.log('%c[PlaybackEngine] ▶️  Play', 'color: #00FF00; font-weight: bold;', {
      playbackTime: this.playbackTime,
      sceneCount: this.scenes.size,
    });

    this.isPlaying = true;
    this.lastFrameTime = 0;

    for (const video of this.videoElements.values()) {
      video.play().catch(() => { });
    }

    this.emitEvent({ type: 'play' });
  }

  pause(): void {
    if (!this.isPlaying) return;

    console.log('%c[PlaybackEngine] ⏸️  Pause', 'color: #FF6B6B; font-weight: bold;', {
      playbackTime: this.playbackTime,
    });

    this.isPlaying = false;

    for (const video of this.videoElements.values()) {
      video.pause();
    }

    this.emitEvent({ type: 'pause' });
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

    for (const video of this.videoElements.values()) {
      video.currentTime = clampedTime / 1000;
    }

    this.emitEvent({ type: 'timeSet'; time: clampedTime });
  }

  setSpeed(speed: number): void {
    const clampedSpeed = Math.max(0, speed);

    if (this.playbackSpeed === clampedSpeed) return;

    console.log('%c[PlaybackEngine] 🎚️  Speed changed:', 'color: #4ECDC4;', {
      from: this.playbackSpeed,
      to: clampedSpeed,
    });

    this.playbackSpeed = clampedSpeed;

    for (const video of this.videoElements.values()) {
      video.playbackRate = clampedSpeed;
    }

    this.emitEvent({ type: 'speedChanged'; speed: clampedSpeed });
  }

  getSceneLocalTime(sceneId: string): number {
    const scene = this.scenes.get(sceneId);
    if (!scene) return 0;
    return this.playbackTime - scene.offset;
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

  registerVideoElement(cellId: string, videoElement: HTMLVideoElement): void {
    console.log('%c[PlaybackEngine] 📹 Video element registered:', 'color: #4ECDC4;', {
      cellId,
      totalVideos: this.videoElements.size + 1,
    });
    this.videoElements.set(cellId, videoElement);
  }

  unregisterVideoElement(cellId: string): void {
    console.log('%c[PlaybackEngine] 🗑️  Video element unregistered:', 'color: #FF6B6B;', {
      cellId,
      remainingVideos: this.videoElements.size - 1,
    });
    this.videoElements.delete(cellId);
  }

  addEventListener(listener: PlaybackEventListener): () => void {
    console.log('%c[PlaybackEngine] 👂 Event listener added', 'color: #4ECDC4;', {
      totalListeners: this.eventListeners.size + 1,
    });
    this.eventListeners.add(listener);

    return () => {
      console.log('%c[PlaybackEngine] 👂 Event listener removed', 'color: #FF6B6B;', {
        remainingListeners: this.eventListeners.size - 1,
      });
      this.eventListeners.delete(listener);
    };
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.eventListeners.clear();
    this.scenes.clear();
    this.videoElements.clear();
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
