import React, { useEffect, useRef, useState } from 'react';
import '../styles/VideoDisplay.css';

interface VideoToggleDisplayProps {
  originalVideoUrl: string;
  overlayVideoUrl: string;
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  fps?: number;
}

export const VideoToggleDisplay: React.FC<VideoToggleDisplayProps> = ({
  originalVideoUrl,
  overlayVideoUrl,
  currentFrame,
  totalFrames,
  isPlaying,
  fps = 30,
}) => {
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const currentVideoRef = showOverlay ? overlayVideoRef : originalVideoRef;

  // Sync both videos with frame position
  useEffect(() => {
    const targetTime = currentFrame / fps;

    if (originalVideoRef.current) {
      if (Math.abs(originalVideoRef.current.currentTime - targetTime) > 1 / fps) {
        originalVideoRef.current.currentTime = targetTime;
      }
    }

    if (overlayVideoRef.current) {
      if (Math.abs(overlayVideoRef.current.currentTime - targetTime) > 1 / fps) {
        overlayVideoRef.current.currentTime = targetTime;
      }
    }
  }, [currentFrame, fps]);

  // Sync play/pause state for both videos
  useEffect(() => {
    const playVideo = (video: HTMLVideoElement | null) => {
      if (!video) return;
      video.play().catch(() => {
        // Playback may fail due to autoplay policies
      });
    };

    const pauseVideo = (video: HTMLVideoElement | null) => {
      if (!video) return;
      video.pause();
    };

    if (isPlaying) {
      playVideo(originalVideoRef.current);
      playVideo(overlayVideoRef.current);
    } else {
      pauseVideo(originalVideoRef.current);
      pauseVideo(overlayVideoRef.current);
    }
  }, [isPlaying]);

  return (
    <div className="video-display-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Original Video */}
      <video
        ref={originalVideoRef}
        src={originalVideoUrl}
        className="video-display"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: showOverlay ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
        controls={false}
        muted
      />

      {/* Overlay Video */}
      <video
        ref={overlayVideoRef}
        src={overlayVideoUrl}
        className="video-display"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: showOverlay ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}
        controls={false}
        muted
      />

      {/* Toggle Button */}
      <button
        onClick={() => setShowOverlay(!showOverlay)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          border: '2px solid #4ECDC4',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600',
          transition: 'all 0.2s ease-in-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          e.currentTarget.style.borderColor = '#FF6B6B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          e.currentTarget.style.borderColor = '#4ECDC4';
        }}
      >
        {showOverlay ? '🎬 Overlay' : '📹 Original'}
      </button>

      {/* Frame Info */}
      <div className="video-frame-info">
        Frame: {currentFrame} / {totalFrames}
      </div>
    </div>
  );
};
