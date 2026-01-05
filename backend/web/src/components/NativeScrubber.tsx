import { useEffect, useRef } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

export function NativeScrubber() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const timeDisplayRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = getGlobalPlaybackEngine();

    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = 'rgba(78, 205, 196, 0.2)';
    progressBar.style.borderRadius = '4px';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';
    progressBar.style.pointerEvents = 'none';
    progressBar.style.zIndex = '1';

    const thumb = document.createElement('div');
    thumb.style.position = 'absolute';
    thumb.style.width = '12px';
    thumb.style.height = '12px';
    thumb.style.backgroundColor = '#4ECDC4';
    thumb.style.borderRadius = '50%';
    thumb.style.top = '50%';
    thumb.style.left = '0';
    thumb.style.transform = 'translate(-50%, -50%)';
    thumb.style.boxShadow = '0 0 8px rgba(78, 205, 196, 0.6)';
    thumb.style.pointerEvents = 'none';
    thumb.style.zIndex = '2';

    const timeDisplay = document.createElement('div');
    timeDisplay.style.position = 'absolute';
    timeDisplay.style.color = '#999';
    timeDisplay.style.fontSize = '12px';
    timeDisplay.style.top = '32px';
    timeDisplay.style.left = '8px';
    timeDisplay.style.fontFamily = 'monospace';
    timeDisplay.style.zIndex = '3';
    timeDisplay.textContent = '0.00s';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '60px';
    wrapper.style.backgroundColor = '#222';
    wrapper.style.borderRadius = '4px';
    wrapper.style.border = '1px solid #444';
    wrapper.style.cursor = 'pointer';
    wrapper.appendChild(progressBar);
    wrapper.appendChild(thumb);
    wrapper.appendChild(timeDisplay);

    containerRef.current.appendChild(wrapper);
    progressBarRef.current = progressBar;
    timeDisplayRef.current = timeDisplay;
    thumbRef.current = thumb;
    wrapperRef.current = wrapper;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    wrapper.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Listen to engine events for 60fps updates
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        const duration = engine.duration;

        // Always update time display, even if duration is 0
        if (timeDisplayRef.current) {
          const seconds = engine.playbackTime / 1000;
          timeDisplayRef.current.textContent = `${seconds.toFixed(2)}s`;
        }

        // Only update progress bar and thumb if duration is valid
        if (duration > 0) {
          const progress = engine.playbackTime / duration;
          const progressPercent = Math.max(0, Math.min(100, progress * 100));

          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${progressPercent}%`;
          }

          // Move thumb to current position as percentage
          if (thumbRef.current) {
            thumbRef.current.style.left = `${progressPercent}%`;
          }
        }
      }
    });

    return () => {
      unsubscribe();
      wrapper.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (containerRef.current && wrapperRef.current && wrapperRef.current.parentNode === containerRef.current) {
        containerRef.current.removeChild(wrapperRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        padding: '8px',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
      }}
    />
  );
}
