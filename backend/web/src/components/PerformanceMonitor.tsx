import React, { useEffect, useState, useRef } from 'react';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
  });
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

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

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: '#222',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '12px',
        fontSize: '11px',
        color: '#999',
        zIndex: 1000,
      }}
    >
      <div style={{ fontWeight: '600', color: '#4ECDC4', marginBottom: '8px' }}>
        Performance
      </div>
      <div>FPS: {metrics.fps}</div>
      <div>Frame Time: {metrics.frameTime.toFixed(2)}ms</div>
      <div>Memory: {metrics.memoryUsage}MB</div>
    </div>
  );
}
