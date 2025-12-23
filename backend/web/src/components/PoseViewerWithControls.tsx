import React, { useState, useEffect } from 'react';
import { PoseOverlayViewer } from './PoseOverlayViewer';
import '../styles/PoseViewerWithControls.css';

interface PoseViewerWithControlsProps {
  riderVideoId: string;
  referenceVideoId: string;
  viewMode: 'side-by-side' | 'overlay' | 'comparison' | 'single-scene';
  onViewModeChange: (mode: 'side-by-side' | 'overlay' | 'comparison' | 'single-scene') => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  totalFrames: number;
  onTotalFramesChange: (frames: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  sharedCameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
  onRiderVideoChange?: (videoId: string) => void;
  onReferenceVideoChange?: (videoId: string) => void;
}

/**
 * Wrapper component that adds shared controls and draggable panels to PoseOverlayViewer
 * The shared controls (camera, playback) override individual scene controls
 */
export function PoseViewerWithControls(props: PoseViewerWithControlsProps) {
  // The shared controls from App.tsx are passed as props and override scene-level controls
  // This component simply passes them through to PoseOverlayViewer
  
  return (
    <div className="pose-viewer-with-controls">
      <PoseOverlayViewer
        {...props}
        // Shared controls override individual scene controls
        isPlaying={props.isPlaying}
        onPlayingChange={props.onPlayingChange}
        currentFrame={props.currentFrame}
        onFrameChange={props.onFrameChange}
        playbackSpeed={props.playbackSpeed}
        onSpeedChange={props.onSpeedChange}
        sharedCameraPreset={props.sharedCameraPreset}
      />
    </div>
  );
}
