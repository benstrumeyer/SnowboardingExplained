import React, { useEffect } from 'react';
import { CellState, SharedControlState } from './GridLayout';
import { WindowedControls } from './WindowedControls';
import { FrameScrubber } from './FrameScrubber';
import { VideoToggleDisplay } from './VideoToggleDisplay';
import { MeshViewer } from './MeshViewer';

interface GridCellProps {
  cellId: string;
  cellState: CellState;
  sharedControls: SharedControlState;
  onStateChange: (newState: CellState) => void;
  onSharedControlsChange: (controls: SharedControlState) => void;
}

export function GridCell({
  cellId,
  cellState,
  sharedControls,
  onStateChange,
  onSharedControlsChange,
}: GridCellProps) {
  const currentFrame = cellState.isSynced ? sharedControls.currentFrame : cellState.playbackState.currentFrame;
  const isPlaying = cellState.isSynced ? sharedControls.isPlaying : cellState.playbackState.isPlaying;
  const playbackSpeed = cellState.isSynced ? sharedControls.playbackSpeed : cellState.playbackState.playbackSpeed;

  useEffect(() => {
    if (cellState.isSynced) {
      onStateChange({
        ...cellState,
        playbackState: {
          ...cellState.playbackState,
          currentFrame: sharedControls.currentFrame,
          isPlaying: sharedControls.isPlaying,
          playbackSpeed: sharedControls.playbackSpeed,
        },
      });
    }
  }, [sharedControls.currentFrame, sharedControls.isPlaying, sharedControls.playbackSpeed, cellState.isSynced]);

  const handleFrameChange = (frame: number) => {
    const newState = {
      ...cellState,
      playbackState: {
        ...cellState.playbackState,
        currentFrame: frame,
      },
    };
    onStateChange(newState);

    if (cellState.isSynced) {
      onSharedControlsChange({
        ...sharedControls,
        currentFrame: frame,
      });
    }
  };

  const handlePlayPause = () => {
    const newState = {
      ...cellState,
      playbackState: {
        ...cellState.playbackState,
        isPlaying: !isPlaying,
      },
    };
    onStateChange(newState);

    if (cellState.isSynced) {
      onSharedControlsChange({
        ...sharedControls,
        isPlaying: !isPlaying,
      });
    }
  };

  const handleSpeedChange = (speed: number) => {
    const newState = {
      ...cellState,
      playbackState: {
        ...cellState.playbackState,
        playbackSpeed: speed,
      },
    };
    onStateChange(newState);

    if (cellState.isSynced) {
      onSharedControlsChange({
        ...sharedControls,
        playbackSpeed: speed,
      });
    }
  };

  const handleSyncToggle = (synced: boolean) => {
    onStateChange({
      ...cellState,
      isSynced: synced,
    });
  };

  const handleNametagChange = (nametag: string) => {
    onStateChange({
      ...cellState,
      nametag,
    });
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
      {cellState.contentType === 'empty' ? (
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
      ) : cellState.contentType === 'video' ? (
        <>
          <WindowedControls
            cellId={cellId}
            cellState={cellState}
            position={cellState.windowedControlsPosition}
            isCollapsed={cellState.isWindowedControlsCollapsed}
            onPositionChange={(pos) =>
              onStateChange({
                ...cellState,
                windowedControlsPosition: pos,
              })
            }
            onCollapsedChange={(collapsed) =>
              onStateChange({
                ...cellState,
                isWindowedControlsCollapsed: collapsed,
              })
            }
            onLoadVideo={() => { }}
            onLoadModel={() => { }}
            onSyncToggle={handleSyncToggle}
            onNametagChange={handleNametagChange}
            isVideoCell={true}
          />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <VideoToggleDisplay
              videoId={cellState.videoId || ''}
              totalFrames={cellState.playbackState.totalFrames}
              currentFrame={currentFrame}
              isPlaying={isPlaying}
              fps={30}
              videoMode={cellState.playbackState.videoMode || 'original'}
              onVideoModeChange={(mode) =>
                onStateChange({
                  ...cellState,
                  playbackState: {
                    ...cellState.playbackState,
                    videoMode: mode,
                  },
                })
              }
            />
          </div>
          <FrameScrubber
            currentFrame={currentFrame}
            totalFrames={cellState.playbackState.totalFrames}
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
            cellState={cellState}
            position={cellState.windowedControlsPosition}
            isCollapsed={cellState.isWindowedControlsCollapsed}
            onPositionChange={(pos) =>
              onStateChange({
                ...cellState,
                windowedControlsPosition: pos,
              })
            }
            onCollapsedChange={(collapsed) =>
              onStateChange({
                ...cellState,
                isWindowedControlsCollapsed: collapsed,
              })
            }
            onLoadVideo={() => { }}
            onLoadModel={() => { }}
            onSyncToggle={handleSyncToggle}
            onNametagChange={handleNametagChange}
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
              nametag={cellState.nametag}
            />
          </div>
          <FrameScrubber
            currentFrame={currentFrame}
            totalFrames={cellState.playbackState.totalFrames}
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
