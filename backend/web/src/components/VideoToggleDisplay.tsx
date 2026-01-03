import React, { useEffect, useRef, useState } from 'react';
import '../styles/VideoDisplay.css';

interface VideoFrame {
  frameNumber: number;
  imageUrl: string;
}

interface VideoToggleDisplayProps {
  videoId: string;
  totalFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  fps?: number;
}

export const VideoToggleDisplay: React.FC<VideoToggleDisplayProps> = ({
  videoId,
  totalFrames,
  currentFrame,
  isPlaying,
  fps = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [frames, setFrames] = useState<{ original: VideoFrame[]; overlay: VideoFrame[] }>({
    original: [],
    overlay: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFrames = async () => {
      try {
        console.log(`[VIDEO_TOGGLE] Loading frames for videoId=${videoId}`);
        setLoading(true);

        const originalFrames: VideoFrame[] = [];
        const overlayFrames: VideoFrame[] = [];

        for (let i = 0; i < totalFrames; i++) {
          originalFrames.push({
            frameNumber: i,
            imageUrl: `/api/mesh-data/${videoId}/frame/${i}/original`,
          });

          overlayFrames.push({
            frameNumber: i,
            imageUrl: `/api/mesh-data/${videoId}/frame/${i}/overlay`,
          });
        }

        setFrames({ original: originalFrames, overlay: overlayFrames });
        console.log(`[VIDEO_TOGGLE] Loaded ${totalFrames} frame references`);
        setLoading(false);
      } catch (error) {
        console.error(`[VIDEO_TOGGLE] Error loading frames:`, error);
        setLoading(false);
      }
    };

    loadFrames();
  }, [videoId, totalFrames]);

  useEffect(() => {
    if (!canvasRef.current || frames.original.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameArray = showOverlay ? frames.overlay : frames.original;
    const frameIndex = Math.min(currentFrame, frameArray.length - 1);
    const frame = frameArray[frameIndex];

    if (!frame) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.onerror = () => {
      console.error(`[VIDEO_TOGGLE] Failed to load frame: ${frame.imageUrl}`);
    };
    img.src = frame.imageUrl;
  }, [currentFrame, showOverlay, frames]);

  if (loading) {
    return (
      <div className="video-display-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#999' }}>
          <div style={{ marginBottom: '10px' }}>Loading frames...</div>
          <div style={{ fontSize: '12px' }}>({frames.original.length}/{totalFrames})</div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-display-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
        }}
      />

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

      <div className="video-frame-info">
        Frame: {currentFrame} / {totalFrames}
      </div>
    </div>
  );
};
