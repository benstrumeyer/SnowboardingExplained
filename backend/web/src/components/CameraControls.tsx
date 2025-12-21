import React from 'react';

interface CameraControlsProps {
  onReset: () => void;
}

export function CameraControls({ onReset }: CameraControlsProps) {
  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <button onClick={onReset}>Reset Camera</button>
    </div>
  );
}
