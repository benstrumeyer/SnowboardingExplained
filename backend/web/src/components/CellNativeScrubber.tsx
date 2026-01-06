import { useEffect, useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { PlayPauseButton, StepBackButton, StepForwardButton, FullscreenButton } from './PlaybackControls';

interface CellNativeScrubberProps {
  cellId: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
  cellContainerRef?: React.RefObject<HTMLDivElement>;
}

export function CellNativeScrubber({ cellId, videoRef, cellContainerRef }: CellNativeScrubberProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const rulerSectionRef = useRef<HTMLDivElement | null>(null);
  const durationDisplayRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomProgressRef = useRef<HTMLDivElement | null>(null);
  const trackerPlaybackTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const speeds = [1, 1.5, 2, 0.125, 0.25, 0.5, 0.75];
  const engine = getGlobalPlaybackEngine();

  const updateTrackerColors = (expanded: boolean) => {
    const thumbElement = rulerRef.current?.querySelector('[data-thumb]') as HTMLDivElement;
    const thumbDot = rulerRef.current?.querySelector('[data-thumb-dot]') as HTMLDivElement;
    const progressLine = rulerRef.current?.querySelector('[data-progress-line]') as HTMLDivElement;

    const color = expanded ? '#FF6B6B' : '#FFD700';
    const shadowColor = expanded ? 'rgba(255, 107, 107, 0.6)' : 'rgba(255, 215, 0, 0.6)';
    const progressShadow = expanded ? '0 0 4px rgba(255, 107, 107, 0.4)' : '0 0 6px rgba(255, 215, 0, 0.6)';

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
      const color = expanded ? '#FF6B6B' : '#FFD700';
      const shadowColor = expanded ? '0 0 4px rgba(255, 107, 107, 0.4)' : '0 0 4px rgba(255, 215, 0, 0.6)';
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

      const video = videoRef?.current;
      if (!video || video.duration <= 0) return;

      const duration = video.duration * 1000;

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
      engine.setIndependentPlayback(cellId, true);
      const rect = rulerSectionRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const video = videoRef?.current;
      if (video) {
        const time = progress * (video.duration * 1000);
        engine.setCellPlaybackTime(cellId, time);
        trackerPlaybackTimeRef.current = time;
        const videoDuration = video.duration * 1000;
        updateTrackerDirect(time, videoDuration);
      }
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = rulerSectionRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const video = videoRef?.current;
      if (video) {
        const time = progress * (video.duration * 1000);
        engine.setCellPlaybackTime(cellId, time);
        trackerPlaybackTimeRef.current = time;
        const videoDuration = video.duration * 1000;
        updateTrackerDirect(time, videoDuration);
      }
      e.preventDefault();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    rulerSectionRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const handleVideoMetadata = () => {
      renderRuler();
    };

    const handleVideoPlay = () => {
      setIsPlaying(true);
      engine.setIndependentPlayback(cellId, true);
    };

    const handleVideoPause = () => {
      setIsPlaying(false);
    };

    const videoElement = videoRef?.current;
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', handleVideoMetadata);
      videoElement.addEventListener('durationchange', handleVideoMetadata);
      videoElement.addEventListener('play', handleVideoPlay);
      videoElement.addEventListener('pause', handleVideoPause);
    }

    setTimeout(renderRuler, 100);

    let trackerPlaybackTime = 0;

    const handleRenderRulerIfNeeded = () => {
      const video = videoRef?.current;
      if (video && video.duration > 0) {
        const marks = rulerRef.current?.querySelectorAll('[data-mark]');
        if (!marks || marks.length === 0) {
          renderRuler();
        }
      }
    };

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'frameUpdate') {
        handleRenderRulerIfNeeded();
        
        const video = videoRef?.current;
        if (!video) return;

        const videoDuration = video.duration * 1000;
        const isIndependent = engine.isIndependent(cellId);

        if (durationDisplayRef.current) {
          const totalSeconds = Math.floor(videoDuration / 1000);
          durationDisplayRef.current.textContent = `${totalSeconds}s`;
        }

        if (isIndependent) {
          trackerPlaybackTime = video.currentTime * 1000;
          const progress = trackerPlaybackTime / videoDuration;
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
        } else {
          if (!video.paused) {
            trackerPlaybackTime = video.currentTime * 1000;
            updateTrackerUI(trackerPlaybackTime, videoDuration);
          }
        }

        if (!isExpanded && bottomProgressRef.current) {
          const videoDuration = video.duration * 1000;
          const progress = video.currentTime * 1000 / videoDuration;
          const progressPercent = Math.max(0, Math.min(100, progress * 100));
          bottomProgressRef.current.style.width = `${progressPercent}%`;
        }
      } else if (event.type === 'play') {
        setIsPlaying(true);
        engine.setIndependentPlayback(cellId, false);
      } else if (event.type === 'pause') {
        setIsPlaying(false);
        const video = videoRef?.current;
        if (video && !video.paused) {
          video.pause();
        }
        engine.setIndependentPlayback(cellId, false);
      } else if (event.type === 'timeSet') {
        trackerPlaybackTimeRef.current = event.time;
        engine.setIndependentPlayback(cellId, false);
      } else if (event.type === 'cellFrameNext' && event.cellId === cellId) {
        const video = videoRef?.current;
        if (video) {
          if (!video.paused) video.pause();
          const frameIntervalMs = 1000 / 30;
          const nextTime = Math.min(video.duration, video.currentTime + frameIntervalMs / 1000);
          video.currentTime = nextTime;
          trackerPlaybackTimeRef.current = nextTime * 1000;
          const videoDuration = video.duration * 1000;
          updateTrackerUI(trackerPlaybackTimeRef.current, videoDuration);
        }
        setIsPlaying(false);
      } else if (event.type === 'cellFramePrev' && event.cellId === cellId) {
        const video = videoRef?.current;
        if (video) {
          if (!video.paused) video.pause();
          const frameIntervalMs = 1000 / 30;
          const nextTime = Math.max(0, video.currentTime - frameIntervalMs / 1000);
          video.currentTime = nextTime;
          trackerPlaybackTimeRef.current = nextTime * 1000;
          const videoDuration = video.duration * 1000;
          updateTrackerUI(trackerPlaybackTimeRef.current, videoDuration);
        }
        setIsPlaying(false);
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
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', handleVideoMetadata);
        videoElement.removeEventListener('durationchange', handleVideoMetadata);
        videoElement.removeEventListener('play', handleVideoPlay);
        videoElement.removeEventListener('pause', handleVideoPause);
      }
    };
  }, [cellId, videoRef, engine]);

  useEffect(() => {
    updateTrackerColors(isExpanded);
    updateBottomProgressColor(isExpanded);
  }, [isExpanded]);

  const handleSpeedClick = () => {
    const newIndex = (currentSpeedIndex + 1) % speeds.length;
    setCurrentSpeedIndex(newIndex);
    engine.setSpeed(speeds[newIndex]);
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(2px)',
          opacity: 1,
          transform: 'translateY(0)',
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

            <StepBackButton onStepBack={() => {
              const video = videoRef?.current;
              if (video) {
                if (!video.paused) video.pause();
                const frameIntervalMs = 1000 / 30;
                const nextTime = Math.max(0, video.currentTime - frameIntervalMs / 1000);
                video.currentTime = nextTime;
                trackerPlaybackTimeRef.current = nextTime * 1000;
                const videoDuration = video.duration * 1000;
                updateTrackerUI(trackerPlaybackTimeRef.current, videoDuration);
              }
            }} />
            <PlayPauseButton isPlaying={isPlaying} onPlayPause={() => {
              const video = videoRef?.current;
              if (video) {
                if (video.paused) {
                  video.play().catch(() => { });
                } else {
                  video.pause();
                }
              }
            }} />
            <StepForwardButton onStepForward={() => {
              const video = videoRef?.current;
              if (video) {
                if (!video.paused) video.pause();
                const frameIntervalMs = 1000 / 30;
                const nextTime = Math.min(video.duration, video.currentTime + frameIntervalMs / 1000);
                video.currentTime = nextTime;
                trackerPlaybackTimeRef.current = nextTime * 1000;
                const videoDuration = video.duration * 1000;
                updateTrackerUI(trackerPlaybackTimeRef.current, videoDuration);
              }
            }} />
          </div>

          <FullscreenButton onFullscreen={handleFullscreen} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          zIndex: 3,
          pointerEvents: 'none',
          display: !isExpanded ? 'block' : 'none',
        }}
      >
        <div
          ref={bottomProgressRef}
          style={{
            position: 'absolute',
            height: '2px',
            backgroundColor: '#FFD700',
            top: '0',
            left: '0',
            width: '0%',
            pointerEvents: 'none',
            zIndex: 1,
            boxShadow: '0 0 4px rgba(255, 215, 0, 0.6)',
          }}
        />
      </div>
    </div>
  );
}
