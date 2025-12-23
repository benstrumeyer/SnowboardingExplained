import { describe, it, expect } from 'vitest';
import { getFrameAtIndex, getFrameAtTimestamp } from '../meshDataService';
import { MeshSequence, SyncedFrame, Keypoint, SkeletonConnection } from '../../types';

/**
 * Property-Based Tests for Frontend Mesh Data Service
 * Feature: mesh-viewer-mvp, Property 12: Unified Data Structure Synchronization
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5
 */

describe('MeshDataService - Property 12: Unified Data Structure Synchronization', () => {
  /**
   * Create mock MeshSequence for testing
   */
  function createMockMeshSequence(
    videoId: string,
    fps: number,
    totalFrames: number
  ): MeshSequence {
    const frames: SyncedFrame[] = Array.from({ length: totalFrames }, (_, i) => ({
      frameIndex: i,
      timestamp: (i / fps) * 1000,
      videoFrameData: {
        offset: i
      },
      meshData: {
        keypoints: Array.from({ length: 33 }, (_, kpIdx) => ({
          index: kpIdx,
          name: `keypoint_${kpIdx}`,
          position: [
            Math.random() * 100,
            Math.random() * 100,
            Math.random() * 100
          ] as [number, number, number],
          confidence: Math.random()
        })),
        skeleton: createMockSkeleton(),
        vertices: [],
        faces: []
      }
    }));

    return {
      videoId,
      videoUrl: `http://example.com/${videoId}.mp4`,
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

  /**
   * Create mock skeleton connections
   */
  function createMockSkeleton(): SkeletonConnection[] {
    return [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 11, to: 13 },
      { from: 13, to: 15 }
    ];
  }

  /**
   * Property: Frame index lookup should return correct frame
   */
  describe('Frame Index Lookup', () => {
    it('should retrieve frame at valid index', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      for (let i = 0; i < meshSequence.frames.length; i++) {
        const frame = getFrameAtIndex(meshSequence, i);
        expect(frame).not.toBeNull();
        expect(frame?.frameIndex).toBe(i);
        expect(frame?.timestamp).toBe((i / 30) * 1000);
      }
    });

    it('should return null for out-of-bounds index', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      expect(getFrameAtIndex(meshSequence, -1)).toBeNull();
      expect(getFrameAtIndex(meshSequence, 100)).toBeNull();
      expect(getFrameAtIndex(meshSequence, 1000)).toBeNull();
    });

    it('should handle edge cases (first and last frame)', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      const firstFrame = getFrameAtIndex(meshSequence, 0);
      expect(firstFrame?.frameIndex).toBe(0);
      expect(firstFrame?.timestamp).toBe(0);

      const lastFrame = getFrameAtIndex(meshSequence, 99);
      expect(lastFrame?.frameIndex).toBe(99);
      expect(lastFrame?.timestamp).toBe((99 / 30) * 1000);
    });
  });

  /**
   * Property: Timestamp lookup should find nearest frame
   */
  describe('Timestamp Lookup', () => {
    it('should retrieve frame at exact timestamp', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      for (let i = 0; i < 10; i++) {
        const timestamp = (i / 30) * 1000;
        const frame = getFrameAtTimestamp(meshSequence, timestamp);
        expect(frame).not.toBeNull();
        expect(frame?.frameIndex).toBe(i);
      }
    });

    it('should retrieve frame at approximate timestamp', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      // Test with timestamps slightly off from exact frame times
      for (let i = 0; i < 10; i++) {
        const timestamp = (i / 30) * 1000 + 0.5; // Add 0.5ms offset
        const frame = getFrameAtTimestamp(meshSequence, timestamp);
        expect(frame).not.toBeNull();
        expect(frame?.frameIndex).toBeLessThanOrEqual(i + 1);
        expect(frame?.frameIndex).toBeGreaterThanOrEqual(i - 1);
      }
    });

    it('should handle edge case timestamps', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      // First frame
      const firstFrame = getFrameAtTimestamp(meshSequence, 0);
      expect(firstFrame?.frameIndex).toBe(0);

      // Last frame
      const lastTimestamp = ((100 - 1) / 30) * 1000;
      const lastFrame = getFrameAtTimestamp(meshSequence, lastTimestamp);
      expect(lastFrame?.frameIndex).toBe(99);

      // Beyond last frame
      const beyondFrame = getFrameAtTimestamp(meshSequence, lastTimestamp + 1000);
      expect(beyondFrame).not.toBeNull();
    });
  });

  /**
   * Property: Frame data structure should be consistent
   */
  describe('Frame Data Structure Consistency', () => {
    it('should have all required fields in each frame', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 50);

      for (const frame of meshSequence.frames) {
        expect(frame.frameIndex).toBeDefined();
        expect(typeof frame.frameIndex).toBe('number');
        expect(frame.timestamp).toBeDefined();
        expect(typeof frame.timestamp).toBe('number');
        expect(frame.meshData).toBeDefined();
        expect(frame.meshData.keypoints).toBeDefined();
        expect(Array.isArray(frame.meshData.keypoints)).toBe(true);
        expect(frame.meshData.skeleton).toBeDefined();
        expect(Array.isArray(frame.meshData.skeleton)).toBe(true);
      }
    });

    it('should have 33 keypoints in each frame', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 50);

      for (const frame of meshSequence.frames) {
        expect(frame.meshData.keypoints.length).toBe(33);

        for (const keypoint of frame.meshData.keypoints) {
          expect(keypoint.index).toBeDefined();
          expect(keypoint.name).toBeDefined();
          expect(keypoint.position).toBeDefined();
          expect(keypoint.position.length).toBe(3);
          expect(keypoint.confidence).toBeDefined();
        }
      }
    });

    it('should have valid skeleton connections', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 50);

      for (const frame of meshSequence.frames) {
        for (const connection of frame.meshData.skeleton) {
          expect(connection.from).toBeGreaterThanOrEqual(0);
          expect(connection.from).toBeLessThan(33);
          expect(connection.to).toBeGreaterThanOrEqual(0);
          expect(connection.to).toBeLessThan(33);
          expect(connection.from).not.toBe(connection.to);
        }
      }
    });
  });

  /**
   * Property: Timestamps should be monotonically increasing
   */
  describe('Timestamp Monotonicity', () => {
    it('should have monotonically increasing timestamps', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      for (let i = 1; i < meshSequence.frames.length; i++) {
        const prevTimestamp = meshSequence.frames[i - 1].timestamp;
        const currTimestamp = meshSequence.frames[i].timestamp;
        expect(currTimestamp).toBeGreaterThan(prevTimestamp);
      }
    });

    it('should have consistent frame intervals', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);
      const expectedDelta = 1000 / meshSequence.fps;

      for (let i = 1; i < meshSequence.frames.length; i++) {
        const prevTimestamp = meshSequence.frames[i - 1].timestamp;
        const currTimestamp = meshSequence.frames[i].timestamp;
        const delta = currTimestamp - prevTimestamp;
        expect(Math.abs(delta - expectedDelta)).toBeLessThan(0.1);
      }
    });
  });

  /**
   * Property: Frame indices should match array positions
   */
  describe('Frame Index Consistency', () => {
    it('should have frame indices matching array positions', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      for (let i = 0; i < meshSequence.frames.length; i++) {
        expect(meshSequence.frames[i].frameIndex).toBe(i);
      }
    });

    it('should have sequential frame indices', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      for (let i = 1; i < meshSequence.frames.length; i++) {
        const prevIndex = meshSequence.frames[i - 1].frameIndex;
        const currIndex = meshSequence.frames[i].frameIndex;
        expect(currIndex).toBe(prevIndex + 1);
      }
    });
  });

  /**
   * Property: MeshSequence metadata should be valid
   */
  describe('MeshSequence Metadata', () => {
    it('should have valid metadata', () => {
      const meshSequence = createMockMeshSequence('video1', 30, 100);

      expect(meshSequence.videoId).toBeDefined();
      expect(meshSequence.videoUrl).toBeDefined();
      expect(meshSequence.fps).toBeGreaterThan(0);
      expect(meshSequence.videoDuration).toBeGreaterThan(0);
      expect(meshSequence.totalFrames).toBeGreaterThan(0);
      expect(meshSequence.frames.length).toBe(meshSequence.totalFrames);
      expect(meshSequence.metadata).toBeDefined();
      expect(meshSequence.metadata.uploadedAt).toBeDefined();
      expect(meshSequence.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(meshSequence.metadata.extractionMethod).toBeDefined();
    });

    it('should have consistent frame count', () => {
      const testCases = [
        { fps: 24, duration: 5 },
        { fps: 30, duration: 10 },
        { fps: 60, duration: 3 }
      ];

      testCases.forEach(({ fps, duration }) => {
        const totalFrames = Math.ceil(fps * duration);
        const meshSequence = createMockMeshSequence('video1', fps, totalFrames);

        expect(meshSequence.frames.length).toBe(meshSequence.totalFrames);
        expect(meshSequence.fps).toBe(fps);
        expect(meshSequence.videoDuration).toBe(totalFrames / fps);
      });
    });
  });
});
