import { useEffect, useRef } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export function useVideoSampler(
  cellId: string,
  ref: React.RefObject<HTMLVideoElement | HTMLCanvasElement>,
  enabled: boolean,
  onFrameIndex?: (frameIndex: number) => void,
  fps: number = 30
) {
  const fpsRef = useRef(fps);
  const callbackRef = useRef(onFrameIndex);

  // Keep latest fps + callback without resubscribing
  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);

  useEffect(() => {
    callbackRef.current = onFrameIndex;
  }, [onFrameIndex]);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const engine = getGlobalPlaybackEngine();
    let lastFrameIndex = -1;

    const listener = (event: any) => {
      if (!ref.current || event.type !== 'frameUpdate') return;

      const scene = engine.getSceneConfig(cellId);
      const playbackTime = engine.playbackTime;

      // Default: use global playback time
      let sceneTimeMs = playbackTime;

      // Scene-aware looping
      if (scene && scene.windowDuration > 0) {
        const rawLocalTime =
          playbackTime - scene.offset - scene.windowStart;

        const duration = scene.windowDuration;

        // Proper modulo that works for negative time
        const loopedTime =
          ((rawLocalTime % duration) + duration) % duration;

        sceneTimeMs = scene.windowStart + loopedTime;
      }

      const videoTime = sceneTimeMs / 1000;
      const frameIndex = Math.floor(videoTime * fpsRef.current);

      // ---- HTMLVideoElement ----
      if (ref.current instanceof HTMLVideoElement) {
        if (Math.abs(ref.current.currentTime - videoTime) > 0.05) {
          ref.current.currentTime = videoTime;
        }
        return;
      }

      // ---- HTMLCanvasElement ----
      if (ref.current instanceof HTMLCanvasElement) {
        if (!callbackRef.current) return;

        if (frameIndex !== lastFrameIndex) {
          lastFrameIndex = frameIndex;
          callbackRef.current(frameIndex);
        }
      }
    };

    const unsubscribe = engine.addEventListener(listener);

    return () => {
      unsubscribe();
    };
  }, [cellId, enabled]);
}
