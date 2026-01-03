import React, { useEffect } from 'react';
import { useGridStore } from '../stores/gridStore';
import { WindowedControls } from './WindowedControls';
import { FrameScrubber } from './FrameScrubber';
import { VideoToggleDisplay } from './VideoToggleDisplay';
import { MeshViewer } from './MeshViewer';

interface GridCellProps {
  cellId: string;
}

export function GridCell({ cellId }: GridCellProps) {
  const cell = useGridStore((state) => state.cells.find((c) => c.id === cellId));
  const sharedControls = useGridStore((state) => state.sharedControls);
  const setCellFrame = useGridStore((state) => state.setCellFrame);
  const setCellPlaying = useGridStore((state) => state.setCellPlaying);
  const setCellSpeed = useGridStore((state) => state.setCellSpeed);
  const setCellSynced = useGridStore((state) => state.setCellSynced);
  const setCellNametag = useGridStore((state) => state.setCellNametag);
  const setCellWindowPosition = useGridStore((state) => state.setCellWindowPosition);
  const setCellWindowCollapsed = useGridStore((state) => state.setCellWindowCollapsed);
  const updateCell = useGridStore((state) => state.updateCell);

  if (!cell) return null;

  const currentFrame = cell.isSynced ? sharedControls.currentFrame : cell.playbackState.currentFrame;
  const isPlaying = cell.isSynced ? sharedControls.isPlaying : cell.playbackState.isPlaying;
  const playbackSpeed = cell.isSynced ? sharedControls.playbackSpeed : cell.playbackState.playbackSpeed;

  useEffect(() => {
    if (cell.isSynced) {
      updateCell(cellId, {
        ...cell,
        playbackState: {
          ...cell.playbackState,
          currentFrame: sharedControls.currentFrame,
          isPlaying: sharedControls.isPlaying,
          playbackSpeed: sharedControls.playbackSpeed,
        },
      });
    }
  }, [sharedControls.currentFrame, sharedControls.isPlaying, sharedControls.playbackSpeed, cell.isSynced]);

  const handleFrameChange = (frame: number) => {
    setCellFrame(cellId, frame);
  };

  const handlePlayPause = () => {
    setCellPlaying(cellId, !isPlaying);
  };

  const handleSpeedChange = (speed: number) => {
    setCellSpeed(cellId, speed);
  };

  const handleSyncToggle = (synced: boolean) => {
    setCellSynced(cellId, synced);
  };

  const handleNametagChange = (nametag: string) => {
    setCellNametag(cellId, nametag);
  };

  return (
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
      }}
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
          }}
        >
          Empty Cell
        </div>
      ) : cell.contentType === 'video' ? (
        <>
          <WindowedControls
            cellId={cellId}
            onLoadVideo={() => { }}
            onLoadModel={() => { }}
            isVideoCell={true}
          />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <VideoToggleDisplay
              videoId={cell.videoId || ''}
              totalFrames={cell.playbackState.totalFrames}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              fps={30}
            />
          </div>
          <FrameScrubber
            currentFrame={currentFrame}
            totalFrames={cell.playbackState.totalFrames}
            isPlaying={isPlaying}
            onFrameChange={handleFrameChange}
            onDragStart={() => { }}
            onDragEnd={() => { }}
          />
        </>
      ) : (
        <>
          <WindowedControls
            cellId={cellId}
            onLoadVideo={() => { }}
            onLoadModel={() => { }}
            isVideoCell={false}
          />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <MeshViewer
              riderMesh={null}
              referenceMesh={null}
              showRider={true}
              showReference={false}
              riderRotation={{ x: 0, y: 0, z: 0 }}
              referenceRotation={{ x: 0, y: 0, z: 0 }}
              riderColor="#FF6B6B"
              riderOpacity={1}
              referenceColor="#4ECDC4"
              referenceOpacity={1}
              nametag={cell.nametag}
            />
          </div>
          <FrameScrubber
            currentFrame={currentFrame}
            totalFrames={cell.playbackState.totalFrames}
            isPlaying={isPlaying}
            onFrameChange={handleFrameChange}
            onDragStart={() => { }}
            onDragEnd={() => { }}
          />
        </>
      )}
    </div>
  );
}
