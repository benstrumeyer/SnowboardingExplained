import React from 'react';
import { CameraService } from '../services/cameraService';
import { globalCameraManager, CameraPreset } from '../services/globalCameraManager';

interface CameraControlsProps {
  cameraService?: CameraService | null;
  onPresetChange?: (preset: string) => void;
}

export function CameraControls({ cameraService, onPresetChange }: CameraControlsProps) {
  const presets: CameraPreset[] = ['top', 'front', 'back', 'left', 'right'];

  const handlePreset = (preset: CameraPreset) => {
    globalCameraManager.setPreset(preset);
    onPresetChange?.(preset);
  };

  const handleReset = () => {
    globalCameraManager.reset();
    onPresetChange?.('front');
  };

  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <h3>Camera Presets</h3>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            style={{
              padding: '6px 10px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              textTransform: 'capitalize',
            }}
          >
            {preset}
          </button>
        ))}
      </div>
      <button
        onClick={handleReset}
        style={{
          width: '100%',
          padding: '8px',
          background: '#444',
          color: '#fff',
          border: '1px solid #666',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Reset Camera
      </button>
    </div>
  );
}
