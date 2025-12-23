import React from 'react';
import { FloatingControlPanel } from './FloatingControlPanel';

interface FloatingPanelFactoryProps {
  onModelSelect: (videoId: string, role: 'rider' | 'coach') => void;
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onFrameChange: (frame: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  children?: React.ReactNode;
}

/**
 * Factory function to create floating control panels
 * This replaces the inline floating panel divs in PoseOverlayViewer
 */
export const createFloatingPanel = (props: FloatingPanelFactoryProps) => {
  return (
    <FloatingControlPanel
      onModelSelect={props.onModelSelect}
      currentFrame={props.currentFrame}
      totalFrames={props.totalFrames}
      isPlaying={props.isPlaying}
      onPlayPause={props.onPlayPause}
      onFrameChange={props.onFrameChange}
      playbackSpeed={props.playbackSpeed}
      onSpeedChange={props.onSpeedChange}
    >
      {props.children}
    </FloatingControlPanel>
  );
};
