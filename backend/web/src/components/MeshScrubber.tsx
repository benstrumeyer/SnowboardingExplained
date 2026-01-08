import { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { PlayPauseButton, StepBackButton, StepForwardButton, FullscreenButton } from './PlaybackControls';

interface MeshScrubberProps {
  cellId: string;
  cellContainerRef?: React.RefObject<HTMLDivElement>;
  meshDataRef?: React.RefObject<any[]>;
  fps?: number;
  duration?: number;
  onFrameChange?: (frameIndex: number) => void;
  controlMode?: 'orbit' | 'arcball';
  onControlModeChange?: (mode: 'orbit' | 'arcball') => void;
}

export function MeshScrubber({ cellId, cellContainerRef, meshDataRef, fps = 30, duration = 0, onFrameChange, controlMode = 'orbit', onControlModeChange }: MeshScrubberProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const rulerSectionRef = useRef<HTMLDivElement | null>(null);
  const durationDisplayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomProgressRef = useRef<HTMLDivElement | null>(null);
  const trackerPlaybackTimeRef = useRef(0);
  const cellPlaybackTimeRef = useRef(0);
  const onFrameChangeRef = useRef(onFrameChange);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const meshPlaybackTimeRef = useRef(0);
  let lastMeshTimestamp = useRef(0);
  const handlePlayPauseRef = useRef<() => void>(() => {});

  const speeds = [1, 1.5, 2, 0.125, 0.25, 0.5, 0.75];
  const engine = getGlobalPlaybackEngine();

  useEffect(() => {
    onFrameChangeRef.current = onFrameChange;
  }, [onFrameChange]);

  useEffect(() => {
    engine.registerMeshCell(cellId);
    return () => {
      engine.unregisterMeshCell(cellId);
    };
  }, [cellId]);

  const updateTrackerColors = (expanded: boolean) => {
    const thumbElement = rulerRef.current?.querySelector('[data-thumb]') as HTMLDivElement;
    const thumbDot = rulerRef.current?.querySelector('[data-thumb-dot]') as HTMLDivElement;
    const progressLine = rulerRef.current?.querySelector('[data-progress-line]') as HTMLDivElement;

    const color = '#FFD700';
    const shadowColor = 'rgba(255, 215, 0, 0.6)';
    const progressShadow = '0 0 6px rgba(255, 215, 0, 0.6)';

    if (thumbElement) {
      thumbElement.style.backgroundColor = color;
      thumbElement.style.boxShadow = `0 0 8px ${shadowColor}`;
    }
    if (thumbDot) {
      thumbDot.style.backgroundColor = color;
      thumbDot.style.boxShadow = `0 0 8px ${shadowColor}`;
    }
    if (progressLine) {
      progressLine.style.backgroundColor = color;
      progressLine.style.boxShadow = progressShadow;
    }
  };

  const updateBottomProgressColor = (expanded: boolean) => {
    if (bottomProgressRef.current) {
      const color = '#FFD700';
      const shadowColor = '0 0 4px rgba(255, 215, 0, 0.6)';
      bottomProgressRef.current.style.backgroundColor = color;
      bottomProgressRef.current.style.boxShadow = shadowColor;
    }
  };

  const updateTrackerUI = (playbackTime: number, videoDuration: number) => {
    if (videoDuration > 0) {
      const progress = playbackTime / videoDuration;
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
  };

  const updateTrackerDirect = (playbackTime: number, videoDuration: number) => {
    if (videoDuration > 0) {
      const progress = playbackTime / videoDuration;
      const progressPercent = Math.max(0, Math.min(100, progress * 100));

      if (thumbRef.current) {
        thumbRef.current.style.transition = 'left 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        thumbRef.current.style.left = `${progressPercent}%`;
      }

      const thumbDot = rulerRef.current?.querySelector('[data-thumb-dot]') as HTMLDivElement;
      if (thumbDot) {
        thumbDot.style.transition = 'left 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        thumbDot.style.left = `${progressPercent}%`;
      }

      const progressLine = rulerRef.current?.querySelector('[data-progress-line]') as HTMLDivElement;
      if (progressLine) {
        progressLine.style.transition = 'width 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        progressLine.style.width = `${progressPercent}%`;
      }
    }
  };

  useEffect(() => {
    if (!rulerSectionRef.current || !rulerRef.current) return;

    const engine = getGlobalPlaybackEngine();

    const handleMouseEnter = () => {
      setIsExpanded(true);
    };

    const handleMouseLeave = () => {
      setIsExpanded(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

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
      thumbElement.style.backgroundColor = '#FFD700';
      thumbElement.style.top = '0';
      thumbElement.style.left = '0';
      thumbElement.style.transform = 'translateX(-50%)';
      thumbElement.style.boxShadow = '0 0 8px rgba(255, 215, 0, 0.6)';
      thumbElement.style.pointerEvents = 'none';
      thumbElement.style.zIndex = '2';
      thumbElement.style.opacity = '1';
      thumbElement.style.transition = 'opacity 0.3s ease, left 0.05s linear';
      rulerRef.current.appendChild(thumbElement);
      thumbRef.current = thumbElement;

      const thumbDot = document.createElement('div');
      thumbDot.setAttribute('data-thumb-dot', '1');
      thumbDot.style.position = 'absolute';
      thumbDot.style.width = '12px';
      thumbDot.style.height = '12px';
      thumbDot.style.backgroundColor = '#FFD700';
      thumbDot.style.borderRadius = '50%';
      thumbDot.style.top = '-6px';
      thumbDot.style.left = '0';
      thumbDot.style.transform = 'translateX(-50%)';
      thumbDot.style.boxShadow = '0 0 8px rgba(255, 215, 0, 0.8)';
      thumbDot.style.pointerEvents = 'none';
      thumbDot.style.zIndex = '2';
      thumbDot.style.transition = 'left 0.05s linear';
      rulerRef.current.appendChild(thumbDot);

      const progressLine = document.createElement('div');
      progressLine.setAttribute('data-progress-line', '1');
      progressLine.style.position = 'absolute';
      progressLine.style.height = '3px';
      progressLine.style.backgroundColor = '#FFD700';
      progressLine.style.top = '0';
      progressLine.style.left = '0';
      progressLine.style.width = '0%';
      progressLine.style.pointerEvents = 'none';
      progressLine.style.zIndex = '1';
      progressLine.style.boxShadow = '0 0 6px rgba(255, 215, 0, 0.6)';
      progressLine.style.transition = 'width 0.05s linear';
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
      const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * maxTime;
      meshPlaybackTimeRef.current = time;
      const frameCount = meshDataRef?.current?.length || 1;
      const frameIndex = Math.min(frameCount - 1, Math.floor(time / (maxTime / frameCount)));
      onFrameChangeRef.current?.(frameIndex);
      updateTrackerDirect(time, maxTime);
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = rulerSectionRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * maxTime;
      meshPlaybackTimeRef.current = time;
      const frameCount = meshDataRef?.current?.length || 1;
      const frameIndex = Math.min(frameCount - 1, Math.floor(time / (maxTime / frameCount)));
      onFrameChangeRef.current?.(frameIndex);
      updateTrackerDirect(time, maxTime);
      e.preventDefault();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
      engine.setMeshPlaybackTime(cellId, meshPlaybackTimeRef.current);
    };

    rulerSectionRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    setTimeout(renderRuler, 100);

    const handleRenderRulerIfNeeded = () => {
      const marks = rulerRef.current?.querySelectorAll('[data-mark]');
      if (!marks || marks.length === 0) {
        renderRuler();
      }
    };

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        handleRenderRulerIfNeeded();

        const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);

        if (durationDisplayRef.current) {
          const totalSeconds = Math.floor(maxTime / 1000);
          durationDisplayRef.current.textContent = `${totalSeconds}s`;
        }

        if (maxTime > 0 && !isDraggingRef.current) {
          updateTrackerUI(meshPlaybackTimeRef.current, maxTime);
        }

        if (!isExpanded && bottomProgressRef.current) {
          const progress = meshPlaybackTimeRef.current / maxTime;
          const progressPercent = Math.max(0, Math.min(100, progress * 100));
          bottomProgressRef.current.style.width = `${progressPercent}%`;
        }
      }
    });

    return () => {
      unsubscribe();
      rulerSectionRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [fps, meshDataRef, cellId, duration]);

  useEffect(() => {
    updateTrackerColors(isExpanded);
    updateBottomProgressColor(isExpanded);
  }, [isExpanded]);

  useEffect(() => {
    const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
    const frameCount = meshDataRef?.current?.length || 1;

    const unsubscribeEngine = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        if (isDraggingRef.current) return;

        const storedTime = engine.getMeshPlaybackTime(cellId);
        if (storedTime !== meshPlaybackTimeRef.current) {
          meshPlaybackTimeRef.current = storedTime;
          const frameIndex = Math.min(frameCount - 1, Math.floor(storedTime / (maxTime / frameCount)));
          onFrameChangeRef.current?.(frameIndex);
          updateTrackerUI(storedTime, maxTime);
        }
      }
    });

    return () => {
      unsubscribeEngine();
    };
  }, [cellId, fps, meshDataRef, duration]);

  useEffect(() => {
    if (!isPlaying) return;

    const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
    const frameCount = meshDataRef?.current?.length || 1;
    const speed = speeds[currentSpeedIndex];
    lastMeshTimestamp.current = performance.now();

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        const now = performance.now();
        const deltaMs = now - lastMeshTimestamp.current;
        lastMeshTimestamp.current = now;

        let newTime = meshPlaybackTimeRef.current + deltaMs * speed;

        if (newTime >= maxTime) {
          newTime = newTime % maxTime;
        } else if (newTime < 0) {
          newTime = maxTime + (newTime % maxTime);
        }

        meshPlaybackTimeRef.current = newTime;
        engine.setMeshPlaybackTime(cellId, newTime);

        const frameIndex = Math.min(frameCount - 1, Math.floor(newTime / (maxTime / frameCount)));
        onFrameChangeRef.current?.(frameIndex);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isPlaying, currentSpeedIndex, fps, meshDataRef, cellId, duration]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    handlePlayPauseRef.current = handlePlayPause;
  }, [isPlaying]);

  useEffect(() => {
    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'meshPlay' && event.cellId === cellId) {
        setIsPlaying(true);
        lastMeshTimestamp.current = performance.now();
      } else if (event.type === 'meshPause' && event.cellId === cellId) {
        setIsPlaying(false);
      } else if (event.type === 'meshFrameNext' && event.cellId === cellId) {
        setIsPlaying(false);
        const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
        const frameCount = meshDataRef?.current?.length || 1;
        const frameIntervalMs = maxTime / frameCount;
        const newTime = Math.min(maxTime, meshPlaybackTimeRef.current + frameIntervalMs);
        meshPlaybackTimeRef.current = newTime;
        engine.setMeshPlaybackTime(cellId, newTime);
        const frameIndex = Math.min(frameCount - 1, Math.floor(newTime / (maxTime / frameCount)));
        onFrameChangeRef.current?.(frameIndex);
        updateTrackerDirect(newTime, maxTime);
      } else if (event.type === 'meshFramePrev' && event.cellId === cellId) {
        setIsPlaying(false);
        const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
        const frameCount = meshDataRef?.current?.length || 1;
        const frameIntervalMs = maxTime / frameCount;
        const newTime = Math.max(0, meshPlaybackTimeRef.current - frameIntervalMs);
        meshPlaybackTimeRef.current = newTime;
        engine.setMeshPlaybackTime(cellId, newTime);
        const frameIndex = Math.min(frameCount - 1, Math.floor(newTime / (maxTime / frameCount)));
        onFrameChangeRef.current?.(frameIndex);
        updateTrackerDirect(newTime, maxTime);
      } else if (event.type === 'meshSpeedChanged' && event.cellId === cellId) {
        setCurrentSpeedIndex(speeds.indexOf(event.speed));
      }
    });

    return unsubscribe;
  }, [cellId, fps, meshDataRef, duration]);

  const handleStepBack = () => {
    setIsPlaying(false);
    const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
    const frameCount = meshDataRef?.current?.length || 1;
    const frameIntervalMs = maxTime / frameCount;
    const newTime = Math.max(0, meshPlaybackTimeRef.current - frameIntervalMs);
    meshPlaybackTimeRef.current = newTime;
    engine.setMeshPlaybackTime(cellId, newTime);
    const frameIndex = Math.min(frameCount - 1, Math.floor(newTime / (maxTime / frameCount)));
    onFrameChangeRef.current?.(frameIndex);
    updateTrackerUI(newTime, maxTime);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    const maxTime = duration > 0 ? duration : (meshDataRef?.current?.length || 1) * (1000 / fps);
    const frameCount = meshDataRef?.current?.length || 1;
    const frameIntervalMs = maxTime / frameCount;
    const newTime = Math.min(maxTime, meshPlaybackTimeRef.current + frameIntervalMs);
    meshPlaybackTimeRef.current = newTime;
    engine.setMeshPlaybackTime(cellId, newTime);
    const frameIndex = Math.min(frameCount - 1, Math.floor(newTime / (maxTime / frameCount)));
    onFrameChangeRef.current?.(frameIndex);
    updateTrackerUI(newTime, maxTime);
  };

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const container = cellContainerRef?.current;
      if (container?.requestFullscreen) {
        container.requestFullscreen();
      }
    }
  };

  const handleSpeedClick = () => {
    const newIndex = (currentSpeedIndex + 1) % speeds.length;
    setCurrentSpeedIndex(newIndex);
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
        border: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '90px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(2px)',
          pointerEvents: 'auto',
          zIndex: 5,
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
            userSelect: 'none',
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
            justifyContent: 'space-between',
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
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'monospace',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                const newMode = controlMode === 'orbit' ? 'arcball' : 'orbit';
                onControlModeChange?.(newMode);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.2s',
                fontFamily: 'monospace',
                minWidth: '60px',
                borderRadius: '3px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              {controlMode === 'orbit' ? 'Orbit' : 'Arcball'}
            </button>
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

            <StepBackButton onStepBack={handleStepBack} />
            <PlayPauseButton isPlaying={isPlaying} onPlayPause={handlePlayPause} />
            <StepForwardButton onStepForward={handleStepForward} />
          </div>

          <FullscreenButton onFullscreen={handleFullscreen} />
        </div>
      </div>
    </div>
  );
}
