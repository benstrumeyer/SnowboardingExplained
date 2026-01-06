import React, { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { useGridStore } from '../stores/gridStore';
import { MeshViewer } from './MeshViewer';
import { CellOverlayControls } from './CellOverlayControls';
import { CellNativeScrubber } from './CellNativeScrubber';
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
  const videoCellRef = useRef<HTMLDivElement>(null);
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
      } catch (err) {
        console.error('Failed to fetch mesh data', err);
      }
    };
    fetchMeshData();
  }, [videoId, fps, onMetadataLoaded]);

  useEffect(() => {
    const engine = getGlobalPlaybackEngine();
    const video = displayMode === 'original' ? originalVideoRef.current : overlayVideoRef.current;

    if (video && displayMode !== '3d') {
      engine.registerVideoElement(cellId, video);
      
      const handleLoadedMetadata = () => {
        const duration = video.duration;
        const fps = actualFps || 30;
        const frameCount = Math.round(duration * fps);
        if (onMetadataLoaded) {
          onMetadataLoaded(fps, frameCount);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      return () => {
        engine.unregisterVideoElement(cellId);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [cellId, displayMode, actualFps, onMetadataLoaded]);

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
      ref={videoCellRef}
      className="video-display-container"
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={() => {
        const scrubber = videoCellRef.current?.querySelector('[data-scrubber]') as HTMLElement;
        if (scrubber) {
          const event = new MouseEvent('mouseenter', { bubbles: true });
          scrubber.dispatchEvent(event);
        }
      }}
      onMouseLeave={() => {
        const scrubber = videoCellRef.current?.querySelector('[data-scrubber]') as HTMLElement;
        if (scrubber) {
          const event = new MouseEvent('mouseleave', { bubbles: true });
          scrubber.dispatchEvent(event);
        }
      }}
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

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <video
          ref={originalVideoRef}
          src={`${API_URL}/api/video/${videoId}/original`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
            display: displayMode === 'original' ? 'block' : 'none',
          }}
          loop
          muted
          onLoadedMetadata={() => setLoading(false)}
        />

        <video
          ref={overlayVideoRef}
          src={`${API_URL}/api/video/${videoId}/overlay`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
            display: displayMode === 'overlay' ? 'block' : 'none',
          }}
          loop
          muted
          onLoadedMetadata={() => setLoading(false)}
        />

        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '90px',
          zIndex: 20,
        }}
        data-scrubber="true">
          <CellNativeScrubber cellId={cellId} videoRef={displayMode === 'original' ? originalVideoRef : overlayVideoRef} cellContainerRef={videoCellRef} />
        </div>
      </div>

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
