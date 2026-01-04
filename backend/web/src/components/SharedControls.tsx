import React from 'react';
import { useGridStore } from '../stores/gridStore';

const SPEED_PRESETS = [0.125, 0.25, 0.5, 1, 2, 3, 4];

export function SharedControls() {
  const play = useGridStore((state) => state.play);
  const pause = useGridStore((state) => state.pause);
  const setSpeed = useGridStore((state) => state.setSpeed);
  const setSharedCameraPreset = useGridStore((state) => state.setSharedCameraPreset);
  const isPlaying = useGridStore((state) => state.isPlaying);
  const playbackSpeed = useGridStore((state) => state.playbackSpeed);
  const cameraPreset = useGridStore((state) => state.sharedControls.cameraPreset);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => (isPlaying ? pause() : play())}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#4ECDC4',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ color: '#999', fontSize: '11px' }}>Speed Presets</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
          {SPEED_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setSpeed(preset)}
              style={{
                padding: '6px 8px',
                backgroundColor: playbackSpeed === preset ? '#4ECDC4' : '#333',
                color: playbackSpeed === preset ? '#000' : '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: playbackSpeed === preset ? '600' : '400',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (playbackSpeed !== preset) {
                  e.currentTarget.style.backgroundColor = '#444';
                }
              }}
              onMouseLeave={(e) => {
                if (playbackSpeed !== preset) {
                  e.currentTarget.style.backgroundColor = '#333';
                }
              }}
            >
              {preset}x
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ color: '#999', fontSize: '11px' }}>Camera</label>
        <select
          value={cameraPreset}
          onChange={(e) => setSharedCameraPreset(e.target.value as any)}
          style={{
            padding: '6px 8px',
            backgroundColor: '#333',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <option value="top">Top</option>
          <option value="front">Front</option>
          <option value="back">Back</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}
