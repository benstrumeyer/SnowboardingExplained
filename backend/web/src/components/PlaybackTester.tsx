import React, { useEffect, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export function PlaybackTester() {
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sceneLocalTimes, setSceneLocalTimes] = useState<Record<string, number>>({});

  const engine = getGlobalPlaybackEngine();

  useEffect(() => {
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        setPlaybackTime(engine.playbackTime);
        setIsPlaying(engine.isPlaying);
        setSpeed(engine.playbackSpeed);

        const localTimes: Record<string, number> = {};
        for (let i = 0; i < 4; i++) {
          const cellId = `cell-${i}`;
          localTimes[cellId] = engine.getSceneLocalTime(cellId);
        }
        setSceneLocalTimes(localTimes);
      }
    });

    return unsubscribe;
  }, [engine]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: '#222',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '12px',
        fontSize: '11px',
        color: '#999',
        maxWidth: '300px',
        zIndex: 1000,
      }}
    >
      <div style={{ fontWeight: '600', color: '#4ECDC4', marginBottom: '8px' }}>
        Playback Status
      </div>
      <div>Time: {(playbackTime / 1000).toFixed(2)}s</div>
      <div>Playing: {isPlaying ? '▶' : '⏸'}</div>
      <div>Speed: {speed.toFixed(2)}x</div>
      <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px' }}>
        <div style={{ fontWeight: '600', color: '#FF6B6B', marginBottom: '4px' }}>
          Scene Local Times
        </div>
        {Object.entries(sceneLocalTimes).map(([cellId, localTime]) => (
          <div key={cellId}>
            {cellId}: {(localTime / 1000).toFixed(2)}s
          </div>
        ))}
      </div>
    </div>
  );
}
