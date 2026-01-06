import { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { useGridStore } from '../stores/gridStore';
import { PlayPauseButton, StepBackButton, StepForwardButton } from './PlaybackControls';

interface GlobalScrubberOverlayProps {
  onSpeedChange?: (speed: number) => void;
}

export function GlobalScrubberOverlay({ onSpeedChange }: GlobalScrubberOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const rulerSectionRef = useRef<HTMLDivElement | null>(null);
  const durationDisplayRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
  const isContentLoaded = useGridStore((state) => state.isContentLoaded);

  const speeds = [1, 1.5, 2, 0.125, 0.25, 0.5, 0.75];
  const engine = getGlobalPlaybackEngine();

  useEffect(() => {
    if (!isContentLoaded || !rulerSectionRef.current || !rulerRef.current) return;

    const engine = getGlobalPlaybackEngine();

    const renderRuler = () => {
      if (!rulerRef.current) return;
      const marks = rulerRef.current.querySelectorAll('[data-mark]');
      marks.forEach(m => m.remove());
      
      const existingThumbs = rulerRef.current.querySelectorAll('[data-thumb]');
      existingThumbs.forEach(t => t.remove());

      const existingDots = rulerRef.current.querySelectorAll('[data-thumb-dot]');
      existingDots.forEach(d => d.remove());

      const existingProgressLines = rulerRef.current.querySelectorAll('[data-progress-line]');
      existingProgressLines.forEach(p => p.remove());

      const duration = engine.duration;
      if (duration <= 0) return;

      const thumbElement = document.createElement('div');
      thumbElement.setAttribute('data-thumb', '1');
      thumbElement.style.position = 'absolute';
      thumbElement.style.width = '2px';
      thumbElement.style.height = '100%';
      thumbElement.style.backgroundColor = '#FF6B6B';
      thumbElement.style.top = '0';
      thumbElement.style.left = '0';
      thumbElement.style.transform = 'translateX(-50%)';
      thumbElement.style.boxShadow = '0 0 8px rgba(255, 107, 107, 0.6)';
      thumbElement.style.pointerEvents = 'none';
      thumbElement.style.zIndex = '2';
      rulerRef.current.appendChild(thumbElement);
      thumbRef.current = thumbElement;

      const thumbDot = document.createElement('div');
      thumbDot.setAttribute('data-thumb-dot', '1');
      thumbDot.style.position = 'absolute';
      thumbDot.style.width = '10px';
      thumbDot.style.height = '10px';
      thumbDot.style.backgroundColor = '#FF6B6B';
      thumbDot.style.borderRadius = '50%';
      thumbDot.style.top = '-5px';
      thumbDot.style.left = '0';
      thumbDot.style.transform = 'translateX(-50%)';
      thumbDot.style.boxShadow = '0 0 8px rgba(255, 107, 107, 0.6)';
      thumbDot.style.pointerEvents = 'none';
      thumbDot.style.zIndex = '2';
      rulerRef.current.appendChild(thumbDot);

      const progressLine = document.createElement('div');
      progressLine.setAttribute('data-progress-line', '1');
      progressLine.style.position = 'absolute';
      progressLine.style.height = '2px';
      progressLine.style.backgroundColor = '#FF6B6B';
      progressLine.style.top = '0';
      progressLine.style.left = '0';
      progressLine.style.width = '0%';
      progressLine.style.pointerEvents = 'none';
      progressLine.style.zIndex = '1';
      progressLine.style.boxShadow = '0 0 4px rgba(255, 107, 107, 0.4)';
      rulerRef.current.appendChild(progressLine);

      const secondsTotal = duration / 1000;

      for (let i = 0; i <= secondsTotal; i += 0.25) {
        const percent = (i / secondsTotal) * 100;
        
        let markHeight = 6;
        let markWidth = 1;
        let opacity = 0.3;
        let showLabel = false;

        if (Math.abs(i % 1) < 0.01) {
          markHeight = 20;
          markWidth = 2;
          opacity = 0.6;
          showLabel = true;
        } else if (Math.abs((i % 1) - 0.5) < 0.01) {
          markHeight = 14;
          markWidth = 1.5;
          opacity = 0.45;
        } else {
          markHeight = 10;
          markWidth = 1;
          opacity = 0.35;
        }
        
        const mark = document.createElement('div');
        mark.setAttribute('data-mark', '1');
        mark.style.position = 'absolute';
        mark.style.left = `${percent}%`;
        mark.style.top = '12px';
        mark.style.width = `${markWidth}px`;
        mark.style.height = `${markHeight}px`;
        mark.style.backgroundColor = `rgba(255, 255, 255, ${opacity})`;
        mark.style.transform = 'translateX(-50%)';
        mark.style.zIndex = '0';
        rulerRef.current.appendChild(mark);

        if (showLabel) {
          const label = document.createElement('div');
          label.setAttribute('data-mark', '1');
          label.style.position = 'absolute';
          label.style.left = `${percent}%`;
          label.style.top = '34px';
          label.style.transform = 'translateX(-50%)';
          label.style.fontSize = '10px';
          label.style.color = 'rgba(255, 255, 255, 0.5)';
          label.style.fontFamily = 'monospace';
          label.style.whiteSpace = 'nowrap';
          label.style.zIndex = '0';
          label.textContent = `${Math.floor(i)}s`;
          rulerRef.current.appendChild(label);
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      isDraggingRef.current = true;
      const rect = rulerSectionRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = rulerSectionRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * engine.duration;
      engine.seek(time);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    rulerSectionRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    setTimeout(renderRuler, 100);

    let lastKnownDuration = 0;

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        const duration = engine.duration;
        const playbackTime = engine.playbackTime;

        if (duration !== lastKnownDuration && duration > 0) {
          lastKnownDuration = duration;
          renderRuler();
          if (durationDisplayRef.current) {
            const totalSeconds = Math.floor(duration / 1000);
            durationDisplayRef.current.textContent = `${totalSeconds}s`;
          }
        }

        if (duration > 0) {
          const progress = playbackTime / duration;
          const progressPercent = Math.max(0, Math.min(100, progress * 100));

          if (thumbRef.current) {
            thumbRef.current.style.left = `${progressPercent}%`;
          }

          const thumbDot = rulerRef.current?.querySelector('[data-thumb-dot]') as HTMLDivElement;
          if (thumbDot) {
            thumbDot.style.left = `${progressPercent}%`;
          }

          const progressLine = rulerRef.current?.querySelector('[data-progress-line]') as HTMLDivElement;
          if (progressLine) {
            progressLine.style.width = `${progressPercent}%`;
          }
        }
      } else if (event.type === 'play') {
        setIsPlaying(true);
      } else if (event.type === 'pause') {
        setIsPlaying(false);
      }
    });

    return () => {
      unsubscribe();
      rulerSectionRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isContentLoaded]);

  const handleSpeedClick = () => {
    const newIndex = (currentSpeedIndex + 1) % speeds.length;
    setCurrentSpeedIndex(newIndex);
    engine.setSpeed(speeds[newIndex]);
    onSpeedChange?.(speeds[newIndex]);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(2px)',
        border: 'none',
      }}
    >
      <div
        ref={rulerSectionRef}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          overflow: 'visible',
          pointerEvents: 'auto',
          border: 'none',
        }}
      >
        <div
          ref={rulerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          left: '0',
          right: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '0 12px',
          zIndex: 10,
          pointerEvents: 'auto',
          marginBottom: '8px',
        }}
      >
        <div
          ref={durationDisplayRef}
          style={{
            position: 'absolute',
            left: '12px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.4)',
            fontFamily: 'monospace',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleSpeedClick}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.5)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
              fontFamily: 'monospace',
              minWidth: '32px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            }}
          >
            {speeds[currentSpeedIndex]}x
          </button>

          <StepBackButton onStepBack={() => engine.advanceFrame(-1)} />
          <PlayPauseButton isPlaying={isPlaying} onPlayPause={() => {
            if (isPlaying) engine.pause();
            else engine.play();
          }} />
          <StepForwardButton onStepForward={() => engine.advanceFrame(1)} />
        </div>
      </div>
    </div>
  );
}
