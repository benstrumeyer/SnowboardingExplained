import React, { useRef, useState } from 'react';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';
import { ScrubManager } from '../services/ScrubManager';
import '../styles/FrameScrubber.css';

interface FrameScrubberProps {
  cellId: string;
  totalFrames: number;
  fps: number;
}

export const FrameScrubber: React.FC<FrameScrubberProps> = ({
  cellId,
  totalFrames,
  fps,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  const engine = getGlobalPlaybackEngine();
  const frameInterval = 1000 / fps;
  const localTime = engine.getSceneLocalTime(cellId);
  const displayFrame = Math.floor(localTime / frameInterval);
  const progress = (displayFrame / totalFrames) * 100;

  const handleMouseDown = () => {
    console.log('%c[FrameScrubber] 🖱️  Scrub started:', 'color: #4ECDC4;', {
      cellId,
      currentFrame: displayFrame,
      totalFrames,
    });
    ScrubManager.onScrubStart();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.floor(percentage * totalFrames);
    const time = frame * frameInterval;

    console.log('%c[FrameScrubber] 🎯 Scrubbing to frame:', 'color: #4ECDC4;', {
      frame,
      time,
      percentage: (percentage * 100).toFixed(1),
    });

    ScrubManager.onScrubMove(time);
    setCurrentFrame(frame);
  };

  const handleMouseUp = () => {
    console.log('%c[FrameScrubber] ✅ Scrub ended:', 'color: #00FF00;', {
      cellId,
      finalFrame: currentFrame,
    });
    ScrubManager.onScrubEnd();
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.floor(percentage * totalFrames);
    const time = frame * frameInterval;

    console.log('%c[FrameScrubber] 🖱️  Click seek to frame:', 'color: #4ECDC4;', {
      frame,
      time,
      percentage: (percentage * 100).toFixed(1),
    });

    ScrubManager.onScrubStart();
    ScrubManager.onScrubMove(time);
    ScrubManager.onScrubEnd();
  };

  return (
    <div
      className="frame-scrubber"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={trackRef}
        className="scrubber-track"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        <div
          className="scrubber-progress"
          style={{ width: `${progress}%` }}
        />
        <div
          className="scrubber-thumb"
          style={{ left: `${progress}%` }}
        />
      </div>
      <span style={{ marginLeft: '8px', fontSize: '12px', whiteSpace: 'nowrap' }}>
        {displayFrame}/{totalFrames}
      </span>
    </div>
  );
};
