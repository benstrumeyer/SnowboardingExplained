import React, { useEffect, useState } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import { ModelsCardList } from './ModelsCardList';
import '../styles/FloatingControlPanel.css';

interface FloatingControlPanelProps {
  onModelSelect: (videoId: string, role: 'rider' | 'coach') => void;
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onFrameChange: (frame: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  sceneId?: string; // Identifier for this scene (e.g., 'left', 'right')
  onSceneFrameChange?: (frame: number) => void; // Scene-specific frame handler
  children?: React.ReactNode;
}

export const FloatingControlPanel: React.FC<FloatingControlPanelProps> = ({
  onModelSelect,
  currentFrame,
  totalFrames,
  isPlaying,
  onPlayPause,
  onFrameChange,
  playbackSpeed,
  onSpeedChange,
  onSceneFrameChange,
  children,
}) => {
  const { position, elementRef, handlers } = useDraggable(12, 12);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (handlers.onMouseMove) {
      window.addEventListener('mousemove', handlers.onMouseMove as any);
      window.addEventListener('mouseup', handlers.onMouseUp as any);
      return () => {
        window.removeEventListener('mousemove', handlers.onMouseMove as any);
        window.removeEventListener('mouseup', handlers.onMouseUp as any);
      };
    }
  }, [handlers]);

  return (
    <div
      ref={elementRef}
      className={`floating-control-panel ${isMinimized ? 'minimized' : ''}`}
      style={{
        position: 'absolute',
        top: `${position.y}px`,
        right: 'auto',
        left: `${position.x}px`,
        zIndex: 10,
      }}
      onMouseDown={handlers.onMouseDown}
    >
      <div className="floating-panel-header">
        <span className="floating-panel-title">⋮⋮ Drag to move</span>
        <div className="floating-panel-controls">
          <button
            className="floating-panel-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isMinimized && <div className="floating-minimize-bar" />}

      <div className="floating-panel-content">
        {/* Model Selector */}
        <div className="floating-section">
          <label className="floating-label">Load Model</label>
          <ModelsCardList onModelSelect={onModelSelect} maxCards={3} />
        </div>

        {/* Playback Controls */}
        <div className="floating-section">
          <label className="floating-label">Scene Playback</label>
          <div className="floating-playback">
            <button
              className="floating-btn"
              onClick={() => {
                const newFrame = Math.max(0, currentFrame - 1);
                if (onSceneFrameChange) {
                  onSceneFrameChange(newFrame);
                } else {
                  onFrameChange(newFrame);
                }
              }}
              title="Previous frame"
            >
              ⏮
            </button>
            <button
              className="floating-btn"
              onClick={onPlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className="floating-btn"
              onClick={() => {
                const newFrame = Math.min(totalFrames - 1, currentFrame + 1);
                if (onSceneFrameChange) {
                  onSceneFrameChange(newFrame);
                } else {
                  onFrameChange(newFrame);
                }
              }}
              title="Next frame"
            >
              ⏭
            </button>
            <input
              type="range"
              min="0"
              max={totalFrames - 1}
              value={currentFrame}
              onChange={(e) => {
                const newFrame = parseInt(e.target.value);
                // Use scene-specific handler if available, otherwise use shared handler
                if (onSceneFrameChange) {
                  onSceneFrameChange(newFrame);
                } else {
                  onFrameChange(newFrame);
                }
              }}
              className="floating-slider"
              title="Frame scrubber"
            />
            <span className="floating-frame-info">
              {currentFrame} / {totalFrames}
            </span>
          </div>

          <div className="floating-speed-controls">
            {[0.25, 0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                className={`floating-speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                onClick={() => onSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Additional children content */}
        {children}
      </div>
    </div>
  );
};
