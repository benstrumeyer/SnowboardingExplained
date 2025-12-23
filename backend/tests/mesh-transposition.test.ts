/**
 * Property-based tests for mesh transposition
 * Feature: synchronized-video-mesh-playback, Property 8: Mesh Transposition Equivalence
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  transpose2DTo3D,
  map3DTo2D,
  validateTranspositionConsistency,
  Point2D,
  Point3D,
  Matrix4
} from '../src/shared/mesh-transposition';

// Arbitraries for property-based testing
const point2DArbitrary = fc.record({
  x: fc.integer({ min: 0, max: 1920 }),
  y: fc.integer({ min: 0, max: 1080 })
});

const point3DArbitrary = fc.record({
  x: fc.float({ min: -10, max: 10, noNaN: true }),
  y: fc.float({ min: -10, max: 10, noNaN: true }),
  z: fc.float({ min: 0.1, max: 10, noNaN: true })
});

const cameraMatrixArbitrary = fc.record({
  data: fc.tuple(
    fc.float({ min: 100, max: 2000, noNaN: true }), // fx
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 1920, noNaN: true }), // cx
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 100, max: 2000, noNaN: true }), // fy
    fc.float({ min: 0, max: 1080, noNaN: true }), // cy
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 1, max: 1, noNaN: true }), // 1
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 0, max: 0, noNaN: true }), // 0
    fc.float({ min: 1, max: 1, noNaN: true }) // 1
  ).map(data => ({ data: Array.from(data) }))
});

const depthMapArbitrary = fc.array(fc.float({ min: 0.1, max: 10, noNaN: true }), {
  minLength: 1920 * 1080,
  maxLength: 1920 * 1080
}).map(arr => new Float32Array(arr));

describe('Mesh Transposition Properties', () => {
  describe('Property 8: Mesh Transposition Equivalence', () => {
    it('should produce identical 3D coordinates for same input across multiple calls', () => {
      fc.assert(
        fc.property(point2DArbitrary, cameraMatrixArbitrary, depthMapArbitrary, (point2D, cameraMatrix, depthMap) => {
          const result1 = transpose2DTo3D(point2D, cameraMatrix, depthMap, 1920, 1080);
          const result2 = transpose2DTo3D(point2D, cameraMatrix, depthMap, 1920, 1080);

          // Results should be identical
          expect(result1.x).toBe(result2.x);
          expect(result1.y).toBe(result2.y);
          expect(result1.z).toBe(result2.z);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain round-trip consistency for 2D-to-3D-to-2D transformation', () => {
      fc.assert(
        fc.property(point2DArbitrary, cameraMatrixArbitrary, depthMapArbitrary, (point2D, cameraMatrix, depthMap) => {
          const isConsistent = validateTranspositionConsistency(point2D, cameraMatrix, depthMap, 1920, 1080);
          expect(isConsistent).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid 3D coordinates within expected bounds', () => {
      fc.assert(
        fc.property(point2DArbitrary, cameraMatrixArbitrary, depthMapArbitrary, (point2D, cameraMatrix, depthMap) => {
          const point3D = transpose2DTo3D(point2D, cameraMatrix, depthMap, 1920, 1080);

          // 3D coordinates should be finite numbers
          expect(isFinite(point3D.x)).toBe(true);
          expect(isFinite(point3D.y)).toBe(true);
          expect(isFinite(point3D.z)).toBe(true);

          // Z should be positive (depth)
          expect(point3D.z).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should project 3D points back to valid 2D screen coordinates', () => {
      fc.assert(
        fc.property(point3DArbitrary, cameraMatrixArbitrary, (point3D, cameraMatrix) => {
          const point2D = map3DTo2D(point3D, cameraMatrix, 1920, 1080);

          // 2D coordinates should be within viewport bounds
          expect(point2D.x).toBeGreaterThanOrEqual(0);
          expect(point2D.x).toBeLessThanOrEqual(1920);
          expect(point2D.y).toBeGreaterThanOrEqual(0);
          expect(point2D.y).toBeLessThanOrEqual(1080);

          // Should be finite numbers
          expect(isFinite(point2D.x)).toBe(true);
          expect(isFinite(point2D.y)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: points at viewport boundaries', () => {
      const cameraMatrix: Matrix4 = {
        data: [1000, 0, 960, 0, 0, 1000, 540, 0, 0, 0, 1, 0, 0, 0, 0, 1]
      };
      const depthMap = new Float32Array(1920 * 1080).fill(1.0);

      const edgeCases: Point2D[] = [
        { x: 0, y: 0 }, // top-left
        { x: 1920, y: 1080 }, // bottom-right
        { x: 960, y: 540 }, // center
        { x: 0, y: 540 }, // left-center
        { x: 1920, y: 540 } // right-center
      ];

      for (const point of edgeCases) {
        const point3D = transpose2DTo3D(point, cameraMatrix, depthMap, 1920, 1080);
        expect(isFinite(point3D.x)).toBe(true);
        expect(isFinite(point3D.y)).toBe(true);
        expect(isFinite(point3D.z)).toBe(true);
      }
    });
  });
});
