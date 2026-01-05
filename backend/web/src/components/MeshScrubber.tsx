import { useEffect, useRef } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

interface MeshScrubberProps {
  cellId: string;
}

export function MeshScrubber({ cellId }: MeshScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = getGlobalPlaybackEngine();
    const container = containerRef.current;

    // Create scrubber elements
    const scrubberContainer = document.createElement('div');
    scrubberContainer.style.position = 'relative';
    scrubberContainer.style.width = '100%';
    scrubberContainer.style.height = '40px';
    scrubberContainer.style.backgroundColor = '#222';
    scrubberContainer.style.borderRadius = '4px';
    scrubberContainer.style.border = '1px solid #444';
    scrubberContainer.style.cursor = 'pointer';
    scrubberContainer.style.overflow = 'hidden';

    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#4ECDC4';
    progressBar.style.width = '0%';
    progressBar.style.opacity = '0.3';
    progressBar.style.pointerEvents = 'none';

    const timeDisplay = document.createElement('div');
    timeDisplay.style.position = 'absolute';
    timeDisplay.style.color = '#fff';
    timeDisplay.style.fontSize = '14px';
    timeDisplay.style.fontWeight = '600';
    timeDisplay.style.top = '50%';
    timeDisplay.style.left = '50%';
    timeDisplay.style.transform = 'translate(-50%, -50%)';
    timeDisplay.style.fontFamily = 'monospace';
    timeDisplay.style.pointerEvents = 'none';
    timeDisplay.textContent = '0.00s';

    scrubberContainer.appendChild(progressBar);
    scrubberContainer.appendChild(timeDisplay);
    container.appendChild(scrubberContainer);

    // Mouse handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      const rect = scrubberContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = scrubberContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    scrubberContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 60fps update loop
    let rafId: number;
    const updateScrubber = () => {
      const progress = engine.playbackTime / engine.duration;
      const progressPercent = Math.max(0, Math.min(100, progress * 100));

      progressBar.style.width = `${progressPercent}%`;

      const seconds = engine.playbackTime / 1000;
      timeDisplay.textContent = `${seconds.toFixed(2)}s`;

      rafId = requestAnimationFrame(updateScrubber);
    };

    rafId = requestAnimationFrame(updateScrubber);

    return () => {
      cancelAnimationFrame(rafId);
      scrubberContainer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (container.contains(scrubberContainer)) {
        container.removeChild(scrubberContainer);
      }
    };
  }, [cellId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        padding: '8px',
      }}
    />
  );
}
