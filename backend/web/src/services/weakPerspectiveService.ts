import { CameraParams } from '../types';

/**
 * Weak Perspective Camera Service
 * 
 * HMR2 outputs vertices in SMPL model space and a weak perspective camera
 * with parameters [scale, tx, ty]. This service transforms vertices to
 * align with the original image coordinates.
 * 
 * Weak Perspective Projection Matrix:
 * | s   0   0   tx*s |
 * | 0   s   0  -ty*s |
 * | 0   0  -1   0    |
 * | 0   0   0   1    |
 * 
 * Where:
 * - s = scale (zoom factor, larger = closer to camera)
 * - tx, ty = translation in normalized image coordinates [-1, 1]
 */

export interface TransformedVertex {
  x: number;
  y: number;
  z: number;
}

/**
 * Apply weak perspective projection to a single vertex
 * Transforms from SMPL model space to image-aligned coordinates
 */
export function applyWeakPerspective(
  vertex: [number, number, number],
  cameraParams: CameraParams
): TransformedVertex {
  const [x, y, z] = vertex;
  const { scale, tx, ty } = cameraParams;
  
  // Apply weak perspective projection
  // x' = s * x + tx * s
  // y' = s * y - ty * s  (note: negative ty for image coordinate system)
  // z' = -z (flip Z for right-handed to left-handed conversion)
  return {
    x: scale * x + tx * scale,
    y: scale * y - ty * scale,
    z: -z  // Flip Z for proper depth ordering
  };
}

/**
 * Apply weak perspective projection to all vertices
 */
export function transformVerticesWithWeakPerspective(
  vertices: Array<[number, number, number]>,
  cameraParams: CameraParams
): Array<[number, number, number]> {
  return vertices.map(vertex => {
    const transformed = applyWeakPerspective(vertex, cameraParams);
    return [transformed.x, transformed.y, transformed.z];
  });
}

/**
 * Convert weak perspective camera to a 4x4 projection matrix
 * This can be used directly with Three.js Matrix4
 */
export function createWeakPerspectiveMatrix(cameraParams: CameraParams): number[] {
  const { scale, tx, ty } = cameraParams;
  
  // Column-major order for Three.js
  return [
    scale, 0, 0, 0,           // Column 0
    0, scale, 0, 0,           // Column 1
    0, 0, -1, 0,              // Column 2
    tx * scale, -ty * scale, 0, 1  // Column 3
  ];
}

/**
 * Calculate the focal length equivalent for the weak perspective camera
 * This is useful for converting to a perspective camera if needed
 * 
 * For weak perspective: focal_length ≈ 2 * scale * image_size / 2
 */
export function estimateFocalLength(
  cameraParams: CameraParams,
  imageSize: number = 256
): number {
  return cameraParams.scale * imageSize;
}

/**
 * Convert weak perspective camera to perspective camera parameters
 * This allows rendering with a standard perspective camera
 * 
 * The conversion assumes:
 * - Image was cropped to 256x256
 * - Person is roughly at z = 2 * focal_length / (scale * crop_size)
 */
export function weakPerspectiveToPerspective(
  cameraParams: CameraParams,
  cropSize: number = 256,
  focalLength: number = 5000
): { position: [number, number, number]; fov: number } {
  const { scale, tx, ty } = cameraParams;
  
  // Estimate Z distance from scale
  // z = 2 * focal_length / (scale * crop_size)
  const z = (2 * focalLength) / (scale * cropSize + 1e-9);
  
  // Convert normalized tx, ty to world coordinates
  // The person center in world space
  const worldX = tx * z / focalLength * cropSize / 2;
  const worldY = -ty * z / focalLength * cropSize / 2;
  
  // Calculate FOV from focal length
  const fov = 2 * Math.atan(cropSize / (2 * focalLength)) * (180 / Math.PI);
  
  return {
    position: [worldX, worldY, z],
    fov
  };
}

/**
 * Normalize vertices to fit within a unit cube centered at origin
 * Useful for consistent rendering regardless of camera parameters
 */
export function normalizeVertices(
  vertices: Array<[number, number, number]>
): { vertices: Array<[number, number, number]>; scale: number; center: [number, number, number] } {
  if (vertices.length === 0) {
    return { vertices: [], scale: 1, center: [0, 0, 0] };
  }
  
  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  for (const [x, y, z] of vertices) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  
  // Calculate center and scale
  const center: [number, number, number] = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  ];
  
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = maxZ - minZ;
  const maxRange = Math.max(rangeX, rangeY, rangeZ);
  const scale = maxRange > 0 ? 2 / maxRange : 1;  // Normalize to [-1, 1]
  
  // Transform vertices
  const normalizedVertices = vertices.map(([x, y, z]): [number, number, number] => [
    (x - center[0]) * scale,
    (y - center[1]) * scale,
    (z - center[2]) * scale
  ]);
  
  return { vertices: normalizedVertices, scale, center };
}
