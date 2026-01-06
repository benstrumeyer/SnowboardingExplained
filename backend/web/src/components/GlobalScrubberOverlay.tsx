import { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { useGridStore } from '../stores/gridStore';

interface GlobalScrubberOverlayProps {
  onSpeedChange?: (speed: number) => void;
}

export function GlobalScrubberOverlay({ onSpeedChange }: GlobalScrubberOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const timeDisplayRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const meterMarksRef = useRef<HTMLDivElement | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const speedButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const playBtnRef = useRef<HTMLButtonElement | null>(null);
  const isContentLoaded = useGridStore((state) => state.isContentLoaded);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setShouldRender(isContentLoaded);
  }, [isContentLoaded]);

  useEffect(() => {
    if (!shouldRender || !containerRef.current) return;

    const engine = getGlobalPlaybackEngine();

    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';
    wrapper.style.boxSizing = 'border-box';

    const timelineSection = document.createElement('div');
    timelineSection.style.flex = '1';
    timelineSection.style.display = 'flex';
    timelineSection.style.flexDirection = 'column';
    timelineSection.style.gap = '4px';
    timelineSection.style.minHeight = '0';

    const timeDisplay = document.createElement('div');
    timeDisplay.style.color = '#999';
    timeDisplay.style.fontSize = '11px';
    timeDisplay.style.fontFamily = 'monospace';
    timeDisplay.style.textAlign = 'left';
    timeDisplay.textContent = '0.00s / 0.00s';
    timelineSection.appendChild(timeDisplay);

    const track = document.createElement('div');
    track.style.position = 'relative';
    track.style.flex = '1';
    track.style.backgroundColor = '#333';
    track.style.borderRadius = '4px';
    track.style.cursor = 'pointer';
    track.style.border = '1px solid #444';
    track.style.overflow = 'hidden';
    track.style.minHeight = '24px';

    const meterMarks = document.createElement('div');
    meterMarks.style.position = 'absolute';
    meterMarks.style.width = '100%';
    meterMarks.style.height = '100%';
    meterMarks.style.pointerEvents = 'none';
    meterMarks.style.zIndex = '0';
    track.appendChild(meterMarks);
    meterMarksRef.current = meterMarks;

    const renderMeterMarks = () => {
      meterMarks.innerHTML = '';
      const duration = engine.duration;
      if (duration <= 0) return;

      const secondsTotal = duration / 1000;
      let interval = 1;
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

    setTimeout(renderMeterMarks, 100);

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

    timelineSection.appendChild(track);
    wrapper.appendChild(timelineSection);

    const controlsSection = document.createElement('div');
    controlsSection.style.display = 'flex';
    controlsSection.style.gap = '12px';
    controlsSection.style.alignItems = 'center';
    controlsSection.style.justifyContent = 'center';
    controlsSection.style.flexShrink = '0';
    controlsSection.style.height = '32px';

    const speedDisplay = document.createElement('div');
    speedDisplay.style.display = 'flex';
    speedDisplay.style.gap = '4px';
    speedDisplay.style.alignItems = 'center';
    speedDisplay.style.marginRight = '12px';

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
      speedBtn.style.fontWeight = speed === 1 ? '600' : '500';
      speedBtn.onclick = () => {
        engine.setSpeed(speed);
        setCurrentSpeed(speed);
        onSpeedChange?.(speed);

        speeds.forEach((s) => {
          const btn = speedButtonsRef.current.get(s);
          if (btn) {
            btn.style.backgroundColor = s === speed ? '#4ECDC4' : '#333';
            btn.style.color = s === speed ? '#000' : '#fff';
            btn.style.fontWeight = s === speed ? '600' : '500';
          }
        });
      };
      speedButtonsRef.current.set(speed, speedBtn);
      speedDisplay.appendChild(speedBtn);
    });
    controlsSection.appendChild(speedDisplay);

    const playbackControls = document.createElement('div');
    playbackControls.style.display = 'flex';
    playbackControls.style.gap = '8px';
    playbackControls.style.alignItems = 'center';

    const stepPrevBtn = document.createElement('button');
    stepPrevBtn.textContent = '⏮';
    stepPrevBtn.style.padding = '6px 10px';
    stepPrevBtn.style.backgroundColor = '#333';
    stepPrevBtn.style.color = '#fff';
    stepPrevBtn.style.border = '1px solid #444';
    stepPrevBtn.style.borderRadius = '3px';
    stepPrevBtn.style.cursor = 'pointer';
    stepPrevBtn.style.fontSize = '14px';
    stepPrevBtn.style.minWidth = '32px';
    stepPrevBtn.onclick = () => engine.advanceFrame(-1);
    playbackControls.appendChild(stepPrevBtn);

    const playBtn = document.createElement('button');
    playBtn.textContent = '▶';
    playBtn.style.padding = '6px 12px';
    playBtn.style.backgroundColor = '#FF6B6B';
    playBtn.style.color = '#fff';
    playBtn.style.border = 'none';
    playBtn.style.borderRadius = '3px';
    playBtn.style.cursor = 'pointer';
    playBtn.style.fontSize = '14px';
    playBtn.style.minWidth = '40px';
    playBtn.style.fontWeight = '600';
    playBtn.onclick = () => {
      if (engine.isPlaying) {
        engine.pause();
        playBtn.textContent = '▶';
      } else {
        engine.play();
        playBtn.textContent = '⏸';
      }
    };
    playbackControls.appendChild(playBtn);
    playBtnRef.current = playBtn;

    const stepNextBtn = document.createElement('button');
    stepNextBtn.textContent = '⏭';
    stepNextBtn.style.padding = '6px 10px';
    stepNextBtn.style.backgroundColor = '#333';
    stepNextBtn.style.color = '#fff';
    stepNextBtn.style.border = '1px solid #444';
    stepNextBtn.style.borderRadius = '3px';
    stepNextBtn.style.cursor = 'pointer';
    stepNextBtn.style.fontSize = '14px';
    stepNextBtn.style.minWidth = '32px';
    stepNextBtn.onclick = () => engine.advanceFrame(1);
    playbackControls.appendChild(stepNextBtn);

    controlsSection.appendChild(playbackControls);
    wrapper.appendChild(controlsSection);

    containerRef.current.appendChild(wrapper);
    progressBarRef.current = progressBar;
    timeDisplayRef.current = timeDisplay;
    thumbRef.current = thumb;
    trackRef.current = track;

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
        if (playBtnRef.current) playBtnRef.current.textContent = '⏸';
      } else if (event.type === 'pause') {
        if (playBtnRef.current) playBtnRef.current.textContent = '▶';
      }
    });

    return () => {
      unsubscribe();
      track.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (containerRef.current?.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    };
  }, [shouldRender, onSpeedChange]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        boxSizing: 'border-box',
        backgroundColor: '#1a1a1a',
      }}
    />
  );
}
