/**
 * Synced Scene Viewer Component
 * Integrates PlaybackSyncService with scene rendering
 * Maintains independent frame positions while playing at same speed
 */

import React, { useEffect, useRef, useState } from 'react';
import { PlaybackSyncService, getPlaybackSyncService } from '../services/playbackSyncService';
import { FrameDataService, getFrameDataService } from '../services/frameDataService';
import { OverlayToggleService, getOverlayToggleService } from '../services/overlayToggleService';

export interface SyncedSceneViewerProps {
  sceneId: string;
  videoId: string;
  width?: number;
  height?: number;
  fps?: number;
}

export const SyncedSceneViewer: React.FC<SyncedSceneViewerProps> = ({
  sceneId,
  videoId,
  width = 640,
  height = 480
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const playbackService = useRef<PlaybackSyncService | null>(null);
  const frameDataService = useRef<FrameDataService | null>(null);
  const overlayService = useRef<OverlayToggleService | null>(null);
  const unsubscribeFrame = useRef<(() => void) | null>(null);
  const unsubscribeOverlay = useRef<(() => void) | null>(null);

  // Initialize services
  useEffect(() => {
    playbackService.current = getPlaybackSyncService();
    frameDataService.current = getFrameDataService();
    overlayService.current = getOverlayToggleService();

    return () => {
      if (unsubscribeFrame.current) {
        unsubscribeFrame.current();
      }
      if (unsubscribeOverlay.current) {
        unsubscribeOverlay.current();
      }
    };
  }, []);

  // Subscribe to frame changes
  useEffect(() => {
    if (!playbackService.current) return;

    // Subscribe to frame changes for this scene
    unsubscribeFrame.current = playbackService.current.onSceneFrameChange(sceneId, (newFrameIndex) => {
      setFrameIndex(newFrameIndex);
    });

    return () => {
      if (unsubscribeFrame.current) {
        unsubscribeFrame.current();
      }
    };
  }, [sceneId]);

  // Subscribe to overlay toggle changes
  useEffect(() => {
    if (!overlayService.current) return;

    unsubscribeOverlay.current = overlayService.current.onOverlayToggle(sceneId, (isEnabled) => {
      setIsOverlayEnabled(isEnabled);
    });

    return () => {
      if (unsubscribeOverlay.current) {
        unsubscribeOverlay.current();
      }
    };
  }, [sceneId]);

  // Render frame when frameIndex or overlay state changes
  useEffect(() => {
    const renderFrame = async () => {
      if (!canvasRef.current || !frameDataService.current) return;

      setIsLoading(true);
      try {
        // Fetch frame data
        const frameData = await frameDataService.current.getFrame(videoId, frameIndex, {
          includeOriginal: true,
          includeOverlay: isOverlayEnabled,
          includeMesh: true
        });

        // Get canvas context
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Determine which frame to display
        const frameToDisplay = isOverlayEnabled && frameData.overlayFrame ? frameData.overlayFrame : frameData.originalFrame;

        if (frameToDisplay) {
          // Convert base64 to image
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, width, height);
          };
          img.src = `data:image/jpeg;base64,${frameToDisplay}`;
        }

        // Draw mesh if available
        if (frameData.meshData && frameData.meshData.keypoints) {
          drawMesh(ctx, frameData.meshData.keypoints, frameData.meshData.skeleton, width, height);
        }
      } catch (error) {
        console.error(`Error rendering frame for ${sceneId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    renderFrame();
  }, [frameIndex, isOverlayEnabled, videoId, sceneId, width, height]);

  const handleToggleOverlay = () => {
    if (overlayService.current) {
      overlayService.current.toggleOverlay(sceneId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ccc', backgroundColor: '#000' }}
      />
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span>Frame: {frameIndex}</span>
        <button onClick={handleToggleOverlay} disabled={isLoading}>
          {isOverlayEnabled ? 'Hide Overlay' : 'Show Overlay'}
        </button>
        {isLoading && <span>Loading...</span>}
      </div>
    </div>
  );
};

/**
 * Draw mesh skeleton on canvas
 */
function drawMesh(
  ctx: CanvasRenderingContext2D,
  keypoints: any[],
  skeleton: any,
  _canvasWidth: number,
  _canvasHeight: number
): void {
  // Draw connections
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;

  if (skeleton && skeleton.connections) {
    for (const [startIdx, endIdx] of skeleton.connections) {
      if (startIdx < keypoints.length && endIdx < keypoints.length) {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];

        if (start && end) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }
    }
  }

  // Draw keypoints
  ctx.fillStyle = '#FF0000';
  const radius = 5;

  for (const keypoint of keypoints) {
    if (keypoint && keypoint.confidence > 0.5) {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
