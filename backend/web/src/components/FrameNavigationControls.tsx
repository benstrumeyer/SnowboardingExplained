import React from 'react';

interface FrameNavigationControlsProps {
  currentFrame: number;
  totalFrames: number;
  onPreviousFrame: () => void;
  onNextFrame: () => void;
}

export function FrameNavigationControls({
  currentFrame,
  totalFrames,
  onPreviousFrame,
  onNextFrame,
}: FrameNavigationControlsProps) {
  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <button onClick={onPreviousFrame}>← Prev</button>
      <button onClick={onNextFrame} style={{ marginLeft: '10px' }}>
        Next →
      </button>
      <span style={{ marginLeft: '10px' }}>
        {currentFrame} / {totalFrames}
      </span>
    </div>
  );
}
