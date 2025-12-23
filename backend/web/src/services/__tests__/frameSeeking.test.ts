/**
 * Property-based tests for frame seek functionality
 * Feature: synchronized-video-mesh-playback, Property 3: Frame Seek Offset Consistency
 * Validates: Requirements 6.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PlaybackSyncService } from '../playbackSyncService';

// Arbitraries for property-based testing
const videoIdArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const frameIndexArbitrary = fc.integer({ min: 0, max: 1000 });
const seekOffsetArbitrary = fc.integer({ min: -500, max: 500 });

describe('Frame Seek Functionality', () => {
  let service: PlaybackSyncService;

  beforeEach(() => {
    service = new PlaybackSyncService({ fps: 30 });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Property 3: Frame Seek Offset Consistency', () => {
    it('should advance all scenes by same offset while maintaining independent positions', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          frameIndexArbitrary,
          seekOffsetArbitrary,
          async (videoIds, initialFrame, seekOffset) => {
            await service.initializePlayback(videoIds, 30);

            // Set different initial positions for each scene
            const initialPositions = new Map<string, number>();
            for (let i = 0; i < videoIds.length; i++) {
              const position = initialFrame + i * 10;
              initialPositions.set(videoIds[i], position);
              service.setSceneFrameIndex(videoIds[i], position);
            }

            // Perform seek
            await service.seekByOffset(seekOffset);

            // Verify all scenes advanced by same offset
            for (const videoId of videoIds) {
              const currentFrame = service.getSceneFrameIndex(videoId);
              const initialPos = initialPositions.get(videoId)!;
              const expectedFrame = Math.max(0, initialPos + seekOffset);
              expect(currentFrame).toBe(expectedFrame);
            }

            // Verify relative positions are maintained
            const positions = Array.from(videoIds).map(id => service.getSceneFrameIndex(id));
            const differences = [];
            for (let i = 1; i < positions.length; i++) {
              differences.push(positions[i] - positions[0]);
            }

            // Differences should match initial differences (unless clamped to zero)
            for (let i = 1; i < videoIds.length; i++) {
              const initialDiff = (initialFrame + i * 10) - initialFrame;
              const currentDiff = positions[i] - positions[0];
              // If not clamped, differences should be maintained
              if (initialFrame + seekOffset >= 0 && initialFrame + i * 10 + seekOffset >= 0) {
                expect(currentDiff).toBe(initialDiff);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle forward seeks correctly', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: 1, max: 200 }),
          async (videoIds, initialFrame, seekOffset) => {
            await service.initializePlayback(videoIds, 30);

            // Set initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], initialFrame + i);
            }

            // Seek forward
            await service.seekByOffset(seekOffset);

            // Verify all scenes moved forward by same amount
            for (let i = 0; i < videoIds.length; i++) {
              const currentFrame = service.getSceneFrameIndex(videoIds[i]);
              const expectedFrame = initialFrame + i + seekOffset;
              expect(currentFrame).toBe(expectedFrame);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle backward seeks correctly', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 100, max: 500 }),
          fc.integer({ min: 1, max: 100 }),
          async (videoIds, initialFrame, seekOffset) => {
            await service.initializePlayback(videoIds, 30);

            // Set initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], initialFrame + i);
            }

            // Seek backward
            await service.seekByOffset(-seekOffset);

            // Verify all scenes moved backward by same amount
            for (let i = 0; i < videoIds.length; i++) {
              const currentFrame = service.getSceneFrameIndex(videoIds[i]);
              const expectedFrame = Math.max(0, initialFrame + i - seekOffset);
              expect(currentFrame).toBe(expectedFrame);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clamp negative frame indices to zero', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (videoIds) => {
            await service.initializePlayback(videoIds, 30);

            // Set initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], i + 5);
            }

            // Seek backward beyond zero
            await service.seekByOffset(-1000);

            // Verify all frames are clamped to zero
            for (const videoId of videoIds) {
              const currentFrame = service.getSceneFrameIndex(videoId);
              expect(currentFrame).toBe(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain atomic frame updates across all scenes', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          frameIndexArbitrary,
          seekOffsetArbitrary,
          async (videoIds, initialFrame, seekOffset) => {
            await service.initializePlayback(videoIds, 30);

            // Set initial positions
            for (let i = 0; i < videoIds.length; i++) {
              service.setSceneFrameIndex(videoIds[i], initialFrame + i);
            }

            // Perform seek
            await service.seekByOffset(seekOffset);

            // Verify all scenes have consistent state
            const states = service.getAllSceneStates();
            expect(states.length).toBe(videoIds.length);

            // All scenes should have been updated
            for (const state of states) {
              expect(state.frameIndex).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple consecutive seeks correctly', () => {
      fc.assert(
        fc.property(
          fc.array(videoIdArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(seekOffsetArbitrary, { minLength: 1, maxLength: 5 }),
          async (videoIds, seekOffsets) => {
            await service.initializePlayback(videoIds, 30);

            // Set initial positions
            const initialPositions = new Map<string, number>();
            for (let i = 0; i < videoIds.length; i++) {
              const position = 100 + i * 10;
              initialPositions.set(videoIds[i], position);
              service.setSceneFrameIndex(videoIds[i], position);
            }

            // Perform multiple seeks
            let totalOffset = 0;
            for (const offset of seekOffsets) {
              await service.seekByOffset(offset);
              totalOffset += offset;
            }

            // Verify final positions
            for (const videoId of videoIds) {
              const currentFrame = service.getSceneFrameIndex(videoId);
              const initialPos = initialPositions.get(videoId)!;
              const expectedFrame = Math.max(0, initialPos + totalOffset);
              expect(currentFrame).toBe(expectedFrame);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
