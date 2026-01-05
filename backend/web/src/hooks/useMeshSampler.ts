import { useEffect, useRef } from 'react';
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
  const lastFrameIndexRef = useRef(-1);

  useEffect(() => {
    if (!enabled || !meshDataRef.current || !onFrameUpdate) return;

    const engine = getGlobalPlaybackEngine();

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate' || event.type === 'timeSet') {
        const frameIndex = engine.getFrameIndex(engine.playbackTime);
        const meshData = meshDataRef.current?.[frameIndex];

        // Only update if frame index changed
        if (frameIndex !== lastFrameIndexRef.current && meshData) {
          lastFrameIndexRef.current = frameIndex;
          onFrameUpdate(meshData);
        }
      }
    });

    return unsubscribe;
  }, [cellId, fps, enabled, onFrameUpdate, meshDataRef]);
}
