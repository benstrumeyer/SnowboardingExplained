/**
 * Video Frame Renderer Component
 * Renders video frames from the frame-data API
 * Integrates with PlaybackSyncService for synchronized playback
 */

import React, { useEffect, useRef, useState } from 'react';
import { useFrameData } from '../hooks/useFrameData';

export interface VideoFrameRendererProps {
  videoId: string;
  frameIndex: number;
  width?: number;
  height?: number;
  showOverlay?: boolean;
  showMesh?: boolean;
}

export const VideoFrameRenderer: React.FC<VideoFrameRendererProps> = ({
  videoId,
  frameIndex,
  width = 640,
  height = 480,
  showOverlay = true,
  showMesh = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frameData, isLoading, error } = useFrameData(videoId, frameIndex, {
    includeOriginal: true,
    includeOverlay: showOverlay,
    includeMesh: showMesh
  });

  // Render frame when data changes
  useEffect(() => {
    if (!canvasRef.current || !frameData) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Determine which frame to display
    const frameToDisplay = showOverlay && frameData.overlayFrame ? frameData.overlayFrame : frameData.originalFrame;

    if (frameToDisplay) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.onerror = () => {
        console.error('Failed to load frame image');
      };
      img.src = `data:image/jpeg;base64,${frameToDisplay}`;
    }
  }, [frameData, showOverlay, width, height]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #ccc',
          backgroundColor: '#000',
          display: 'block'
        }}
      />
      <div style={{ fontSize: '12px', color: '#666' }}>
        {isLoading && <span>Loading frame {frameIndex}...</span>}
        {error && <span style={{ color: '#f00' }}>Error: {error.message}</span>}
        {!isLoading && !error && <span>Frame {frameIndex}</span>}
      </div>
    </div>
  );
};
