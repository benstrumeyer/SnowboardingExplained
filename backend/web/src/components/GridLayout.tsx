import React from 'react';
import { GridCell } from './GridCell';

export interface CellState {
  id: string;
  contentType: 'empty' | 'video' | 'mesh';
  videoId?: string;
  modelId?: string;
  playbackState: {
    currentFrame: number;
    isPlaying: boolean;
    playbackSpeed: number;
    totalFrames: number;
    videoMode?: 'original' | 'overlay';
  };
  isSynced: boolean;
  windowedControlsPosition: { x: number; y: number };
  isWindowedControlsCollapsed: boolean;
  nametag?: string;
}

export interface SharedControlState {
  currentFrame: number;
  playbackSpeed: number;
  cameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
  isPlaying: boolean;
}

interface GridLayoutProps {
  rows: number;
  columns: number;
  cells: CellState[];
  onCellUpdate: (cellId: string, state: CellState) => void;
  sharedControls: SharedControlState;
  onSharedControlsChange: (controls: SharedControlState) => void;
}

export function GridLayout({
  rows,
  columns,
  cells,
  onCellUpdate,
  sharedControls,
  onSharedControlsChange,
}: GridLayoutProps) {
  const totalCells = rows * columns;
  const gridCells = cells.slice(0, totalCells);

  const handleCellUpdate = (cellId: string, newState: CellState) => {
    onCellUpdate(cellId, newState);

    if (newState.isSynced && newState.playbackState.currentFrame !== sharedControls.currentFrame) {
      onSharedControlsChange({
        ...sharedControls,
        currentFrame: newState.playbackState.currentFrame,
      });
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '8px',
        width: '100%',
        height: '100%',
        padding: '8px',
        backgroundColor: '#0a0a0a',
      }}
    >
      {gridCells.map((cell) => (
        <GridCell
          key={cell.id}
          cellId={cell.id}
          cellState={cell}
          sharedControls={sharedControls}
          onStateChange={(newState) => handleCellUpdate(cell.id, newState)}
          onSharedControlsChange={onSharedControlsChange}
        />
      ))}
    </div>
  );
}
