import React, { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
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
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actualFps, setActualFps] = useState(fps);

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

  useEffect(() => {
    const engine = getGlobalPlaybackEngine();
    const video = showOverlay ? overlayVideoRef.current : originalVideoRef.current;

    if (video) {
      engine.registerVideoElement(cellId, video);
      return () => {
        engine.unregisterVideoElement(cellId);
      };
    }
  }, [cellId, showOverlay]);

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

      <video
        ref={originalVideoRef}
        src={`${API_URL}/api/video/${videoId}/original`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          position: 'absolute',
          opacity: showOverlay ? 0 : 1,
          pointerEvents: showOverlay ? 'none' : 'auto',
        }}
        loop
        muted
        controls
      />

      <video
        ref={overlayVideoRef}
        src={`${API_URL}/api/video/${videoId}/overlay`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          position: 'absolute',
          opacity: showOverlay ? 1 : 0,
          pointerEvents: showOverlay ? 'auto' : 'none',
        }}
        loop
        muted
        controls
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
