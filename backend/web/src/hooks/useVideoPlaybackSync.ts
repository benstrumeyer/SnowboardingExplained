import { useEffect } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export function useVideoPlaybackSync(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const engine = getGlobalPlaybackEngine();
    const video = videoRef.current;

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'play') {
        video.play().catch(() => { });
      } else if (event.type === 'pause') {
        video.pause();
      } else if (event.type === 'speedChanged') {
        video.playbackRate = Math.abs(event.speed);
      } else if (event.type === 'timeSet') {
        video.currentTime = event.time / 1000;
      } else if (event.type === 'frameUpdate') {
        // Sync video to engine time on every frame
        video.currentTime = engine.playbackTime / 1000;
      }
    });

    return unsubscribe;
  }, [videoRef, enabled]);
}
