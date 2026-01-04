import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export class ScrubManager {
  private static wasPlaying: boolean = false;

  static onScrubStart(): void {
    const engine = getGlobalPlaybackEngine();
    this.wasPlaying = engine.getState().isPlaying;
    engine.pause();
  }

  static onScrubMove(time: number): void {
    const engine = getGlobalPlaybackEngine();
    engine.seek(time);
  }

  static onScrubEnd(): void {
    const engine = getGlobalPlaybackEngine();
    if (this.wasPlaying) {
      engine.play();
    }
  }
}
