import React, { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { useGridStore } from '../stores/gridStore';
import { MeshViewer } from './MeshViewer';
import { CellOverlayControls } from './CellOverlayControls';
import '../styles/VideoDisplay.css';

interface VideoToggleDisplayProps {
  videoId: string;
  cellId: string;
  fps?: number;
  onMetadataLoaded?: (fps: number, frameCount: number) => void;
}

type DisplayMode = 'original' | 'overlay' | '3d';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const VideoToggleDisplay: React.FC<VideoToggleDisplayProps> = ({
  videoId,
  cellId,
  fps = 30,
  onMetadataLoaded,
}) => {
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [actualFps, setActualFps] = useState(fps);

  const cell = useGridStore((state) => state.cells.find((c) => c.id === cellId));
  const updateCell = useGridStore((state) => state.updateCell);
  const displayMode = (cell?.videoMode as DisplayMode) || 'original';

  const modes: DisplayMode[] = ['original', 'overlay', '3d'];
  const modeLabels: Record<DisplayMode, string> = {
    original: '📹 Original',
    overlay: '🎬 Overlay',
    '3d': '🎭 3D',
  };

  const getNextMode = (current: DisplayMode): DisplayMode => {
    const currentIndex = modes.indexOf(current);
    return modes[(currentIndex + 1) % modes.length];
  };

  const nextMode = getNextMode(displayMode);

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
    const video = displayMode === 'original' ? originalVideoRef.current : overlayVideoRef.current;

    if (video && displayMode !== '3d') {
      engine.registerVideoElement(cellId, video);
      return () => {
        engine.unregisterVideoElement(cellId);
      };
    }
  }, [cellId, displayMode]);

  if (displayMode === '3d') {
    if (loading) {
      return (
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
          Loading 3D mesh...
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MeshViewer
          cellId={cellId}
          fps={actualFps}
          modelId={videoId}
          onMetadataLoaded={onMetadataLoaded}
        />
        <CellOverlayControls cellId={cellId} />
        <button
          onClick={() => updateCell(cellId, { videoMode: getNextMode(displayMode) })}
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
            minWidth: '100px',
            textAlign: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.borderColor = '#FF6B6B';
            e.currentTarget.textContent = modeLabels[nextMode];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            e.currentTarget.style.borderColor = '#4ECDC4';
            e.currentTarget.textContent = modeLabels[displayMode];
          }}
        >
          {modeLabels[displayMode]}
        </button>
      </div>
    );
  }

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
          opacity: displayMode === 'original' ? 1 : 0,
          pointerEvents: displayMode === 'original' ? 'auto' : 'none',
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
          opacity: displayMode === 'overlay' ? 1 : 0,
          pointerEvents: displayMode === 'overlay' ? 'auto' : 'none',
        }}
        loop
        muted
        controls
      />

      <button
        onClick={() => updateCell(cellId, { videoMode: nextMode })}
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
          minWidth: '100px',
          textAlign: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          e.currentTarget.style.borderColor = '#FF6B6B';
          e.currentTarget.textContent = modeLabels[nextMode];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          e.currentTarget.style.borderColor = '#4ECDC4';
          e.currentTarget.textContent = modeLabels[displayMode];
        }}
      >
        {modeLabels[displayMode]}
      </button>
    </div>
  );
};
