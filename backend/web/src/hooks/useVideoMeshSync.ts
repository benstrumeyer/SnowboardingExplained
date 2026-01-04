import { useEffect } from 'react';
import { MeshFrameData } from './useMeshSampler';

export function useVideoMeshSync(
  videoRef: React.RefObject<HTMLVideoElement> | undefined,
  meshDataRef: React.RefObject<MeshFrameData[]>,
  fps: number,
  enabled: boolean,
  onFrameUpdate?: (frame: MeshFrameData) => void
) {
  useEffect(() => {
    if (!enabled || !videoRef?.current || !meshDataRef.current || !onFrameUpdate) return;

    let rafId: number;

    const updateMesh = () => {
      const video = videoRef.current;
      if (!video) return;

      const videoTime = video.currentTime;
      const frameIndex = Math.floor(videoTime * fps);
      const clampedIndex = Math.max(0, Math.min(frameIndex, meshDataRef.current!.length - 1));

      const meshData = meshDataRef.current?.[clampedIndex];
      if (meshData) {
        onFrameUpdate(meshData);
      }

      rafId = requestAnimationFrame(updateMesh);
    };

    rafId = requestAnimationFrame(updateMesh);

    return () => cancelAnimationFrame(rafId);
  }, [videoRef, meshDataRef, fps, enabled, onFrameUpdate]);
}
