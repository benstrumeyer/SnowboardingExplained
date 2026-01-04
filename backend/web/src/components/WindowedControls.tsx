import React, { useRef, useState } from 'react';
import { useGridStore } from '../stores/gridStore';
import { ContentLoadModal } from './ContentLoadModal';

interface WindowedControlsProps {
  cellId: string;
  onLoadVideo: () => void;
  onLoadModel: () => void;
  isVideoCell: boolean;
}

export function WindowedControls({
  cellId,
  onLoadVideo,
  onLoadModel,
  isVideoCell,
}: WindowedControlsProps) {
  const cell = useGridStore((state) => state.cells.find((c) => c.id === cellId));
  const setCellWindowPosition = useGridStore((state) => state.setCellWindowPosition);
  const setCellWindowCollapsed = useGridStore((state) => state.setCellWindowCollapsed);
  const setCellSynced = useGridStore((state) => state.setCellSynced);
  const setCellNametag = useGridStore((state) => state.setCellNametag);
  const play = useGridStore((state) => state.play);
  const pause = useGridStore((state) => state.pause);
  const setSpeed = useGridStore((state) => state.setSpeed);
  const isPlaying = useGridStore((state) => state.isPlaying);
  const playbackSpeed = useGridStore((state) => state.playbackSpeed);

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showContentModal, setShowContentModal] = useState(false);

  if (!cell) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;

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

    setCellWindowPosition(cellId, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: `${cell.windowedControlsPosition.y}px`,
          left: `${cell.windowedControlsPosition.x}px`,
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
            onClick={() => setCellWindowCollapsed(cellId, !cell.isWindowedControlsCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            {cell.isWindowedControlsCollapsed ? '▼' : '▲'}
          </button>
        </div>

        {!cell.isWindowedControlsCollapsed && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setShowContentModal(true)}
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
              📂 Change Content
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
                checked={cell.isSynced}
                onChange={(e) => setCellSynced(cellId, e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Sync Scene
            </label>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => (isPlaying ? pause() : play())}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  backgroundColor: '#4ECDC4',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={playbackSpeed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#999', fontSize: '11px', minWidth: '30px' }}>
                {playbackSpeed.toFixed(2)}x
              </span>
            </div>

            {!isVideoCell && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#999', fontSize: '11px' }}>Nametag</label>
                <input
                  type="text"
                  value={cell.nametag || ''}
                  onChange={(e) => setCellNametag(cellId, e.target.value)}
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

      <ContentLoadModal
        cellId={cellId}
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
      />
    </>
  );
}
