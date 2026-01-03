import React, { useRef, useState } from 'react';
import { CellState } from './GridLayout';

interface WindowedControlsProps {
  cellId: string;
  cellState: CellState;
  position: { x: number; y: number };
  isCollapsed: boolean;
  onPositionChange: (pos: { x: number; y: number }) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onLoadVideo: () => void;
  onLoadModel: () => void;
  onSyncToggle: (synced: boolean) => void;
  onNametagChange: (nametag: string) => void;
  isVideoCell: boolean;
}

export function WindowedControls({
  cellId,
  cellState,
  position,
  isCollapsed,
  onPositionChange,
  onCollapsedChange,
  onLoadVideo,
  onLoadModel,
  onSyncToggle,
  onNametagChange,
  isVideoCell,
}: WindowedControlsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return;

    setIsDragging(true);
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    onPositionChange({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: '#222',
        border: '1px solid #444',
        borderRadius: '4px',
        zIndex: 100,
        minWidth: '280px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#333',
          borderBottom: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
      >
        <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>
          Cell Controls
        </span>
        <button
          onClick={() => onCollapsedChange(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0 4px',
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={onLoadVideo}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4ECDC4',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            📹 Load Video
          </button>

          <button
            onClick={onLoadModel}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FF6B6B',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            🎭 Load Model
          </button>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#999',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={cellState.isSynced}
              onChange={(e) => onSyncToggle(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Sync Scene
          </label>

          {!isVideoCell && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: '#999', fontSize: '11px' }}>Nametag</label>
              <input
                type="text"
                value={cellState.nametag || ''}
                onChange={(e) => onNametagChange(e.target.value)}
                placeholder="Enter nametag..."
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#333',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
