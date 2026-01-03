import React, { useRef, useState } from 'react';

interface FrameScrubberProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onFrameChange: (frame: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function FrameScrubber({
  currentFrame,
  totalFrames,
  isPlaying,
  onFrameChange,
  onDragStart,
  onDragEnd,
}: FrameScrubberProps) {
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
    onDragStart();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.floor(percentage * totalFrames);

    onFrameChange(frame);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const frame = Math.floor(percentage * totalFrames);

    onFrameChange(frame);
  };

  const percentage = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  return (
    <div
      style={{
        width: '100%',
        height: '40px',
        backgroundColor: '#222',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px',
      }}
    >
      <div
        ref={scrubberRef}
        style={{
          flex: 1,
          height: '4px',
          backgroundColor: '#444',
          borderRadius: '2px',
          position: 'relative',
          cursor: 'pointer',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        <div
          style={{
            position: 'absolute',
            height: '100%',
            backgroundColor: '#4ECDC4',
            borderRadius: '2px',
            width: `${percentage}%`,
            transition: isDragging ? 'none' : 'width 0.1s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percentage}%`,
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            backgroundColor: '#4ECDC4',
            borderRadius: '50%',
            cursor: 'grab',
            boxShadow: '0 0 4px rgba(78, 205, 196, 0.5)',
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
      <div
        style={{
          color: '#999',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          minWidth: '80px',
          textAlign: 'right',
        }}
      >
        Frame {currentFrame}/{totalFrames}
      </div>
    </div>
  );
}
