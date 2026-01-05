import { useEffect, useState } from 'react';
import { useGridStore } from '../stores/gridStore';
import { getGlobalPlaybackEngine, SceneConfig } from '../engine/PlaybackEngine';
import { WindowedControls } from './WindowedControls';
import { VideoToggleDisplay } from './VideoToggleDisplay';
import { MeshViewer } from './MeshViewer';
import { NativeScrubber } from './NativeScrubber';
import { ContentLoadModal } from './ContentLoadModal';

interface GridCellProps {
  cellId: string;
}

export function GridCell({ cellId }: GridCellProps) {
  const cell = useGridStore((state) => state.cells.find((c) => c.id === cellId));
  const engine = getGlobalPlaybackEngine();
  const [showModal, setShowModal] = useState(false);
  const [fps, setFps] = useState(30);
  const [totalFrames, setTotalFrames] = useState(0);

  console.log('%c[GridCell] 🔧 Rendering cell:', 'color: #FF6B6B; font-weight: bold;', {
    cellId,
    contentType: cell?.contentType,
    videoId: cell?.videoId,
    modelId: cell?.modelId,
    fps,
    totalFrames,
  });

  useEffect(() => {
    if (!cell || totalFrames <= 0) return;

    engine.reinitialize(fps, totalFrames);

    const sceneConfig: SceneConfig = {
      sceneId: cellId,
      offset: 0,
      windowStart: 0,
      windowDuration: (totalFrames / fps) * 1000,
    };

    engine.registerScene(sceneConfig);

    return () => {
      engine.unregisterScene(cellId);
    };
  }, [cellId, totalFrames, fps]);

  if (!cell) return null;

  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: cell.contentType === 'empty' ? 'pointer' : 'default',
        }}
        onClick={() => cell.contentType === 'empty' && setShowModal(true)}
      >
        {cell.contentType === 'empty' ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '14px',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '32px' }}>+</div>
            <div>Click to load content</div>
          </div>
        ) : cell.contentType === 'video' ? (
          <>
            <WindowedControls
              cellId={cellId}
              onLoadVideo={() => setShowModal(true)}
              onLoadModel={() => { }}
              isVideoCell={true}
            />
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {cell.videoId ? (
                <>
                  <VideoToggleDisplay
                    videoId={cell.videoId}
                    cellId={cellId}
                    fps={fps}
                    onMetadataLoaded={(f, tf) => {
                      setFps(f);
                      setTotalFrames(tf);
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: '#4ECDC4',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}>
                    {cell.videoId} | FPS: {fps} | Frames: {totalFrames}
                  </div>
                </>
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                }}>
                  No video loaded
                </div>
              )}
            </div>
            <NativeScrubber />
          </>
        ) : (
          <>
            <WindowedControls
              cellId={cellId}
              onLoadVideo={() => setShowModal(true)}
              onLoadModel={() => { }}
              isVideoCell={false}
            />
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <MeshViewer
                cellId={cellId}
                fps={fps}
                nametag={cell.nametag}
                modelId={cell.modelId || ''}
                onMetadataLoaded={(f, tf) => {
                  setFps(f);
                  setTotalFrames(tf);
                }}
              />
            </div>
            <NativeScrubber />
          </>
        )}
      </div>

      <ContentLoadModal
        cellId={cellId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
