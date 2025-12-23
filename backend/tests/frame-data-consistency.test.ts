/**
 * Property-based tests for frame data consistency
 * Feature: synchronized-video-mesh-playback, Property 5: Frame Data Consistency
 * Validates: Requirements 2.1, 2.2, 7.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import { FrameDataServiceImpl } from '../src/services/frameDataService';

// Test fixtures
const testUploadDir = path.join(__dirname, '../test-uploads');

// Arbitraries for property-based testing
const videoIdArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const frameIndexArbitrary = fc.integer({ min: 0, max: 1000 });

describe('Frame Data Consistency Properties', () => {
  let frameDataService: FrameDataServiceImpl;

  beforeEach(() => {
    // Create test upload directory
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    frameDataService = new FrameDataServiceImpl({
      uploadDir: testUploadDir,
      redisClient: null // No Redis for unit tests
    });
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true });
    }
  });

  describe('Property 5: Frame Data Consistency', () => {
    it('should return frame data where all fields correspond to the same frameIndex', () => {
      fc.assert(
        fc.property(videoIdArbitrary, frameIndexArbitrary, (videoId, frameIndex) => {
          // Create test frame data
          const videoDir = path.join(testUploadDir, videoId);
          const originalDir = path.join(videoDir, 'original');
          const overlayDir = path.join(videoDir, 'overlay');
          const meshDir = path.join(videoDir, 'mesh');

          fs.mkdirSync(originalDir, { recursive: true });
          fs.mkdirSync(overlayDir, { recursive: true });
          fs.mkdirSync(meshDir, { recursive: true });

          // Create dummy frame files
          const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
          fs.writeFileSync(path.join(originalDir, `${frameIndex}.jpg`), dummyJpeg);
          fs.writeFileSync(path.join(overlayDir, `${frameIndex}.jpg`), dummyJpeg);

          const meshData = {
            keypoints: [
              { name: 'nose', position: { x: 0, y: 0, z: 1 }, confidence: 0.9 }
            ],
            skeleton: { connections: [] }
          };
          fs.writeFileSync(path.join(meshDir, `${frameIndex}.json`), JSON.stringify(meshData));

          // Retrieve frame data
          const frameData = frameDataService.getFrame(videoId, frameIndex, {
            includeOriginal: true,
            includeOverlay: true,
            includeMesh: true
          });

          // All returned data should correspond to the same frameIndex
          expect(frameData).toBeDefined();
          expect(frameData.frameIndex).toBe(frameIndex);
          expect(frameData.videoId).toBe(videoId);

          // If original frame is present, it should be for this frameIndex
          if (frameData.originalFrame) {
            expect(frameData.frameIndex).toBe(frameIndex);
          }

          // If overlay frame is present, it should be for this frameIndex
          if (frameData.overlayFrame) {
            expect(frameData.frameIndex).toBe(frameIndex);
          }

          // If mesh data is present, it should be for this frameIndex
          if (frameData.meshData) {
            expect(frameData.frameIndex).toBe(frameIndex);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain timestamp consistency across frame data', () => {
      fc.assert(
        fc.property(videoIdArbitrary, frameIndexArbitrary, (videoId, frameIndex) => {
          const videoDir = path.join(testUploadDir, videoId);
          const originalDir = path.join(videoDir, 'original');
          const meshDir = path.join(videoDir, 'mesh');

          fs.mkdirSync(originalDir, { recursive: true });
          fs.mkdirSync(meshDir, { recursive: true });

          // Create dummy frame files
          const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
          fs.writeFileSync(path.join(originalDir, `${frameIndex}.jpg`), dummyJpeg);

          const meshData = { keypoints: [], skeleton: { connections: [] } };
          fs.writeFileSync(path.join(meshDir, `${frameIndex}.json`), JSON.stringify(meshData));

          // Retrieve frame data
          const frameData = frameDataService.getFrame(videoId, frameIndex, {
            includeOriginal: true,
            includeMesh: true
          });

          // Timestamp should be consistent with frameIndex
          const expectedTimestamp = frameIndex * (1000 / 30); // 30 FPS
          expect(frameData.timestamp).toBe(expectedTimestamp);
        }),
        { numRuns: 50 }
      );
    });

    it('should filter frame data correctly based on options', () => {
      fc.assert(
        fc.property(videoIdArbitrary, frameIndexArbitrary, (videoId, frameIndex) => {
          const videoDir = path.join(testUploadDir, videoId);
          const originalDir = path.join(videoDir, 'original');
          const overlayDir = path.join(videoDir, 'overlay');
          const meshDir = path.join(videoDir, 'mesh');

          fs.mkdirSync(originalDir, { recursive: true });
          fs.mkdirSync(overlayDir, { recursive: true });
          fs.mkdirSync(meshDir, { recursive: true });

          // Create dummy frame files
          const dummyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
          fs.writeFileSync(path.join(originalDir, `${frameIndex}.jpg`), dummyJpeg);
          fs.writeFileSync(path.join(overlayDir, `${frameIndex}.jpg`), dummyJpeg);

          const meshData = { keypoints: [], skeleton: { connections: [] } };
          fs.writeFileSync(path.join(meshDir, `${frameIndex}.json`), JSON.stringify(meshData));

          // Test with only original
          const onlyOriginal = frameDataService.getFrame(videoId, frameIndex, {
            includeOriginal: true,
            includeOverlay: false,
            includeMesh: false
          });
          expect(onlyOriginal.originalFrame).toBeDefined();
          expect(onlyOriginal.overlayFrame).toBeUndefined();
          expect(onlyOriginal.meshData).toBeUndefined();

          // Test with only overlay
          const onlyOverlay = frameDataService.getFrame(videoId, frameIndex, {
            includeOriginal: false,
            includeOverlay: true,
            includeMesh: false
          });
          expect(onlyOverlay.originalFrame).toBeUndefined();
          expect(onlyOverlay.overlayFrame).toBeDefined();
          expect(onlyOverlay.meshData).toBeUndefined();

          // Test with only mesh
          const onlyMesh = frameDataService.getFrame(videoId, frameIndex, {
            includeOriginal: false,
            includeOverlay: false,
            includeMesh: true
          });
          expect(onlyMesh.originalFrame).toBeUndefined();
          expect(onlyMesh.overlayFrame).toBeUndefined();
          expect(onlyMesh.meshData).toBeDefined();
        }),
        { numRuns: 50 }
      );
    });

    it('should handle missing frame data gracefully', () => {
      fc.assert(
        fc.property(videoIdArbitrary, frameIndexArbitrary, (videoId, frameIndex) => {
          const videoDir = path.join(testUploadDir, videoId);
          fs.mkdirSync(videoDir, { recursive: true });

          // Try to get frame that doesn't exist
          expect(() => {
            frameDataService.getFrame(videoId, frameIndex, {
              includeOriginal: true,
              includeOverlay: true,
              includeMesh: true
            });
          }).toThrow();
        }),
        { numRuns: 20 }
      );
    });
  });
});
