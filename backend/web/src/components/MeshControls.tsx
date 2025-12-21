import React from 'react';

interface MeshControlsProps {
  meshName: string;
  isVisible: boolean;
  frameOffset: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  currentFrame: number;
  onVisibilityChange: (visible: boolean) => void;
  onFrameOffsetChange: (offset: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', angle: number) => void;
}

export function MeshControls({
  meshName,
  isVisible,
  frameOffset,
  rotationX,
  rotationY,
  rotationZ,
  currentFrame,
  onVisibilityChange,
  onFrameOffsetChange,
  onRotationChange,
}: MeshControlsProps) {
  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <h3>{meshName}</h3>
      <label>
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e) => onVisibilityChange(e.target.checked)}
        />
        Visible
      </label>
      <div>
        <label>Frame Offset: {frameOffset}</label>
        <input
          type="range"
          min="-10"
          max="10"
          value={frameOffset}
          onChange={(e) => onFrameOffsetChange(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Rotation X: {rotationX.toFixed(0)}°</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={rotationX}
          onChange={(e) => onRotationChange('x', parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Rotation Y: {rotationY.toFixed(0)}°</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={rotationY}
          onChange={(e) => onRotationChange('y', parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label>Rotation Z: {rotationZ.toFixed(0)}°</label>
        <input
          type="range"
          min="-180"
          max="180"
          value={rotationZ}
          onChange={(e) => onRotationChange('z', parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
