import { useState, useCallback, useEffect, useRef } from 'react';
import { MeshSequence } from '../types';

interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number;
  riderFrameOffset: number;
  referenceFrameOffset: number;
  riderRotation: { x: number; y: number; z: number };
  referenceRotation: { x: number; y: number; z: number };
  showRider: boolean;
  showReference: boolean;
  referenceOpacity: number;
}

export function useSynchronizedPlayback(
  riderMesh: MeshSequence | null,
  referenceMesh: MeshSequence | null
) {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentFrame: 0,
    playbackSpeed: 1,
    riderFrameOffset: 0,
    referenceFrameOffset: 0,
    riderRotation: { x: 0, y: 0, z: 0 },
    referenceRotation: { x: 0, y: 0, z: 0 },
    showRider: true,
    showReference: true,
    referenceOpacity: 0.7,
  });

  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());

  // Playback loop
  useEffect(() => {
    if (!state.isPlaying) {
      return;
    }

    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setState((prev) => {
        const fps = (riderMesh?.fps || referenceMesh?.fps || 30);
        const frameAdvance = prev.playbackSpeed * deltaTime * fps;
        const newFrame = prev.currentFrame + frameAdvance;

        const maxFrames = Math.max(
          (riderMesh?.frames?.length || 0),
          (referenceMesh?.frames?.length || 0)
        );

        if (newFrame >= maxFrames) {
          return { ...prev, isPlaying: false, currentFrame: maxFrames - 1 };
        }

        return { ...prev, currentFrame: newFrame };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, riderMesh, referenceMesh]);

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
    lastTimeRef.current = Date.now();
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const scrub = useCallback((frame: number) => {
    setState((prev) => ({ ...prev, currentFrame: frame, isPlaying: false }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const setFrameOffset = useCallback((meshName: 'rider' | 'reference', offset: number) => {
    setState((prev) => ({
      ...prev,
      [meshName === 'rider' ? 'riderFrameOffset' : 'referenceFrameOffset']: offset,
    }));
  }, []);

  const setRotation = useCallback(
    (meshName: 'rider' | 'reference', axis: 'x' | 'y' | 'z', angle: number) => {
      setState((prev) => {
        const rotationKey = meshName === 'rider' ? 'riderRotation' : 'referenceRotation';
        return {
          ...prev,
          [rotationKey]: {
            ...prev[rotationKey],
            [axis]: angle,
          },
        };
      });
    },
    []
  );

  const setVisibility = useCallback((meshName: 'rider' | 'reference', visible: boolean) => {
    setState((prev) => ({
      ...prev,
      [meshName === 'rider' ? 'showRider' : 'showReference']: visible,
    }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    setState((prev) => ({ ...prev, referenceOpacity: opacity }));
  }, []);

  const getDisplayFrames = useCallback(() => {
    if (!riderMesh || !referenceMesh || !riderMesh.frames || !referenceMesh.frames) {
      return { riderFrame: 0, referenceFrame: 0 };
    }

    const riderFrame = Math.min(
      Math.floor(state.currentFrame + state.riderFrameOffset),
      riderMesh.frames.length - 1
    );
    const referenceFrame = Math.min(
      Math.floor(state.currentFrame + state.referenceFrameOffset),
      referenceMesh.frames.length - 1
    );

    return { riderFrame: Math.max(0, riderFrame), referenceFrame: Math.max(0, referenceFrame) };
  }, [state.currentFrame, state.riderFrameOffset, state.referenceFrameOffset, riderMesh, referenceMesh]);

  return {
    ...state,
    play,
    pause,
    scrub,
    setSpeed,
    setFrameOffset,
    setRotation,
    setVisibility,
    setOpacity,
    getDisplayFrames,
  };
}
