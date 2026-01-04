import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoSampler } from '../hooks/useVideoSampler';
import '../styles/VideoDisplay.css';

interface VideoToggleDisplayProps {
  videoId: string;
  cellId: string;
  fps?: number;
  onMetadataLoaded?: (fps: number, frameCount: number) => void;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const VideoToggleDisplay: React.FC<VideoToggleDisplayProps> = ({
  videoId,
  cellId,
  fps = 30,
  onMetadataLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actualFps, setActualFps] = useState(fps);

  const frameCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Render a frame on the canvas
  const renderFrame = useCallback((frameIndex: number) => {
    if (!canvasRef.current) {
      console.log('%c[VideoToggleDisplay] ⚠️  No canvas ref', 'color: #FF6B6B;');
      return;
    }

    if (frameIndex % 10 === 0 || frameIndex < 5) {
      console.log('%c[VideoToggleDisplay] 🖼️  renderFrame:', 'color: #4ECDC4;', frameIndex);
    }

    const videoType = showOverlay ? 'overlay' : 'original';
    const cacheKey = `${videoId}-${frameIndex}-${videoType}`;

    // Use cached frame
    if (frameCache.current.has(cacheKey)) {
      const img = frameCache.current.get(cacheKey)!;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    // Load new frame
    const img = new Image();
    img.onload = () => {
      frameCache.current.set(cacheKey, img);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.onerror = () => console.error('Failed to load frame', frameIndex, videoType);
    img.src = `${API_URL}/api/mesh-data/${videoId}/frame/${frameIndex}/${videoType}`;
  }, [videoId, showOverlay]);

  // Subscribe to PlaybackEngine
  useVideoSampler(cellId, canvasRef, true, renderFrame, actualFps);

  // Fetch mesh metadata to get FPS
  useEffect(() => {
    const fetchMeshData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/mesh-data/${videoId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const fetchedFps = data.data?.fps || fps;
        const frameCount = data.data?.frameCount || 0;
        
        setActualFps(fetchedFps);
        if (onMetadataLoaded) {
          onMetadataLoaded(fetchedFps, frameCount);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch mesh data', err);
        setLoading(false);
      }
    };
    fetchMeshData();
  }, [videoId]);

  // Clear cache when overlay toggles
  useEffect(() => {
    frameCache.current.clear();
  }, [showOverlay]);

  return (
    <div
      className="video-display-container"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            color: '#999',
            zIndex: 5,
          }}
        >
          Loading video...
        </div>
      )}

      {/* ⚠️ Set explicit width & height attributes for proper canvas drawing */}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          display: 'block',
        }}
      />

      <button
        onClick={() => setShowOverlay(!showOverlay)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          border: '2px solid #4ECDC4',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600',
          transition: 'all 0.2s ease-in-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          e.currentTarget.style.borderColor = '#FF6B6B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          e.currentTarget.style.borderColor = '#4ECDC4';
        }}
      >
        {showOverlay ? '🎬 Overlay' : '📹 Original'}
      </button>
    </div>
  );
};