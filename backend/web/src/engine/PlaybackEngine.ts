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

type PlaybackListener = (state: PlaybackState) => void;

export class PlaybackEngine {
  private playbackTime: number = 0;
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private listeners: Set<PlaybackListener> = new Set();
  private scenes: Map<string, SceneConfig> = new Map();

  constructor() {
    this.lastFrameTime = performance.now();
  }

  registerScene(config: SceneConfig): void {
    this.scenes.set(config.sceneId, config);
  }

  unregisterScene(sceneId: string): void {
    this.scenes.delete(sceneId);
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state: PlaybackState = {
      playbackTime: this.playbackTime,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
    };
    this.listeners.forEach((listener) => listener(state));
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.startRaf();
    this.notifyListeners();
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.notifyListeners();
  }

  seek(time: number): void {
    this.playbackTime = Math.max(0, time);
    this.notifyListeners();
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(2, speed));
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
    const config = this.scenes.get(sceneId);
    if (!config) return 0;

    const localTime = this.playbackTime - config.offset;
    return Math.max(
      config.windowStart,
      Math.min(localTime, config.windowStart + config.windowDuration)
    );
  }

  private startRaf(): void {
    if (this.rafId !== null) return;

    const loop = (currentTime: number) => {
      if (!this.isPlaying) {
        this.rafId = null;
        return;
      }

      const deltaTime = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;

      this.playbackTime += deltaTime * this.playbackSpeed * 1000;
      this.notifyListeners();

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isPlaying = false;
    this.playbackTime = 0;
    this.notifyListeners();
  }
}

export const globalPlaybackEngine = new PlaybackEngine();
