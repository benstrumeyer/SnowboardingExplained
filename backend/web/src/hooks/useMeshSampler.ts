import { useEffect } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export interface MeshFrameData {
  frameNumber: number;
  vertices: Float32Array;
  faces: Uint32Array;
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focal_length: number;
  };
}

export function useMeshSampler(
  cellId: string,
  meshDataRef: React.RefObject<MeshFrameData[]>,
  fps: number,
  enabled: boolean,
  onFrameUpdate?: (frame: MeshFrameData) => void
) {
  useEffect(() => {
    if (!enabled || !meshDataRef.current || !onFrameUpdate) return;

    const engine = getGlobalPlaybackEngine();
    const frameInterval = 1000 / fps;
    const totalFrames = meshDataRef.current.length;
    const windowDuration = (totalFrames / fps) * 1000;

    const unsubscribe = engine.subscribe((state) => {
      const localTime = engine.getSceneLocalTime(cellId);

      const loopedTime = localTime % windowDuration;
      const frameIndex = Math.floor(loopedTime / frameInterval);
      const meshData = meshDataRef.current?.[frameIndex];

      if (meshData) {
        onFrameUpdate(meshData);
      }
    });

    return unsubscribe;
  }, [cellId, fps, enabled, onFrameUpdate]);
}
