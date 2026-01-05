import { useState, useEffect } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

const SPEED_PRESETS = [0.125, 0.25, 0.5, 1, 2, 3, 4];

export function SharedControls() {
  const engine = getGlobalPlaybackEngine();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isReversing, setIsReversing] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'play') {
        setIsPlaying(true);
      } else if (event.type === 'pause') {
        setIsPlaying(false);
      } else if (event.type === 'speedChanged') {
        setPlaybackSpeed(event.speed);
      } else if (event.type === 'reverseToggled') {
        setIsReversing(event.isReversing);
      } else if (event.type === 'loopToggled') {
        setIsLooping(event.isLooping);
      } else if (event.type === 'frameUpdate') {
        setCurrentTime(engine.playbackTime);
      }
    });

    return unsubscribe;
  }, [engine]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => (isPlaying ? engine.pause() : engine.play())}
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

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => engine.toggleReverse()}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isReversing ? '#FF6B6B' : '#333',
            color: isReversing ? '#000' : '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {isReversing ? '⏮ Reverse' : '⏭ Forward'}
        </button>
        <button
          onClick={() => engine.toggleLoop()}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: isLooping ? '#4ECDC4' : '#333',
            color: isLooping ? '#000' : '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {isLooping ? '🔁 Loop' : '⏹ Stop'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ color: '#999', fontSize: '11px' }}>Speed Presets</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
          {SPEED_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => engine.setSpeed(preset * (isReversing ? -1 : 1))}
              style={{
                padding: '6px 8px',
                backgroundColor: Math.abs(playbackSpeed) === preset ? '#4ECDC4' : '#333',
                color: Math.abs(playbackSpeed) === preset ? '#000' : '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: Math.abs(playbackSpeed) === preset ? '600' : '400',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (Math.abs(playbackSpeed) !== preset) {
                  e.currentTarget.style.backgroundColor = '#444';
                }
              }}
              onMouseLeave={(e) => {
                if (Math.abs(playbackSpeed) !== preset) {
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
        <label style={{ color: '#999', fontSize: '11px' }}>
          Time: {(currentTime / 1000).toFixed(2)}s
        </label>
      </div>
    </div>
  );
}
