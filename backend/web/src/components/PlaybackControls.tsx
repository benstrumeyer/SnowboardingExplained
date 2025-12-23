import React, { useEffect } from 'react';
import '../styles/PlaybackControls.css';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  onPlayPause: () => void;
  onScrub: (frame: number) => void;
  onSpeedChange: (speed: number) => void;
}

/**
 * PlaybackControls Component
 * Manages playback state and timeline scrubbing
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentFrame,
  totalFrames,
  speed,
  onPlayPause,
  onScrub,
  onSpeedChange
}) => {
  const speedOptions = [0.25, 0.5, 1, 2, 4];
  const timelineRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (frameIndex: number): string => {
    if (totalFrames === 0) return '0:00';
    const fps = 30; // Default FPS
    const seconds = frameIndex / fps;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle mouse wheel scrubbing
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!timelineRef.current?.contains(e.target as Node)) return;
      
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1; // Invert: scroll down = backward
      const newFrame = Math.max(0, Math.min(totalFrames - 1, currentFrame + delta));
      onScrub(newFrame);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentFrame, totalFrames, onScrub]);

  return (
    <div className="playback-controls">
      {/* Playback Buttons */}
      <div className="playback-buttons">
        <button
          className="control-button previous-frame"
          onClick={() => onScrub(Math.max(0, currentFrame - 1))}
          title="Previous Frame"
          aria-label="Previous Frame"
        >
          ⏮
        </button>

        <button
          className={`control-button play-pause ${isPlaying ? 'playing' : 'paused'}`}
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          className="control-button next-frame"
          onClick={() => onScrub(Math.min(currentFrame + 1, totalFrames - 1))}
          title="Next Frame"
          aria-label="Next Frame"
        >
          ⏭
        </button>
      </div>

      {/* Timeline Slider */}
      <div className="timeline-container" ref={timelineRef}>
        <input
          type="range"
          className="timeline-slider"
          min="0"
          max={Math.max(0, totalFrames - 1)}
          value={currentFrame}
          onChange={(e) => onScrub(parseInt(e.target.value, 10))}
          title="Timeline Scrubber (scroll to scrub)"
          aria-label="Timeline"
        />
      </div>

      {/* Frame Counter */}
      <div className="frame-counter">
        <span className="current-time">{formatTime(currentFrame)}</span>
        <span className="separator">/</span>
        <span className="total-time">{formatTime(totalFrames - 1)}</span>
        <span className="frame-info">
          ({currentFrame} / {totalFrames - 1})
        </span>
      </div>

      {/* Speed Buttons */}
      <div className="speed-buttons">
        {speedOptions.map((s) => (
          <button
            key={s}
            className={`speed-button ${speed === s ? 'active' : ''}`}
            onClick={() => onSpeedChange(s)}
            title={`${s}x Speed`}
            aria-label={`${s}x Speed`}
            aria-pressed={speed === s}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlaybackControls;
