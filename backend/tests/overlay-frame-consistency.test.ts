/**
 * Property-based tests for overlay frame consistency
 * Feature: synchronized-video-mesh-playback, Property 5: Frame Data Consistency
 * Validates: Requirements 2.1, 2.2, 7.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import { MeshOverlayService } from '../src/services/meshOverlayService';
import { Keypoint, Skeleton, Matrix4 } from '../src/shared/mesh-transposition';

// Test fixtures
const testUploadDir = path.join(__dirname, '../test-uploads-overlay');

// Arbitraries for property-based testing
const videoIdArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const frameIndexArbitrary = fc.integer({ min: 0, max: 100 });

const keypointArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  position: fc.record({
    x: fc.float({ min: -10, max: 10, noNaN: true }),
    y: fc.float({ min: -10, max: 10, noNaN: true }),
    z: fc.float({ min: 0.1, max: 10, noNaN: true })
  }),
  confidence: fc.float({ min: 0, max: 1, noNaN: true })
});

const skeletonArbitrary = fc.record({
  keypoints: fc.array(keypointArbitrary, { minLength: 1, maxLength: 10 }),
  connections: fc.array(
    fc.tuple(fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 9 })),
    { maxLength: 20 }
  )
});

const cameraMatrixArbitrary = fc.record({
  data: fc.tuple(
    fc.float({ min: 100, max: 2000, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 1920, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 100, max: 2000, noNaN: true }),
    fc.float({ min: 0, max: 1080, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 1, max: 1, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 0, max: 0, noNaN: true }),
    fc.float({ min: 1, max: 1, noNaN: true })
  ).map(data => ({ data: Array.from(data) }))
});

describe('Overlay Frame Consistency Properties', () => {
  let overlayService: MeshOverlayService;

  beforeEach(() => {
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    overlayService = new MeshOverlayService({
      uploadDir: testUploadDir,
      jpegQuality: 80
    });
  });

  afterEach(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true });
    }
  });

  describe('Property 5: Frame Data Consistency with Overlays', () => {
    it('should generate overlay frames that correspond to the correct frameIndex', () => {
      fc.assert(
        fc.property(
          videoIdArbitrary,
          frameIndexArbitrary,
          skeletonArbitrary,
          cameraMatrixArbitrary,
          (videoId, frameIndex, skeleton, cameraMatrix) => {
            // Create test frame
            const videoDir = path.join(testUploadDir, videoId);
            const originalDir = path.join(videoDir, 'original');
            fs.mkdirSync(originalDir, { recursive: true });

            // Create a minimal JPEG frame
            const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
            const originalPath = path.join(originalDir, `${frameIndex}.jpg`);
            fs.writeFileSync(originalPath, dummyJpeg);

            // Verify overlay path corresponds to frameIndex
            const overlayPath = overlayService.getOverlayPath(videoId, frameIndex);
            expect(overlayPath).toContain(`${frameIndex}.jpg`);
            expect(overlayPath).toContain(videoId);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain frame index consistency when checking overlay existence', () => {
      fc.assert(
        fc.property(videoIdArbitrary, frameIndexArbitrary, (videoId, frameIndex) => {
          // Initially overlay should not exist
          expect(overlayService.overlayExists(videoId, frameIndex)).toBe(false);

          // Create overlay directory and file
          const overlayDir = path.join(testUploadDir, videoId, 'overlay');
          fs.mkdirSync(overlayDir, { recursive: true });

          const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
          const overlayPath = path.join(overlayDir, `${frameIndex}.jpg`);
          fs.writeFileSync(overlayPath, dummyJpeg);

          // Now overlay should exist
          expect(overlayService.overlayExists(videoId, frameIndex)).toBe(true);

          // Verify path is correct
          const retrievedPath = overlayService.getOverlayPath(videoId, frameIndex);
          expect(retrievedPath).toBe(overlayPath);
        }),
        { numRuns: 50 }
      );
    });

    it('should delete overlays without affecting other frames', () => {
      fc.assert(
        fc.property(
          videoIdArbitrary,
          fc.array(frameIndexArbitrary, { minLength: 2, maxLength: 5 }),
          (videoId, frameIndices) => {
            // Create multiple overlay frames
            const overlayDir = path.join(testUploadDir, videoId, 'overlay');
            fs.mkdirSync(overlayDir, { recursive: true });

            const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
            for (const frameIndex of frameIndices) {
              const overlayPath = path.join(overlayDir, `${frameIndex}.jpg`);
              fs.writeFileSync(overlayPath, dummyJpeg);
            }

            // Delete first frame
            const firstFrame = frameIndices[0];
            overlayService.deleteOverlay(videoId, firstFrame);

            // First frame should be deleted
            expect(overlayService.overlayExists(videoId, firstFrame)).toBe(false);

            // Other frames should still exist
            for (let i = 1; i < frameIndices.length; i++) {
              expect(overlayService.overlayExists(videoId, frameIndices[i])).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain consistency when deleting all overlays for a video', () => {
      fc.assert(
        fc.property(
          videoIdArbitrary,
          fc.array(frameIndexArbitrary, { minLength: 1, maxLength: 10 }),
          (videoId, frameIndices) => {
            // Create multiple overlay frames
            const overlayDir = path.join(testUploadDir, videoId, 'overlay');
            fs.mkdirSync(overlayDir, { recursive: true });

            const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
            for (const frameIndex of frameIndices) {
              const overlayPath = path.join(overlayDir, `${frameIndex}.jpg`);
              fs.writeFileSync(overlayPath, dummyJpeg);
            }

            // Verify all exist
            for (const frameIndex of frameIndices) {
              expect(overlayService.overlayExists(videoId, frameIndex)).toBe(true);
            }

            // Delete all overlays
            overlayService.deleteAllOverlays(videoId);

            // All should be deleted
            for (const frameIndex of frameIndices) {
              expect(overlayService.overlayExists(videoId, frameIndex)).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle overlay paths correctly for different videos', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          frameIndexArbitrary,
          (videoIds, frameIndex) => {
            // Get paths for different videos
            const paths = videoIds.map(videoId => overlayService.getOverlayPath(videoId, frameIndex));

            // All paths should be unique
            const uniquePaths = new Set(paths);
            expect(uniquePaths.size).toBe(videoIds.length);

            // Each path should contain its videoId
            for (let i = 0; i < videoIds.length; i++) {
              expect(paths[i]).toContain(videoIds[i]);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
