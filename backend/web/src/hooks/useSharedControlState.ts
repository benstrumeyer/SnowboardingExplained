import { useState, useCallback } from 'react';

export interface SharedControlState {
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number;
  cameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
}

export const useSharedControlState = () => {
  const [state, setState] = useState<SharedControlState>({
    isPlaying: false,
    currentFrame: 0,
    playbackSpeed: 1,
    cameraPreset: 'front',
  });

  const setIsPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, isPlaying: playing }));
  }, []);

  const setCurrentFrame = useCallback((frame: number) => {
    setState((prev) => ({ ...prev, currentFrame: frame }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const setCameraPreset = useCallback((preset: 'top' | 'front' | 'back' | 'left' | 'right') => {
    setState((prev) => ({ ...prev, cameraPreset: preset }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isPlaying: false,
      currentFrame: 0,
      playbackSpeed: 1,
      cameraPreset: 'front',
    });
  }, []);

  return {
    state,
    setIsPlaying,
    setCurrentFrame,
    setPlaybackSpeed,
    setCameraPreset,
    reset,
  };
};
