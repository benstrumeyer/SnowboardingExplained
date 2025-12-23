/**
 * Shared mesh transposition types for web and React Native
 * Ensures consistent mesh visualization across platforms
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Keypoint {
  name: string;
  position: Point3D;
  confidence: number;
}

export interface Skeleton {
  keypoints: Keypoint[];
  connections: Array<[number, number]>; // indices of connected keypoints
}

export interface Matrix4 {
  data: number[]; // 16 elements for 4x4 matrix
}

export interface TranspositionResult {
  success: boolean;
  error?: string;
  data?: any;
}
