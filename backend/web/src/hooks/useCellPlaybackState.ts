import { useState, useCallback } from 'react';

export interface CellPlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  playbackSpeed: number;
  showOverlay: boolean;
}

export const useCellPlaybackState = (initialTotalFrames: number = 0) => {
  const [state, setState] = useState<CellPlaybackState>({
    isPlaying: false,
    currentFrame: 0,
    totalFrames: initialTotalFrames,
    playbackSpeed: 1,
    showOverlay: false,
  });

  const setCurrentFrame = useCallback((frame: number) => {
    setState((prev) => ({
      ...prev,
      currentFrame: Math.max(0, Math.min(frame, prev.totalFrames - 1)),
    }));
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const setShowOverlay = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showOverlay: show }));
  }, []);

  const setTotalFrames = useCallback((frames: number) => {
    setState((prev) => ({ ...prev, totalFrames: frames }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isPlaying: false,
      currentFrame: 0,
      totalFrames: initialTotalFrames,
      playbackSpeed: 1,
      showOverlay: false,
    });
  }, [initialTotalFrames]);

  return {
    state,
    setCurrentFrame,
    setIsPlaying,
    setPlaybackSpeed,
    setShowOverlay,
    setTotalFrames,
    reset,
  };
};
