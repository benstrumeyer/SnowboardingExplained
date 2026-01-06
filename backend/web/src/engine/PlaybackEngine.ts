export type PlaybackEvent =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'timeSet'; time: number }
  | { type: 'speedChanged'; speed: number }
  | { type: 'reverseToggled'; isReversing: boolean }
  | { type: 'loopToggled'; isLooping: boolean }
  | { type: 'frameUpdate' }
  | { type: 'windowChange'; sceneId: string }
  | { type: 'cellIndependentPlayback'; cellId: string; isIndependent: boolean }
  | { type: 'cellPlay'; cellId: string }
  | { type: 'cellPause'; cellId: string }
  | { type: 'cellFrameNext'; cellId: string }
  | { type: 'cellFramePrev'; cellId: string };

export interface SceneConfig {
  sceneId: string;
  offset: number;
  windowStart: number;
  windowDuration: number;
  videoElement?: HTMLVideoElement;
}

export type PlaybackEventListener = (event: PlaybackEvent) => void;

export class PlaybackEngine {
  private _playbackTime: number = 0;
  private _isPlaying: boolean = false;
  private _playbackSpeed: number = 1;
  private _isReversing: boolean = false;
  private _isLooping: boolean = true;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private eventListeners: Set<PlaybackEventListener> = new Set();
  private scenes: Map<string, SceneConfig> = new Map();
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private frameIntervalMs: number;
  private totalFrames: number;
  private _duration: number;
  private independentCells: Set<string> = new Set();
  private cellPlaybackTimes: Map<string, number> = new Map();
  private cellPlaybackSpeeds: Map<string, number> = new Map();

  get playbackTime(): number {
    return this._playbackTime;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get playbackSpeed(): number {
    return this._playbackSpeed;
  }

  get isReversing(): boolean {
    return this._isReversing;
  }

  get isLooping(): boolean {
    return this._isLooping;
  }

  get duration(): number {
    return this._duration;
  }

  constructor(fps: number = 30, totalFrames: number = 300) {
    this.frameIntervalMs = 1000 / fps;
    this.totalFrames = totalFrames;
    this._duration = (totalFrames / fps) * 1000;
    this.startRafLoop();
  }

  reinitialize(fps: number, totalFrames: number): void {
    this.frameIntervalMs = 1000 / fps;
    this.totalFrames = totalFrames;
    this._duration = (totalFrames / fps) * 1000;
    this._playbackTime = 0;
    this.lastFrameTime = 0;
  }

  private startRafLoop(): void {
    const loop = (currentTime: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }

      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      if (this._isPlaying) {
        this._playbackTime += deltaTime * this._playbackSpeed;
        this.handleLooping();
      }

      this.emitEvent({ type: 'frameUpdate' });
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private handleLooping(): void {
    if (this._isLooping) {
      if (this._playbackTime >= this.duration) {
        this._playbackTime = this._playbackTime % this.duration;
      } else if (this._playbackTime < 0) {
        this._playbackTime = this.duration + (this._playbackTime % this.duration);
      }
    } else {
      if (this._playbackTime < 0) this._playbackTime = 0;
      if (this._playbackTime > this.duration) this._playbackTime = this.duration;
    }
  }

  private emitEvent(event: PlaybackEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  play(): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this.lastFrameTime = 0;

    for (const video of this.videoElements.values()) {
      video.play().catch(() => {});
    }

    this.emitEvent({ type: 'play' });
  }

  pause(): void {
    if (!this._isPlaying) return;
    this._isPlaying = false;

    for (const video of this.videoElements.values()) {
      video.pause();
    }

    this.emitEvent({ type: 'pause' });
  }

  seek(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this.duration));
    this._playbackTime = clampedTime;
    this.lastFrameTime = 0;

    for (const video of this.videoElements.values()) {
      video.currentTime = clampedTime / 1000;
    }

    this.emitEvent({ type: 'timeSet', time: clampedTime });
  }

  setSpeed(speed: number): void {
    if (this._playbackSpeed === speed) return;
    this._playbackSpeed = speed;
    this._isReversing = speed < 0;

    for (const video of this.videoElements.values()) {
      video.playbackRate = Math.abs(speed);
    }

    this.emitEvent({ type: 'speedChanged', speed });
  }

  toggleReverse(): void {
    this._isReversing = !this._isReversing;
    this._playbackSpeed = Math.abs(this._playbackSpeed) * (this._isReversing ? -1 : 1);
    this.emitEvent({ type: 'reverseToggled', isReversing: this._isReversing });
  }

  toggleLoop(): void {
    this._isLooping = !this._isLooping;
    this.emitEvent({ type: 'loopToggled', isLooping: this._isLooping });
  }

  getFrameIndex(time: number): number {
    return Math.floor(time / this.frameIntervalMs) % this.totalFrames;
  }

  advanceFrame(direction: 1 | -1 = 1): void {
    const currentFrameIndex = this.getFrameIndex(this._playbackTime);
    const nextFrameIndex = (currentFrameIndex + direction + this.totalFrames) % this.totalFrames;
    const nextTime = nextFrameIndex * this.frameIntervalMs;
    this.seek(nextTime);

    for (const cellId of this.independentCells) {
      const video = this.videoElements.get(cellId);
      if (!video) continue;

      const videoDuration = video.duration * 1000;
      const cellTime = video.currentTime * 1000;

      const cellFrameIndex = Math.floor(cellTime / this.frameIntervalMs);
      const nextCellFrameIndex = (cellFrameIndex + direction + this.totalFrames) % this.totalFrames;
      const nextCellTime = nextCellFrameIndex * this.frameIntervalMs;
      
      const clampedTime = Math.max(0, Math.min(nextCellTime, videoDuration));
      this.setCellPlaybackTime(cellId, clampedTime);
    }
  }

  advanceIndependentCellFrame(cellId: string, direction: 1 | -1 = 1): void {
    const video = this.videoElements.get(cellId);
    if (!video) return;

    const videoDuration = video.duration * 1000;
    const cellTime = video.currentTime * 1000;
    const cellFrameIndex = Math.floor(cellTime / this.frameIntervalMs);
    let nextCellFrameIndex = cellFrameIndex + direction;
    
    if (nextCellFrameIndex < 0) {
      nextCellFrameIndex = this.totalFrames - 1;
    } else if (nextCellFrameIndex >= this.totalFrames) {
      nextCellFrameIndex = 0;
    }
    
    const nextCellTime = nextCellFrameIndex * this.frameIntervalMs;
    const clampedTime = Math.max(0, Math.min(nextCellTime, videoDuration));
    this.setCellPlaybackTime(cellId, clampedTime);
  }

  getSceneLocalTime(sceneId: string): number {
    const scene = this.scenes.get(sceneId);
    if (!scene) return 0;
    return this._playbackTime - scene.offset;
  }

  getSceneConfig(sceneId: string): SceneConfig | undefined {
    return this.scenes.get(sceneId);
  }

  registerScene(config: SceneConfig): void {
    this.scenes.set(config.sceneId, config);
  }

  unregisterScene(sceneId: string): void {
    this.scenes.delete(sceneId);
  }

  registerVideoElement(cellId: string, videoElement: HTMLVideoElement): void {
    this.videoElements.set(cellId, videoElement);
  }

  unregisterVideoElement(cellId: string): void {
    this.videoElements.delete(cellId);
  }

  addEventListener(listener: PlaybackEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  setIndependentPlayback(cellId: string, isIndependent: boolean): void {
    if (isIndependent) {
      this.independentCells.add(cellId);
      const video = this.videoElements.get(cellId);
      if (video) {
        this.cellPlaybackTimes.set(cellId, video.currentTime * 1000);
        this.cellPlaybackSpeeds.set(cellId, video.playbackRate);
      }
    } else {
      this.independentCells.delete(cellId);
      this.cellPlaybackTimes.delete(cellId);
      this.cellPlaybackSpeeds.delete(cellId);
      const video = this.videoElements.get(cellId);
      if (video) {
        video.currentTime = this._playbackTime / 1000;
      }
    }
    this.emitEvent({ type: 'cellIndependentPlayback', cellId, isIndependent });
  }

  isIndependent(cellId: string): boolean {
    return this.independentCells.has(cellId);
  }

  getCellPlaybackTime(cellId: string): number {
    return this.cellPlaybackTimes.get(cellId) || 0;
  }

  setCellPlaybackTime(cellId: string, time: number): void {
    this.cellPlaybackTimes.set(cellId, time);
    const video = this.videoElements.get(cellId);
    if (video) {
      video.currentTime = time / 1000;
    }
  }

  setCellPlaybackSpeed(cellId: string, speed: number): void {
    this.cellPlaybackSpeeds.set(cellId, speed);
    const video = this.videoElements.get(cellId);
    if (video) {
      video.playbackRate = Math.abs(speed);
    }
  }

  playCellVideo(cellId: string): void {
    const video = this.videoElements.get(cellId);
    if (video) {
      video.play().catch(() => {});
    }
    this.emitEvent({ type: 'cellPlay', cellId });
  }

  pauseCellVideo(cellId: string): void {
    const video = this.videoElements.get(cellId);
    if (video) {
      video.pause();
    }
    this.emitEvent({ type: 'cellPause', cellId });
  }

  cellFrameNext(cellId: string): void {
    this.emitEvent({ type: 'cellFrameNext', cellId });
  }

  cellFramePrev(cellId: string): void {
    this.emitEvent({ type: 'cellFramePrev', cellId });
  }

  getAllCellIds(): string[] {
    return Array.from(this.videoElements.keys());
  }

  getVideoElement(cellId: string): HTMLVideoElement | undefined {
    return this.videoElements.get(cellId);
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
