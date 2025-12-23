import { useState, useEffect, useCallback } from 'react';
import { FrameData, getFrameDataService } from '../services/frameDataService';

export interface UseFrameDataOptions {
  includeOriginal?: boolean;
  includeOverlay?: boolean;
  includeMesh?: boolean;
  autoPreload?: boolean;
  preloadCount?: number;
}

export interface UseFrameDataResult {
  frameData: FrameData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFrameData(
  videoId: string,
  frameIndex: number,
  options: UseFrameDataOptions = {}
): UseFrameDataResult {
  const {
    includeOriginal = true,
    includeOverlay = true,
    includeMesh = true,
    autoPreload = true,
    preloadCount = 10
  } = options;

  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const frameDataService = getFrameDataService();

  const fetchFrame = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await frameDataService.getFrame(videoId, frameIndex, {
        includeOriginal,
        includeOverlay,
        includeMesh
      });
      setFrameData(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Error fetching frame ${videoId}/${frameIndex}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, frameIndex, includeOriginal, includeOverlay, includeMesh, frameDataService]);

  useEffect(() => {
    fetchFrame();
  }, [fetchFrame]);

  useEffect(() => {
    if (autoPreload) {
      frameDataService.preloadFrames(videoId, frameIndex + 1, preloadCount).catch(err => {
        console.warn('Error preloading frames:', err);
      });
    }
  }, [videoId, frameIndex, autoPreload, preloadCount, frameDataService]);

  return {
    frameData,
    isLoading,
    error,
    refetch: fetchFrame
  };
}
