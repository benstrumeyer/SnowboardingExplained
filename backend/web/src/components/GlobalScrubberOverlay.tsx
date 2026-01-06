import { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

interface GlobalScrubberOverlayProps {
  onSpeedChange?: (speed: number) => void;
}

export function GlobalScrubberOverlay({ onSpeedChange }: GlobalScrubberOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const timeDisplayRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const meterMarksRef = useRef<HTMLDivElement | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = getGlobalPlaybackEngine();

    // Create track container
    const track = document.createElement('div');
    track.style.position = 'relative';
    track.style.width = '100%';
    track.style.height = '24px';
    track.style.backgroundColor = '#333';
    track.style.borderRadius = '4px';
    track.style.cursor = 'pointer';
    track.style.border = '1px solid #444';
    track.style.overflow = 'hidden';

    // Meter marks container
    const meterMarks = document.createElement('div');
    meterMarks.style.position = 'absolute';
    meterMarks.style.width = '100%';
    meterMarks.style.height = '100%';
    meterMarks.style.pointerEvents = 'none';
    meterMarks.style.zIndex = '0';
    track.appendChild(meterMarks);
    meterMarksRef.current = meterMarks;

    // Function to render meter marks
    const renderMeterMarks = () => {
      meterMarks.innerHTML = '';
      const duration = engine.duration;
      if (duration <= 0) return;

      const secondsTotal = duration / 1000;

      // Determine interval based on duration
      let interval = 1; // 1 second
      if (secondsTotal > 60) interval = 10;
      if (secondsTotal > 300) interval = 30;

      for (let i = 0; i <= secondsTotal; i += interval) {
        const percent = (i / secondsTotal) * 100;
        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        mark.style.left = `${percent}%`;
        mark.style.top = '0';
        mark.style.width = '1px';
        mark.style.height = '6px';
        mark.style.backgroundColor = 'rgba(153, 153, 153, 0.4)';
        mark.style.transform = 'translateX(-0.5px)';
        meterMarks.appendChild(mark);
      }
    };

    // Render marks after a short delay to ensure track width is set
    setTimeout(renderMeterMarks, 100);

    // Progress bar
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

    // Thumb
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

    // Time display
    const timeDisplay = document.createElement('div');
    timeDisplay.style.marginTop = '4px';
    timeDisplay.style.color = '#999';
    timeDisplay.style.fontSize = '11px';
    timeDisplay.style.fontFamily = 'monospace';
    timeDisplay.style.textAlign = 'left';
    timeDisplay.textContent = '0.00s / 0.00s';

    // Playback controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.gap = '8px';
    controlsContainer.style.marginTop = '6px';
    controlsContainer.style.alignItems = 'center';

    // Play/Pause button
    const playBtn = document.createElement('button');
    playBtn.textContent = '▶';
    playBtn.style.padding = '6px 10px';
    playBtn.style.backgroundColor = '#333';
    playBtn.style.color = '#fff';
    playBtn.style.border = '1px solid #444';
    playBtn.style.borderRadius = '3px';
    playBtn.style.cursor = 'pointer';
    playBtn.style.fontSize = '12px';
    playBtn.style.minWidth = '32px';
    playBtn.onclick = () => {
      if (engine.isPlaying) {
        engine.pause();
        playBtn.textContent = '▶';
      } else {
        engine.play();
        playBtn.textContent = '⏸';
      }
    };
    controlsContainer.appendChild(playBtn);

    // Forward button
    const forwardBtn = document.createElement('button');
    forwardBtn.textContent = '⏭';
    forwardBtn.style.padding = '6px 10px';
    forwardBtn.style.backgroundColor = '#333';
    forwardBtn.style.color = '#fff';
    forwardBtn.style.border = '1px solid #444';
    forwardBtn.style.borderRadius = '3px';
    forwardBtn.style.cursor = 'pointer';
    forwardBtn.style.fontSize = '12px';
    forwardBtn.style.minWidth = '32px';
    forwardBtn.onclick = () => engine.advanceFrame(1);
    controlsContainer.appendChild(forwardBtn);

    // Loop button
    const loopBtn = document.createElement('button');
    loopBtn.textContent = '🔁';
    loopBtn.style.padding = '6px 10px';
    loopBtn.style.backgroundColor = engine.isLooping ? '#4ECDC4' : '#333';
    loopBtn.style.color = engine.isLooping ? '#000' : '#fff';
    loopBtn.style.border = '1px solid #444';
    loopBtn.style.borderRadius = '3px';
    loopBtn.style.cursor = 'pointer';
    loopBtn.style.fontSize = '12px';
    loopBtn.style.minWidth = '32px';
    loopBtn.onclick = () => {
      engine.toggleLoop();
      loopBtn.style.backgroundColor = engine.isLooping ? '#4ECDC4' : '#333';
      loopBtn.style.color = engine.isLooping ? '#000' : '#fff';
    };
    controlsContainer.appendChild(loopBtn);

    // Speed presets
    const speedContainer = document.createElement('div');
    speedContainer.style.display = 'flex';
    speedContainer.style.gap = '4px';
    speedContainer.style.marginLeft = '12px';

    const speeds = [0.5, 1, 1.5, 2];
    speeds.forEach((speed) => {
      const speedBtn = document.createElement('button');
      speedBtn.textContent = `${speed}x`;
      speedBtn.style.padding = '4px 8px';
      speedBtn.style.backgroundColor = speed === 1 ? '#4ECDC4' : '#333';
      speedBtn.style.color = speed === 1 ? '#000' : '#fff';
      speedBtn.style.border = '1px solid #444';
      speedBtn.style.borderRadius = '3px';
      speedBtn.style.cursor = 'pointer';
      speedBtn.style.fontSize = '11px';
      speedBtn.style.minWidth = '32px';
      speedBtn.onclick = () => {
        engine.setSpeed(speed);
        setCurrentSpeed(speed);
        onSpeedChange?.(speed);

        // Update button styles
        speeds.forEach((s) => {
          const btn = speedContainer.querySelector(`button:nth-child(${speeds.indexOf(s) + 1})`) as HTMLButtonElement;
          if (btn) {
            btn.style.backgroundColor = s === speed ? '#4ECDC4' : '#333';
            btn.style.color = s === speed ? '#000' : '#fff';
          }
        });
      };
      speedContainer.appendChild(speedBtn);
    });
    controlsContainer.appendChild(speedContainer);

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.padding = '8px';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '6px';
    wrapper.style.backgroundColor = 'rgba(26, 26, 26, 0.8)';
    wrapper.style.borderRadius = '4px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.appendChild(track);
    wrapper.appendChild(timeDisplay);
    wrapper.appendChild(controlsContainer);

    containerRef.current.appendChild(wrapper);
    progressBarRef.current = progressBar;
    timeDisplayRef.current = timeDisplay;
    thumbRef.current = thumb;
    wrapperRef.current = wrapper;

    // Mouse handlers
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

    // Engine listener
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        const duration = engine.duration;
        const playbackTime = engine.playbackTime;

        if (timeDisplayRef.current) {
          const seconds = playbackTime / 1000;
          const totalSeconds = duration / 1000;
          timeDisplayRef.current.textContent = `${seconds.toFixed(2)}s / ${totalSeconds.toFixed(2)}s`;
        }

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
      } else if (event.type === 'play') {
        playBtn.textContent = '⏸';
      } else if (event.type === 'pause') {
        playBtn.textContent = '▶';
      }
    });

    return () => {
      unsubscribe();
      track.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (containerRef.current && wrapperRef.current?.parentNode === containerRef.current) {
        containerRef.current.removeChild(wrapperRef.current);
      }
    };
  }, [onSpeedChange]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: 50,
        height: '60px',
      }}
    />
  );
}
