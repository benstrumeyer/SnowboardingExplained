import React from 'react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentFrame: number;
  totalFrames: number;
  onScrub: (frame: number) => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  currentFrame,
  totalFrames,
  onScrub,
  speed = 1,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={onPlayPause} style={{ marginRight: '10px' }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span>{currentFrame} / {totalFrames}</span>
      </div>
      <input
        type="range"
        min="0"
        max={totalFrames - 1}
        value={currentFrame}
        onChange={(e) => onScrub(parseInt(e.target.value))}
        style={{ width: '100%' }}
      />
      {onSpeedChange && (
        <div style={{ marginTop: '10px' }}>
          <label>Speed: {speed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={{ width: '100%', marginLeft: '10px' }}
          />
        </div>
      )}
    </div>
  );
}
