import { useEffect, useRef } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { MeshFrameData } from './useMeshSampler';

export function useVideoMeshSync(
  videoRef: React.RefObject<HTMLVideoElement> | undefined,
  meshDataRef: React.RefObject<MeshFrameData[]>,
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

        if (frameIndex !== lastFrameIndexRef.current && meshData) {
          lastFrameIndexRef.current = frameIndex;
          onFrameUpdate(meshData);
        }
      }
    });

    return unsubscribe;
  }, [videoRef, meshDataRef, enabled, onFrameUpdate]);
}
