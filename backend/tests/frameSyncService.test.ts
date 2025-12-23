import { FrameSyncService } from '../src/services/frameSyncService';
import { SyncedFrame, Keypoint } from '../src/types';

/**
 * Property-Based Tests for Frame Synchronization Service
 * Feature: mesh-viewer-mvp, Property 12: Unified Data Structure Synchronization
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5
 */

describe('FrameSyncService - Property 12: Unified Data Structure Synchronization', () => {
  /**
   * Property: For any SyncedFrame in the MeshSequence, the frame's timestamp SHALL match
   * the video frame timestamp at that index, and mesh keypoints SHALL correspond to that
   * exact video frame.
   */
  describe('Frame Timestamp Synchronization', () => {
    it('should calculate correct timestamps for all frames', () => {
      const videoFps = 30;
      const videoDuration = 10;
      const totalFrames = videoFps * videoDuration;

      const frameTiming = FrameSyncService.calculateFrameTiming(
        videoFps,
        videoDuration,
        totalFrames
      );

      // Verify frame count
      expect(frameTiming.length).toBe(totalFrames);

      // Verify first frame timestamp is 0
      expect(frameTiming[0].timestamp).toBe(0);

      // Verify timestamps are sequential with correct delta
      const expectedDelta = 1000 / videoFps; // milliseconds
      for (let i = 1; i < frameTiming.length; i++) {
        const delta = frameTiming[i].timestamp - frameTiming[i - 1].timestamp;
        expect(Math.abs(delta - expectedDelta)).toBeLessThan(0.1);
      }

      // Verify last frame timestamp matches video duration
      const lastTimestamp = frameTiming[totalFrames - 1].timestamp;
      const expectedLastTimestamp = ((totalFrames - 1) / videoFps) * 1000;
      expect(Math.abs(lastTimestamp - expectedLastTimestamp)).toBeLessThan(1);
    });

    it('should handle various frame rates correctly', () => {
      const testCases = [
        { fps: 24, duration: 5 },
        { fps: 30, duration: 10 },
        { fps: 60, duration: 3 },
        { fps: 4, duration: 60 } // Low FPS for long duration
      ];

      testCases.forEach(({ fps, duration }) => {
        const totalFrames = Math.ceil(fps * duration);
        const frameTiming = FrameSyncService.calculateFrameTiming(fps, duration, totalFrames);

        // Verify frame count is correct
        expect(frameTiming.length).toBe(totalFrames);

        // Verify timestamps are within expected range
        const lastTimestamp = frameTiming[totalFrames - 1].timestamp;
        const expectedLastTimestamp = ((totalFrames - 1) / fps) * 1000;
        expect(lastTimestamp).toBeLessThanOrEqual(expectedLastTimestamp + 100);
      });
    });
  });

  /**
   * Property: Mesh keypoints SHALL correspond to the exact video frame
   */
  describe('Mesh Frame Alignment', () => {
    it('should align mesh frames to video frames correctly', () => {
      const videoFps = 30;
      const videoDuration = 5;
      const totalFrames = videoFps * videoDuration;

      // Create mock mesh frames
      const mockMeshFrames = Array.from({ length: totalFrames }, (_, i) => ({
        frameNumber: i,
        timestamp: (i / videoFps) * 1000,
        keypoints: Array.from({ length: 33 }, (_, kpIndex) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() * 100,
          confidence: Math.random(),
          name: `keypoint_${kpIndex}`
        })),
        vertices: [],
        faces: []
      }));

      const syncedFrames = FrameSyncService.alignMeshToVideoFrames(
        mockMeshFrames,
        videoFps,
        videoDuration
      );

      // Verify all frames are synced
      expect(syncedFrames.length).toBe(totalFrames);

      // Verify each frame has correct timestamp
      for (let i = 0; i < syncedFrames.length; i++) {
        const expectedTimestamp = (i / videoFps) * 1000;
        expect(syncedFrames[i].timestamp).toBe(expectedTimestamp);
        expect(syncedFrames[i].frameIndex).toBe(i);
      }

      // Verify mesh data is present
      for (const frame of syncedFrames) {
        expect(frame.meshData).toBeDefined();
        expect(frame.meshData.keypoints).toBeDefined();
        expect(frame.meshData.keypoints.length).toBe(33);
        expect(frame.meshData.skeleton).toBeDefined();
      }
    });

    it('should preserve keypoint data during alignment', () => {
      const videoFps = 24;
      const videoDuration = 2;
      const totalFrames = videoFps * videoDuration;

      // Create mock mesh frames with specific keypoint values
      const mockMeshFrames = Array.from({ length: totalFrames }, (_, frameIdx) => ({
        frameNumber: frameIdx,
        timestamp: (frameIdx / videoFps) * 1000,
        keypoints: Array.from({ length: 33 }, (_, kpIdx) => ({
          x: frameIdx * 10 + kpIdx,
          y: frameIdx * 20 + kpIdx,
          z: frameIdx * 30 + kpIdx,
          confidence: 0.95,
          name: `keypoint_${kpIdx}`
        })),
        vertices: [],
        faces: []
      }));

      const syncedFrames = FrameSyncService.alignMeshToVideoFrames(
        mockMeshFrames,
        videoFps,
        videoDuration
      );

      // Verify keypoint data is preserved
      for (let i = 0; i < syncedFrames.length; i++) {
        const frame = syncedFrames[i];
        for (let kpIdx = 0; kpIdx < 33; kpIdx++) {
          const kp = frame.meshData.keypoints[kpIdx];
          expect(kp.position[0]).toBe(i * 10 + kpIdx);
          expect(kp.position[1]).toBe(i * 20 + kpIdx);
          expect(kp.position[2]).toBe(i * 30 + kpIdx);
          expect(kp.confidence).toBe(0.95);
        }
      }
    });
  });

  /**
   * Property: Synchronization validation should detect misalignments
   */
  describe('Synchronization Validation', () => {
    it('should validate correct synchronization', () => {
      const videoFps = 30;
      const videoDuration = 5;
      const totalFrames = videoFps * videoDuration;

      // Create properly synced frames
      const syncedFrames: SyncedFrame[] = Array.from({ length: totalFrames }, (_, i) => ({
        frameIndex: i,
        timestamp: (i / videoFps) * 1000,
        videoFrameData: { offset: i },
        meshData: {
          keypoints: Array.from({ length: 33 }, (_, kpIdx) => ({
            index: kpIdx,
            name: `keypoint_${kpIdx}`,
            position: [0, 0, 0],
            confidence: 0.95
          })),
          skeleton: FrameSyncService.getMediaPipeSkeleton(),
          vertices: [],
          faces: []
        }
      }));

      const result = FrameSyncService.validateSynchronization(
        syncedFrames,
        videoFps,
        videoDuration
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect frame count mismatches', () => {
      const videoFps = 30;
      const videoDuration = 5;
      const expectedFrames = videoFps * videoDuration;

      // Create frames with wrong count
      const syncedFrames: SyncedFrame[] = Array.from({ length: expectedFrames - 10 }, (_, i) => ({
        frameIndex: i,
        timestamp: (i / videoFps) * 1000,
        videoFrameData: { offset: i },
        meshData: {
          keypoints: Array.from({ length: 33 }, (_, kpIdx) => ({
            index: kpIdx,
            name: `keypoint_${kpIdx}`,
            position: [0, 0, 0],
            confidence: 0.95
          })),
          skeleton: FrameSyncService.getMediaPipeSkeleton(),
          vertices: [],
          faces: []
        }
      }));

      const result = FrameSyncService.validateSynchronization(
        syncedFrames,
        videoFps,
        videoDuration
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect timestamp gaps', () => {
      const videoFps = 30;
      const videoDuration = 2;
      const totalFrames = videoFps * videoDuration;

      // Create frames with timestamp gaps
      const syncedFrames: SyncedFrame[] = Array.from({ length: totalFrames }, (_, i) => ({
        frameIndex: i,
        timestamp: i % 10 === 0 ? (i / videoFps) * 1000 + 100 : (i / videoFps) * 1000, // Add gap every 10 frames
        videoFrameData: { offset: i },
        meshData: {
          keypoints: Array.from({ length: 33 }, (_, kpIdx) => ({
            index: kpIdx,
            name: `keypoint_${kpIdx}`,
            position: [0, 0, 0],
            confidence: 0.95
          })),
          skeleton: FrameSyncService.getMediaPipeSkeleton(),
          vertices: [],
          faces: []
        }
      }));

      const result = FrameSyncService.validateSynchronization(
        syncedFrames,
        videoFps,
        videoDuration
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Timestamp gap'))).toBe(true);
    });
  });

  /**
   * Property: Frame index to timestamp conversion should be reversible
   */
  describe('Frame Index and Timestamp Conversion', () => {
    it('should convert frame index to timestamp correctly', () => {
      const videoFps = 30;

      for (let frameIndex = 0; frameIndex < 100; frameIndex++) {
        const timestamp = FrameSyncService.getTimestampFromFrameIndex(frameIndex, videoFps);
        const expectedTimestamp = (frameIndex / videoFps) * 1000;
        expect(timestamp).toBe(expectedTimestamp);
      }
    });

    it('should convert timestamp to frame index correctly', () => {
      const videoFps = 30;

      for (let frameIndex = 0; frameIndex < 100; frameIndex++) {
        const timestamp = (frameIndex / videoFps) * 1000;
        const convertedFrameIndex = FrameSyncService.getFrameIndexFromTimestamp(
          timestamp,
          videoFps
        );
        expect(convertedFrameIndex).toBe(frameIndex);
      }
    });

    it('should handle round-trip conversion correctly', () => {
      const videoFps = 24;

      for (let originalFrameIndex = 0; originalFrameIndex < 50; originalFrameIndex++) {
        const timestamp = FrameSyncService.getTimestampFromFrameIndex(
          originalFrameIndex,
          videoFps
        );
        const convertedFrameIndex = FrameSyncService.getFrameIndexFromTimestamp(
          timestamp,
          videoFps
        );
        expect(convertedFrameIndex).toBe(originalFrameIndex);
      }
    });
  });

  /**
   * Property: MediaPipe skeleton should have correct structure
   */
  describe('MediaPipe Skeleton Structure', () => {
    it('should return valid skeleton connections', () => {
      const skeleton = FrameSyncService.getMediaPipeSkeleton();

      // Verify skeleton is not empty
      expect(skeleton.length).toBeGreaterThan(0);

      // Verify all connections reference valid keypoint indices (0-32)
      for (const connection of skeleton) {
        expect(connection.from).toBeGreaterThanOrEqual(0);
        expect(connection.from).toBeLessThan(33);
        expect(connection.to).toBeGreaterThanOrEqual(0);
        expect(connection.to).toBeLessThan(33);
      }

      // Verify no self-connections
      for (const connection of skeleton) {
        expect(connection.from).not.toBe(connection.to);
      }
    });
  });
});
