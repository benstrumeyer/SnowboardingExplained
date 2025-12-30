import { useState, useEffect, useCallback, useRef } from 'react';
import { PlaybackSyncService, getPlaybackSyncService } from '../services/playbackSyncService';

export interface UsePlaybackSyncOptions {
  fps?: number;
  defaultSpeed?: number;
}

export interface UsePlaybackSyncResult {
  frameIndex: number;
  isPlaying: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  seekByOffset: (offset: number) => Promise<void>;
  setFrameIndex: (frameIndex: number) => void;
  globalState: any;
}

export function usePlaybackSync(
  sceneId: string,
  options: UsePlaybackSyncOptions = {}
): UsePlaybackSyncResult {
  const [frameIndex, setFrameIndexState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(options.defaultSpeed || 1.0);
  const [globalState, setGlobalState] = useState<any>(null);

  const playbackService = useRef<PlaybackSyncService | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    playbackService.current = getPlaybackSyncService();
    return () => {
      if (unsubscribe.current) {
        unsubscribe.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!playbackService.current) return;

    // @ts-ignore
    unsubscribe.current = playbackService.current.onSceneFrameChange(sceneId, (newFrameIndex) => {
      setFrameIndexState(newFrameIndex);
    });

    // @ts-ignore
    const state = playbackService.current.getGlobalState();
    setGlobalState(state);
    setIsPlaying(state.isPlaying);
    setSpeedState(state.speed);

    return () => {
      if (unsubscribe.current) {
        unsubscribe.current();
      }
    };
  }, [sceneId]);

  const play = useCallback(() => {
    if (playbackService.current) {
      // @ts-ignore
      playbackService.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (playbackService.current) {
      // @ts-ignore
      playbackService.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    if (playbackService.current) {
      // @ts-ignore
      playbackService.current.setPlaybackSpeed(newSpeed);
      setSpeedState(newSpeed);
    }
  }, []);

  const seekByOffset = useCallback(async (offset: number) => {
    if (playbackService.current) {
      // @ts-ignore
      await playbackService.current.seekByOffset(offset);
    }
  }, []);

  const setFrameIndex = useCallback((newFrameIndex: number) => {
    if (playbackService.current) {
      // @ts-ignore
      playbackService.current.setSceneFrameIndex(sceneId, newFrameIndex);
    }
  }, [sceneId]);

  return {
    frameIndex,
    isPlaying,
    speed,
    play,
    pause,
    setSpeed,
    seekByOffset,
    setFrameIndex,
    globalState
  };
}
