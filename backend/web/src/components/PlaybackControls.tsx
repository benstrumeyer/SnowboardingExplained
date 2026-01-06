import React, { useState } from 'react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
}

export function PlayPauseButton({ isPlaying, onPlayPause }: { isPlaying: boolean; onPlayPause: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onPlayPause}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.6)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.2s ease',
        }}
      >
        {isPlaying ? (
          <>
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </>
        ) : (
          <polygon points="5 3 19 12 5 21 5 3" />
        )}
      </svg>
    </button>
  );
}

export function StepBackButton({ onStepBack }: { onStepBack: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onStepBack}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.2s ease',
        }}
      >
        <polygon points="19 3 5 12 19 21 19 3" />
        <line x1="3" y1="3" x2="3" y2="21" />
      </svg>
    </button>
  );
}

export function StepForwardButton({ onStepForward }: { onStepForward: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onStepForward}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.2s ease',
        }}
      >
        <polygon points="5 3 19 12 5 21 5 3" />
        <line x1="21" y1="3" x2="21" y2="21" />
      </svg>
    </button>
  );
}

export function FullscreenButton({ onFullscreen }: { onFullscreen: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onFullscreen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.2s ease',
        }}
      >
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    </button>
  );
}

export function PictureInPictureButton({ onPip }: { onPip: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onPip}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.2s ease',
        }}
      >
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <rect x="14" y="14" width="8" height="8" />
      </svg>
    </button>
  );
}

export function DownloadButton({ onDownload }: { onDownload: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onDownload}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isHovered ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.2s ease',
        }}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}
