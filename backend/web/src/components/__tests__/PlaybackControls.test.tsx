import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from '../PlaybackControls';
import { createPlaybackService } from '../../services/playbackService';
import { MeshSequence, SyncedFrame, SkeletonConnection } from '../../types';

/**
 * Unit Tests for PlaybackControls Component
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

describe('PlaybackControls Component', () => {
  let mockMeshSequence: MeshSequence;
  let playbackService: ReturnType<typeof createPlaybackService>;

  /**
   * Create mock MeshSequence for testing
   */
  function createMockMeshSequence(fps: number, totalFrames: number): MeshSequence {
    const frames: SyncedFrame[] = Array.from({ length: totalFrames }, (_, i) => ({
      frameIndex: i,
      timestamp: (i / fps) * 1000,
      videoFrameData: { offset: i },
      meshData: {
        keypoints: Array.from({ length: 33 }, (_, kpIdx) => ({
          index: kpIdx,
          name: `keypoint_${kpIdx}`,
          position: [0, 0, 0] as [number, number, number],
          confidence: 0.95
        })),
        skeleton: [{ from: 0, to: 1 }] as SkeletonConnection[],
        vertices: [],
        faces: []
      }
    }));

    return {
      videoId: 'test-video',
      videoUrl: 'http://example.com/video.mp4',
      fps,
      videoDuration: totalFrames / fps,
      totalFrames,
      frames,
      metadata: {
        uploadedAt: new Date(),
        processingTime: 1000,
        extractionMethod: 'mediapipe'
      }
    };
  }

  beforeEach(() => {
    mockMeshSequence = createMockMeshSequence(30, 300);
    playbackService = createPlaybackService(mockMeshSequence);
  });

  /**
   * Test play/pause button functionality
   */
  describe('Play/Pause Button', () => {
    it('should render play button initially', () => {
      render(<PlaybackControls playbackService={playbackService} />);
      const playButton = screen.getByLabelText('Play');
      expect(playButton).toBeInTheDocument();
    });

    it('should toggle play/pause on button click', () => {
      render(<PlaybackControls playbackService={playbackService} />);
      const playButton = screen.getByLabelText('Play');

      fireEvent.click(playButton);
      expect(playbackService.getIsPlaying()).toBe(true);

      const pauseButton = screen.getByLabelText('Pause');
      fireEvent.click(pauseButton);
      expect(playbackService.getIsPlaying()).toBe(false);
    });

    it('should update button text based on playback state', () => {
      const { rerender } = render(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();

      playbackService.play();
      rerender(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });

  /**
   * Test speed selector updates
   */
  describe('Speed Selector', () => {
    it('should render speed buttons', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByText('0.25x')).toBeInTheDocument();
      expect(screen.getByText('0.5x')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('4x')).toBeInTheDocument();
    });

    it('should update speed on button click', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      const speedButton2x = screen.getByText('2x');
      fireEvent.click(speedButton2x);

      expect(playbackService.getSpeed()).toBe(2);
    });

    it('should highlight active speed button', () => {
      const { rerender } = render(<PlaybackControls playbackService={playbackService} />);

      const speedButton1x = screen.getByText('1x');
      expect(speedButton1x.parentElement).toHaveClass('active');

      playbackService.setSpeed(2);
      rerender(<PlaybackControls playbackService={playbackService} />);

      const speedButton2x = screen.getByText('2x');
      expect(speedButton2x.parentElement).toHaveClass('active');
    });

    it('should update speed via dropdown', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      const speedDropdown = screen.getByDisplayValue('1');
      fireEvent.change(speedDropdown, { target: { value: '0.5' } });

      expect(playbackService.getSpeed()).toBe(0.5);
    });
  });

  /**
   * Test timeline slider seeking
   */
  describe('Timeline Slider', () => {
    it('should render timeline slider', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      const slider = screen.getByRole('slider', { name: 'Timeline' });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '299');
    });

    it('should seek on slider change', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      const slider = screen.getByRole('slider', { name: 'Timeline' });
      fireEvent.change(slider, { target: { value: '150' } });

      expect(playbackService.getCurrentFrameIndex()).toBe(150);
    });

    it('should update slider position on frame change', () => {
      const { rerender } = render(<PlaybackControls playbackService={playbackService} />);

      playbackService.seek(100);
      rerender(<PlaybackControls playbackService={playbackService} />);

      const slider = screen.getByRole('slider', { name: 'Timeline' });
      expect(slider).toHaveValue('100');
    });
  });

  /**
   * Test frame counter display
   */
  describe('Frame Counter', () => {
    it('should display frame counter', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByText(/0:00/)).toBeInTheDocument();
      expect(screen.getByText(/\(0 \/ 299\)/)).toBeInTheDocument();
    });

    it('should update frame counter on seek', () => {
      const { rerender } = render(<PlaybackControls playbackService={playbackService} />);

      playbackService.seek(60);
      rerender(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByText(/\(60 \/ 299\)/)).toBeInTheDocument();
    });

    it('should format time correctly', () => {
      const { rerender } = render(<PlaybackControls playbackService={playbackService} />);

      // Seek to 2 seconds (60 frames at 30 fps)
      playbackService.seek(60);
      rerender(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByText(/0:02/)).toBeInTheDocument();
    });
  });

  /**
   * Test frame navigation buttons
   */
  describe('Frame Navigation Buttons', () => {
    it('should render previous and next frame buttons', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByLabelText('Previous Frame')).toBeInTheDocument();
      expect(screen.getByLabelText('Next Frame')).toBeInTheDocument();
    });

    it('should advance frame on next button click', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      playbackService.seek(50);
      const nextButton = screen.getByLabelText('Next Frame');
      fireEvent.click(nextButton);

      expect(playbackService.getCurrentFrameIndex()).toBe(51);
    });

    it('should go back frame on previous button click', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      playbackService.seek(50);
      const previousButton = screen.getByLabelText('Previous Frame');
      fireEvent.click(previousButton);

      expect(playbackService.getCurrentFrameIndex()).toBe(49);
    });
  });

  /**
   * Test callback functionality
   */
  describe('Callbacks', () => {
    it('should call onFrameChange callback on frame update', () => {
      const onFrameChange = vi.fn();
      render(
        <PlaybackControls playbackService={playbackService} onFrameChange={onFrameChange} />
      );

      playbackService.seek(100);

      expect(onFrameChange).toHaveBeenCalledWith(100);
    });

    it('should call onFrameChange on next frame', () => {
      const onFrameChange = vi.fn();
      render(
        <PlaybackControls playbackService={playbackService} onFrameChange={onFrameChange} />
      );

      playbackService.seek(50);
      onFrameChange.mockClear();

      const nextButton = screen.getByLabelText('Next Frame');
      fireEvent.click(nextButton);

      expect(onFrameChange).toHaveBeenCalledWith(51);
    });
  });

  /**
   * Test accessibility
   */
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      expect(screen.getByLabelText('Play')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous Frame')).toBeInTheDocument();
      expect(screen.getByLabelText('Next Frame')).toBeInTheDocument();
      expect(screen.getByLabelText('Timeline')).toBeInTheDocument();
      expect(screen.getByLabelText('Playback Speed')).toBeInTheDocument();
    });

    it('should have proper ARIA pressed state for speed buttons', () => {
      render(<PlaybackControls playbackService={playbackService} />);

      const speedButton1x = screen.getByText('1x');
      expect(speedButton1x).toHaveAttribute('aria-pressed', 'true');

      const speedButton2x = screen.getByText('2x');
      expect(speedButton2x).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
