/**
 * Synced Scene Viewer Component
 * Displays video on left, mesh on right
 * Maintains synchronized playback
 */

import React, { useEffect, useRef, useState } from 'react';
import { PlaybackSyncService, getPlaybackSyncService } from '../services/playbackSyncService';
import { FrameDataService, getFrameDataService } from '../services/frameDataService';

export interface SyncedSceneViewerProps {
  videoId: string;
  width?: number;
  height?: number;
  fps?: number;
}

export const SyncedSceneViewer: React.FC<SyncedSceneViewerProps> = ({
  videoId,
  width = 640,
  height = 480
}) => {
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const playbackService = useRef<PlaybackSyncService | null>(null);
  const frameDataService = useRef<FrameDataService | null>(null);
  const unsubscribeFrame = useRef<(() => void) | null>(null);

  // Initialize services
  useEffect(() => {
    playbackService.current = getPlaybackSyncService();
    frameDataService.current = getFrameDataService();

    // Sync playback service to video element when it's ready
    if (videoElementRef.current && playbackService.current) {
      playbackService.current.syncToVideoElement(videoElementRef.current);
    }

    return () => {
      if (unsubscribeFrame.current) {
        unsubscribeFrame.current();
      }
    };
  }, []);

  // Subscribe to frame changes
  useEffect(() => {
    if (!playbackService.current) return;

    // Subscribe to frame changes for main scene
    // @ts-ignore
    unsubscribeFrame.current = playbackService.current.onSceneFrameChange('main', (newFrameIndex: number) => {
      setFrameIndex(newFrameIndex);
    });

    return () => {
      if (unsubscribeFrame.current) {
        unsubscribeFrame.current();
      }
    };
  }, []);

  // Render frames when frameIndex or overlay state changes
  useEffect(() => {
    const renderFrames = async () => {
      if (!meshCanvasRef.current || !frameDataService.current) return;

      setIsLoading(true);
      try {
        // Fetch frame data
        const frameData = await frameDataService.current.getFrame(videoId, frameIndex, {
          includeOriginal: false,
          includeOverlay: false,
          includeMesh: true
        });

        // Render mesh on canvas
        const meshCtx = meshCanvasRef.current.getContext('2d');
        if (meshCtx && frameData.meshData) {
          // Clear canvas
          meshCtx.fillStyle = '#000';
          meshCtx.fillRect(0, 0, width, height);

          // Draw mesh if available
          if (frameData.meshData.keypoints) {
            drawMesh(meshCtx, frameData.meshData.keypoints, frameData.meshData.skeleton, width, height);
          }
        }
      } catch (error) {
        console.error(`Error rendering frames:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    renderFrames();
  }, [frameIndex, videoId, width, height]);

  const handleToggleOverlay = () => {
    // TODO: Implement overlay toggle when overlayService is available
    console.log('Overlay toggle requested');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {/* Side-by-side viewers */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        {/* Video on left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <h3 style={{ margin: '0', color: '#fff' }}>Video</h3>
          <video
            ref={videoElementRef}
            width={width}
            height={height}
            controls
            style={{ border: '2px solid #4ECDC4', backgroundColor: '#000', borderRadius: '4px' }}
          />
        </div>

        {/* Mesh on right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <h3 style={{ margin: '0', color: '#fff' }}>Mesh</h3>
          <canvas
            ref={meshCanvasRef}
            width={width}
            height={height}
            style={{ border: '2px solid #4ECDC4', backgroundColor: '#000', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff' }}>Frame: {frameIndex}</span>
        {isLoading && <span style={{ color: '#999' }}>Loading...</span>}
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
