/**
 * Shared mesh transposition library
 * Provides 2D-to-3D and 3D-to-2D coordinate transformations
 * Used by both web and React Native implementations
 */

import { Point2D, Point3D, Matrix4, Keypoint, Skeleton } from './types';

// Re-export types for use by other modules
export type { Point2D, Point3D, Matrix4, Keypoint, Skeleton };

/**
 * Convert 2D video coordinates to 3D world space
 * Uses camera matrix and depth map for accurate transposition
 *
 * @param point2D - 2D point in video coordinates
 * @param cameraMatrix - Camera intrinsic matrix (4x4)
 * @param depthMap - Depth values for the frame
 * @param x - X coordinate in depth map
 * @param y - Y coordinate in depth map
 * @returns 3D point in world space
 */
export function transpose2DTo3D(
  point2D: Point2D,
  cameraMatrix: Matrix4,
  depthMap: Float32Array,
  depthMapWidth: number,
  depthMapHeight: number
): Point3D {
  // Normalize 2D coordinates
  const normalizedX = point2D.x / depthMapWidth;
  const normalizedY = point2D.y / depthMapHeight;

  // Clamp to valid range
  const clampedX = Math.max(0, Math.min(1, normalizedX));
  const clampedY = Math.max(0, Math.min(1, normalizedY));

  // Get depth value
  const depthIndex = Math.floor(clampedY * depthMapHeight) * depthMapWidth + Math.floor(clampedX * depthMapWidth);
  const depth = depthMap[depthIndex] || 1.0;

  // Extract camera matrix values
  const fx = cameraMatrix.data[0];
  const fy = cameraMatrix.data[5];
  const cx = cameraMatrix.data[2];
  const cy = cameraMatrix.data[6];

  // Unproject 2D to 3D using camera matrix
  const x3d = ((point2D.x - cx) * depth) / fx;
  const y3d = ((point2D.y - cy) * depth) / fy;
  const z3d = depth;

  return { x: x3d, y: y3d, z: z3d };
}

/**
 * Convert 3D world coordinates to 2D screen space
 * Projects 3D points onto 2D viewport using camera matrix
 *
 * @param point3D - 3D point in world space
 * @param cameraMatrix - Camera intrinsic matrix (4x4)
 * @param viewportWidth - Width of viewport in pixels
 * @param viewportHeight - Height of viewport in pixels
 * @returns 2D point in screen space
 */
export function map3DTo2D(
  point3D: Point3D,
  cameraMatrix: Matrix4,
  viewportWidth: number,
  viewportHeight: number
): Point2D {
  // Extract camera matrix values
  const fx = cameraMatrix.data[0];
  const fy = cameraMatrix.data[5];
  const cx = cameraMatrix.data[2];
  const cy = cameraMatrix.data[6];

  // Project 3D to 2D using camera matrix
  const x2d = (point3D.x * fx) / point3D.z + cx;
  const y2d = (point3D.y * fy) / point3D.z + cy;

  // Clamp to viewport bounds
  return {
    x: Math.max(0, Math.min(viewportWidth, x2d)),
    y: Math.max(0, Math.min(viewportHeight, y2d))
  };
}

/**
 * Generate 2D mesh overlay on video frame
 * Draws skeleton joints and connections on canvas
 *
 * @param videoFrame - Canvas element containing video frame
 * @param keypoints - Array of keypoints with 3D positions
 * @param skeleton - Skeleton structure with connections
 * @param cameraMatrix - Camera matrix for 3D-to-2D projection
 * @returns Canvas with mesh overlay drawn
 */
export function generateMeshOverlay(
  videoFrame: HTMLCanvasElement,
  keypoints: Keypoint[],
  skeleton: Skeleton,
  cameraMatrix: Matrix4
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = videoFrame.width;
  canvas.height = videoFrame.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw video frame
  ctx.drawImage(videoFrame, 0, 0);

  // Project keypoints to 2D
  const projectedKeypoints: Point2D[] = keypoints.map(kp =>
    map3DTo2D(kp.position, cameraMatrix, canvas.width, canvas.height)
  );

  // Draw skeleton connections
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;

  for (const [startIdx, endIdx] of skeleton.connections) {
    if (startIdx < projectedKeypoints.length && endIdx < projectedKeypoints.length) {
      const start = projectedKeypoints[startIdx];
      const end = projectedKeypoints[endIdx];

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  // Draw keypoint circles
  ctx.fillStyle = '#FF0000';
  const radius = 5;

  for (const keypoint of keypoints) {
    if (keypoint.confidence > 0.5) {
      const point = map3DTo2D(keypoint.position, cameraMatrix, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  return canvas;
}

/**
 * Validate that transposition produces consistent results
 * Used for testing equivalence between implementations
 *
 * @param point2D - Original 2D point
 * @param cameraMatrix - Camera matrix
 * @param depthMap - Depth map
 * @returns true if round-trip is consistent
 */
export function validateTranspositionConsistency(
  point2D: Point2D,
  cameraMatrix: Matrix4,
  depthMap: Float32Array,
  depthMapWidth: number,
  depthMapHeight: number
): boolean {
  try {
    // Forward transposition
    const point3D = transpose2DTo3D(point2D, cameraMatrix, depthMap, depthMapWidth, depthMapHeight);

    // Reverse projection
    const point2DBack = map3DTo2D(point3D, cameraMatrix, depthMapWidth, depthMapHeight);

    // Check if round-trip is close (within 1 pixel tolerance)
    const tolerance = 1.0;
    return Math.abs(point2D.x - point2DBack.x) < tolerance && Math.abs(point2D.y - point2DBack.y) < tolerance;
  } catch (error) {
    return false;
  }
}
