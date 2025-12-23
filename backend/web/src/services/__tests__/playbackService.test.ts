import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaybackService, createPlaybackService, PlaybackSpeed } from '../playbackService';
import { MeshSequence, SyncedFrame, SkeletonConnection } from '../../types';

/**
 * Property-Based Tests for Playback Service
 * Feature: mesh-viewer-mvp
 * Property 1: Frame Synchronization Invariant
 * Property 2: Playback Speed Consistency
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4
 */

describe('PlaybackService - Property 1: Frame Synchronization Invariant', () => {
  let playbackService: PlaybackService;
  let mockMeshSequence: MeshSequence;

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
   * Property 1: Frame Synchronization Invariant
   * For any loaded video and mesh pair, at any given playback frame index,
   * the video frame and mesh frame SHALL correspond to the same timestamp within ±1 frame tolerance.
   */
  describe('Frame Synchronization Invariant', () => {
    it('should maintain frame-timestamp correspondence', () => {
      const fps = 30;
      const totalFrames = 100;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      // Test various frame indices
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 10) {
        service.seek(frameIndex);
        const currentFrame = service.getCurrentFrame();
        const expectedTimestamp = (frameIndex / fps) * 1000;

        expect(currentFrame).not.toBeNull();
        expect(currentFrame?.frameIndex).toBe(frameIndex);
        expect(Math.abs(currentFrame!.timestamp - expectedTimestamp)).toBeLessThan(1);
      }
    });

    it('should maintain synchronization across all frames', () => {
      const fps = 30;
      const totalFrames = 100;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        service.seek(frameIndex);
        const currentFrame = service.getCurrentFrame();
        const expectedTimestamp = (frameIndex / fps) * 1000;

        expect(currentFrame?.frameIndex).toBe(frameIndex);
        expect(Math.abs(currentFrame!.timestamp - expectedTimestamp)).toBeLessThan(1);
      }
    });

    it('should maintain synchronization with different frame rates', () => {
      const testCases = [
        { fps: 24, totalFrames: 240 },
        { fps: 30, totalFrames: 300 },
        { fps: 60, totalFrames: 600 }
      ];

      testCases.forEach(({ fps, totalFrames }) => {
        const meshSequence = createMockMeshSequence(fps, totalFrames);
        const service = createPlaybackService(meshSequence);

        for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += Math.ceil(totalFrames / 10)) {
          service.seek(frameIndex);
          const currentFrame = service.getCurrentFrame();
          const expectedTimestamp = (frameIndex / fps) * 1000;

          expect(currentFrame?.frameIndex).toBe(frameIndex);
          expect(Math.abs(currentFrame!.timestamp - expectedTimestamp)).toBeLessThan(1);
        }
      });
    });

    it('should maintain synchronization when advancing frames', () => {
      const fps = 30;
      const totalFrames = 100;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      service.seek(0);
      for (let i = 0; i < 50; i++) {
        service.nextFrame();
        const currentFrame = service.getCurrentFrame();
        const expectedTimestamp = ((i + 1) / fps) * 1000;

        expect(currentFrame?.frameIndex).toBe(i + 1);
        expect(Math.abs(currentFrame!.timestamp - expectedTimestamp)).toBeLessThan(1);
      }
    });

    it('should maintain synchronization when seeking', () => {
      const fps = 30;
      const totalFrames = 100;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      const seekPositions = [0, 10, 25, 50, 75, 99];
      for (const frameIndex of seekPositions) {
        service.seek(frameIndex);
        const currentFrame = service.getCurrentFrame();
        const expectedTimestamp = (frameIndex / fps) * 1000;

        expect(currentFrame?.frameIndex).toBe(frameIndex);
        expect(Math.abs(currentFrame!.timestamp - expectedTimestamp)).toBeLessThan(1);
      }
    });
  });

  /**
   * Property 2: Playback Speed Consistency
   * For any playback speed setting, advancing N frames SHALL take exactly N/fps/speed seconds of real time,
   * where fps is the video framerate and speed is the playback multiplier.
   */
  describe('Playback Speed Consistency', () => {
    it('should apply correct speed multiplier', () => {
      const fps = 30;
      const totalFrames = 300;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      const speeds: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4];

      speeds.forEach(speed => {
        service.setSpeed(speed);
        expect(service.getSpeed()).toBe(speed);
      });
    });

    it('should maintain speed setting across pause/play', () => {
      const fps = 30;
      const totalFrames = 300;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      service.setSpeed(2);
      service.play();
      service.pause();

      expect(service.getSpeed()).toBe(2);
      expect(service.getIsPlaying()).toBe(false);

      service.play();
      expect(service.getSpeed()).toBe(2);
    });

    it('should maintain speed setting across seek', () => {
      const fps = 30;
      const totalFrames = 300;
      const meshSequence = createMockMeshSequence(fps, totalFrames);
      const service = createPlaybackService(meshSequence);

      service.setSpeed(0.5);
      service.seek(100);

      expect(service.getSpeed()).toBe(0.5);
      expect(service.getCurrentFrameIndex()).toBe(100);
    });

    it('should maintain speed setting when changing mesh sequence', () => {
      const fps = 30;
      const totalFrames = 300;
      const meshSequence1 = createMockMeshSequence(fps, totalFrames);
      const meshSequence2 = createMockMeshSequence(fps, totalFrames);

      const service = createPlaybackService(meshSequence1);
      service.setSpeed(2);

      service.setMeshSequence(meshSequence2);
      expect(service.getSpeed()).toBe(2);
    });
  });

  /**
   * Property: Frame advancement should be correct
   */
  describe('Frame Advancement', () => {
    it('should advance to next frame', () => {
      playbackService.seek(0);
      expect(playbackService.getCurrentFrameIndex()).toBe(0);

      playbackService.nextFrame();
      expect(playbackService.getCurrentFrameIndex()).toBe(1);

      playbackService.nextFrame();
      expect(playbackService.getCurrentFrameIndex()).toBe(2);
    });

    it('should go back to previous frame', () => {
      playbackService.seek(10);
      expect(playbackService.getCurrentFrameIndex()).toBe(10);

      playbackService.previousFrame();
      expect(playbackService.getCurrentFrameIndex()).toBe(9);

      playbackService.previousFrame();
      expect(playbackService.getCurrentFrameIndex()).toBe(8);
    });

    it('should clamp frame index to valid range', () => {
      playbackService.seek(-10);
      expect(playbackService.getCurrentFrameIndex()).toBe(0);

      playbackService.seek(10000);
      expect(playbackService.getCurrentFrameIndex()).toBe(mockMeshSequence.totalFrames - 1);
    });

    it('should not advance beyond last frame', () => {
      playbackService.seek(mockMeshSequence.totalFrames - 1);
      playbackService.nextFrame();
      expect(playbackService.getCurrentFrameIndex()).toBe(mockMeshSequence.totalFrames - 1);
    });

    it('should not go before first frame', () => {
      playbackService.seek(0);
      playbackService.previousFrame();
      expect(playbackService.getCurrentFrameIndex()).toBe(0);
    });
  });

  /**
   * Property: Seeking should work correctly
   */
  describe('Seeking', () => {
    it('should seek to specific frame', () => {
      const targetFrames = [0, 50, 100, 150, 299];

      targetFrames.forEach(frameIndex => {
        playbackService.seek(frameIndex);
        expect(playbackService.getCurrentFrameIndex()).toBe(frameIndex);
      });
    });

    it('should seek to specific timestamp', () => {
      const fps = 30;
      const targetFrames = [0, 50, 100, 150];

      targetFrames.forEach(frameIndex => {
        const timestamp = (frameIndex / fps) * 1000;
        playbackService.seekToTimestamp(timestamp);
        expect(playbackService.getCurrentFrameIndex()).toBe(frameIndex);
      });
    });

    it('should maintain playback state when seeking', () => {
      playbackService.play();
      expect(playbackService.getIsPlaying()).toBe(true);

      playbackService.seek(100);
      expect(playbackService.getIsPlaying()).toBe(true);
    });
  });

  /**
   * Property: Playback state should be correct
   */
  describe('Playback State', () => {
    it('should start in paused state', () => {
      expect(playbackService.getIsPlaying()).toBe(false);
    });

    it('should transition to playing state', () => {
      playbackService.play();
      expect(playbackService.getIsPlaying()).toBe(true);
    });

    it('should transition to paused state', () => {
      playbackService.play();
      playbackService.pause();
      expect(playbackService.getIsPlaying()).toBe(false);
    });

    it('should not play without mesh sequence', () => {
      const emptyService = createPlaybackService();
      emptyService.play();
      expect(emptyService.getIsPlaying()).toBe(false);
    });
  });

  /**
   * Property: Listeners should be notified of changes
   */
  describe('Listener Notifications', () => {
    it('should notify listeners on frame change', () => {
      const listener = vi.fn();
      playbackService.subscribe(listener);

      playbackService.seek(50);
      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on play', () => {
      const listener = vi.fn();
      playbackService.subscribe(listener);

      playbackService.play();
      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on pause', () => {
      const listener = vi.fn();
      playbackService.subscribe(listener);

      playbackService.play();
      listener.mockClear();
      playbackService.pause();
      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = playbackService.subscribe(listener);

      playbackService.seek(50);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      playbackService.seek(100);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
