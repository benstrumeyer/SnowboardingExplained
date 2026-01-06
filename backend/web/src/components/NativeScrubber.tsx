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

    // Create track container (the clickable area)
    const track = document.createElement('div');
    track.style.position = 'relative';
    track.style.width = '100%';
    track.style.height = '24px';
    track.style.backgroundColor = '#333';
    track.style.borderRadius = '4px';
    track.style.cursor = 'pointer';
    track.style.border = '1px solid #444';
    track.style.overflow = 'hidden';

    // Progress bar (filled portion)
    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = 'rgba(78, 205, 196, 0.3)';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';
    progressBar.style.pointerEvents = 'none';
    progressBar.style.zIndex = '1';
    track.appendChild(progressBar);

    // Thumb (red dot)
    const thumb = document.createElement('div');
    thumb.style.position = 'absolute';
    thumb.style.width = '14px';
    thumb.style.height = '14px';
    thumb.style.backgroundColor = '#FF6B6B';
    thumb.style.borderRadius = '50%';
    thumb.style.top = '50%';
    thumb.style.left = '0';
    thumb.style.transform = 'translate(-50%, -50%)';
    thumb.style.boxShadow = '0 0 8px rgba(255, 107, 107, 0.8)';
    thumb.style.pointerEvents = 'none';
    thumb.style.zIndex = '2';
    thumb.style.border = '2px solid #fff';
    track.appendChild(thumb);

    // Time display (below track)
    const timeDisplay = document.createElement('div');
    timeDisplay.style.marginTop = '6px';
    timeDisplay.style.color = '#999';
    timeDisplay.style.fontSize = '11px';
    timeDisplay.style.fontFamily = 'monospace';
    timeDisplay.style.textAlign = 'left';
    timeDisplay.textContent = '0.00s / 0.00s';

    // Wrapper container
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.padding = '0';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '4px';
    wrapper.appendChild(track);
    wrapper.appendChild(timeDisplay);

    containerRef.current.appendChild(wrapper);
    progressBarRef.current = progressBar;
    timeDisplayRef.current = timeDisplay;
    thumbRef.current = thumb;
    wrapperRef.current = wrapper;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    track.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Listen to engine events for 60fps updates
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        const duration = engine.duration;
        const playbackTime = engine.playbackTime;

        // Always update time display
        if (timeDisplayRef.current) {
          const seconds = playbackTime / 1000;
          const totalSeconds = duration / 1000;
          timeDisplayRef.current.textContent = `${seconds.toFixed(2)}s / ${totalSeconds.toFixed(2)}s`;
        }

        // Update progress bar and thumb if duration is valid
        if (duration > 0) {
          const progress = playbackTime / duration;
          const progressPercent = Math.max(0, Math.min(100, progress * 100));

          if (progressBarRef.current) {
            progressBarRef.current.style.width = `${progressPercent}%`;
          }

          if (thumbRef.current) {
            thumbRef.current.style.left = `${progressPercent}%`;
          }
        }
      }
    });

    return () => {
      unsubscribe();
      track.removeEventListener('mousedown', handleMouseDown);
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
        boxSizing: 'border-box',
      }}
    />
  );
}
