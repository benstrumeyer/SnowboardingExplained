import { useEffect, useState, useRef } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
}

export function NavBarStatus() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
  });
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sceneLocalTimes, setSceneLocalTimes] = useState<Record<string, number>>({});

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const engine = getGlobalPlaybackEngine();

  useEffect(() => {
    const measurePerformance = () => {
      frameCountRef.current++;
      const now = Date.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);
        const frameTime = elapsed / frameCountRef.current;

        let memoryUsage = 0;
        const perfMemory = (performance as any).memory;
        if (perfMemory) {
          memoryUsage = Math.round(perfMemory.usedJSHeapSize / 1048576);
        }

        setMetrics({
          fps,
          frameTime,
          memoryUsage,
        });

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      requestAnimationFrame(measurePerformance);
    };

    const rafId = requestAnimationFrame(measurePerformance);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', fontSize: '12px' }}>
      {/* Performance Metrics */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ color: '#999' }}>
          <span style={{ color: '#4ECDC4', fontWeight: '600' }}>FPS:</span> {metrics.fps}
        </div>
        <div style={{ color: '#999' }}>
          <span style={{ color: '#4ECDC4', fontWeight: '600' }}>Frame:</span> {metrics.frameTime.toFixed(1)}ms
        </div>
        <div style={{ color: '#999' }}>
          <span style={{ color: '#4ECDC4', fontWeight: '600' }}>Mem:</span> {metrics.memoryUsage}MB
        </div>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#444' }} />

      {/* Playback Status */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ color: '#999' }}>
          <span style={{ color: '#4ECDC4', fontWeight: '600' }}>Time:</span> {(playbackTime / 1000).toFixed(2)}s
        </div>
        <div style={{ color: '#999' }}>
          <span style={{ color: '#4ECDC4', fontWeight: '600' }}>Status:</span> {isPlaying ? '▶' : '⏸'}
        </div>
        <div style={{ color: '#999' }}>
          <span style={{ color: '#4ECDC4', fontWeight: '600' }}>Speed:</span> {speed.toFixed(2)}x
        </div>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', backgroundColor: '#444' }} />

      {/* Scene Local Times */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {Object.entries(sceneLocalTimes).map(([cellId, localTime]) => (
          <div key={cellId} style={{ color: '#999' }}>
            <span style={{ color: '#FF6B6B', fontWeight: '600' }}>{cellId}:</span> {(localTime / 1000).toFixed(2)}s
          </div>
        ))}
      </div>
    </div>
  );
}
