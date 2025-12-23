import React, { useEffect, useRef } from 'react';
import '../styles/VideoDisplay.css';

interface VideoDisplayProps {
  videoUrl: string;
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  fps?: number;
}

export const VideoDisplay: React.FC<VideoDisplayProps> = ({
  videoUrl,
  currentFrame,
  totalFrames,
  isPlaying,
  fps = 30,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync video playback with frame position
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const targetTime = currentFrame / fps;

    // Only update if the difference is significant (more than 1 frame)
    if (Math.abs(video.currentTime - targetTime) > 1 / fps) {
      video.currentTime = targetTime;
    }
  }, [currentFrame, fps]);

  // Sync play/pause state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(() => {
        // Playback may fail due to autoplay policies
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="video-display-container">
      <video
        ref={videoRef}
        src={videoUrl}
        className="video-display"
        controls={false}
        muted
      />
      <div className="video-frame-info">
        Frame: {currentFrame} / {totalFrames}
      </div>
    </div>
  );
};
