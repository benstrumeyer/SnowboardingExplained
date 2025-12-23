/**
 * Property-based tests for frame index alignment
 * Feature: synchronized-video-mesh-playback, Property 1: Frame Index Alignment
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { VideoExtractionService, FrameIndexMapping } from '../src/services/videoExtractionService';
import { meshDataService } from '../src/services/meshDataService';

// Mock the mesh data service
vi.mock('../src/services/meshDataService', () => ({
  meshDataService: {
    getMeshData: vi.fn()
  }
}));

// Arbitraries for property-based testing
const videoIdArbitrary = fc.string({ minLength: 5, maxLength: 20, regex: /^[a-zA-Z0-9_-]+$/ });
const frameIndexArbitrary = fc.integer({ min: 0, max: 1000 });
const fpsArbitrary = fc.integer({ min: 1, max: 60 });
const durationArbitrary = fc.integer({ min: 1, max: 3600 });

describe('Frame Index Alignment Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Frame Index Alignment', () => {
    it('should generate frame index mapping where mesh frame index N corresponds to unique original frame number', () => {
      fc.assert(
        fc.property(
          fc.array(frameIndexArbitrary, { minLength: 1, maxLength: 100, uniqueBy: (x) => x }),
          fpsArbitrary,
          durationArbitrary,
          (meshFrameIndices, fps, duration) => {
            // Generate frame index mapping
            const mapping = VideoExtractionService.generateFrameIndexMapping(
              meshFrameIndices,
              fps,
              duration
            );

            // Property: Mapping should have same number of entries as mesh frame indices
            expect(Object.keys(mapping).length).toBe(meshFrameIndices.length);

            // Property: Each mesh frame index should map to a unique original frame number
            const originalFrameNumbers = new Set<number>();
            for (let i = 0; i < meshFrameIndices.length; i++) {
              const entry = mapping[i];
              expect(entry).toBeDefined();
              expect(entry.originalFrameNumber).toBe(meshFrameIndices[i]);
              expect(entry.timestamp).toBeGreaterThanOrEqual(0);
              expect(entry.timestamp).toBeLessThanOrEqual(duration);

              // Check uniqueness
              expect(originalFrameNumbers.has(entry.originalFrameNumber)).toBe(false);
              originalFrameNumbers.add(entry.originalFrameNumber);
            }

            // Property: All original frame numbers should be unique
            expect(originalFrameNumbers.size).toBe(meshFrameIndices.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure timestamp is calculated correctly from frame index and FPS', () => {
      fc.assert(
        fc.property(
          fc.array(frameIndexArbitrary, { minLength: 1, maxLength: 100, uniqueBy: (x) => x }),
          fpsArbitrary,
          durationArbitrary,
          (meshFrameIndices, fps, duration) => {
            const mapping = VideoExtractionService.generateFrameIndexMapping(
              meshFrameIndices,
              fps,
              duration
            );

            // Property: For each entry, timestamp should equal originalFrameNumber / fps
            for (let i = 0; i < meshFrameIndices.length; i++) {
              const entry = mapping[i];
              const expectedTimestamp = meshFrameIndices[i] / fps;
              expect(Math.abs(entry.timestamp - expectedTimestamp)).toBeLessThan(0.001);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain frame index order in mapping', () => {
      fc.assert(
        fc.property(
          fc.array(frameIndexArbitrary, { minLength: 2, maxLength: 100, uniqueBy: (x) => x }),
          fpsArbitrary,
          durationArbitrary,
          (meshFrameIndices, fps, duration) => {
            const mapping = VideoExtractionService.generateFrameIndexMapping(
              meshFrameIndices,
              fps,
              duration
            );

            // Property: If mesh frame indices are sorted, timestamps should be in ascending order
            const sortedIndices = [...meshFrameIndices].sort((a, b) => a - b);
            let previousTimestamp = -1;

            for (let i = 0; i < sortedIndices.length; i++) {
              const entry = mapping[i];
              expect(entry.timestamp).toBeGreaterThan(previousTimestamp);
              previousTimestamp = entry.timestamp;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of single frame', () => {
      fc.assert(
        fc.property(frameIndexArbitrary, fpsArbitrary, durationArbitrary, (frameIndex, fps, duration) => {
          const mapping = VideoExtractionService.generateFrameIndexMapping([frameIndex], fps, duration);

          // Property: Single frame mapping should have exactly one entry
          expect(Object.keys(mapping).length).toBe(1);
          expect(mapping[0]).toBeDefined();
          expect(mapping[0].originalFrameNumber).toBe(frameIndex);
          expect(mapping[0].timestamp).toBe(frameIndex / fps);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of zero frame index', () => {
      fc.assert(
        fc.property(fpsArbitrary, durationArbitrary, (fps, duration) => {
          const mapping = VideoExtractionService.generateFrameIndexMapping([0], fps, duration);

          // Property: Frame 0 should have timestamp 0
          expect(mapping[0].timestamp).toBe(0);
          expect(mapping[0].originalFrameNumber).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should ensure all timestamps are within video duration', () => {
      fc.assert(
        fc.property(
          fc.array(frameIndexArbitrary, { minLength: 1, maxLength: 100, uniqueBy: (x) => x }),
          fpsArbitrary,
          durationArbitrary,
          (meshFrameIndices, fps, duration) => {
            // Filter to ensure frame indices are within reasonable bounds
            const validIndices = meshFrameIndices.filter((idx) => idx / fps <= duration);

            if (validIndices.length === 0) {
              return true; // Skip if no valid indices
            }

            const mapping = VideoExtractionService.generateFrameIndexMapping(validIndices, fps, duration);

            // Property: All timestamps should be within [0, duration]
            for (let i = 0; i < validIndices.length; i++) {
              const entry = mapping[i];
              expect(entry.timestamp).toBeGreaterThanOrEqual(0);
              expect(entry.timestamp).toBeLessThanOrEqual(duration);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round-trip: mapping should preserve original frame indices', () => {
      fc.assert(
        fc.property(
          fc.array(frameIndexArbitrary, { minLength: 1, maxLength: 100, uniqueBy: (x) => x }),
          fpsArbitrary,
          durationArbitrary,
          (meshFrameIndices, fps, duration) => {
            const mapping = VideoExtractionService.generateFrameIndexMapping(
              meshFrameIndices,
              fps,
              duration
            );

            // Property: Round-trip should preserve original frame indices
            const recoveredIndices = Object.keys(mapping)
              .map((key) => parseInt(key))
              .sort((a, b) => a - b)
              .map((i) => mapping[i].originalFrameNumber);

            const sortedOriginal = [...meshFrameIndices].sort((a, b) => a - b);

            expect(recoveredIndices).toEqual(sortedOriginal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
