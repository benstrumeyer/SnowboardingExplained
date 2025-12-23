import * as THREE from 'three';
import { SyncedFrame } from '../types';

/**
 * Tracking Service
 * Calculates and manages tracking lines for body parts
 */
export class TrackingService {
  /**
   * Get distinct color for keypoint
   */
  static getKeypointColor(keypointIndex: number): THREE.Color {
    const colors = [
      0xff6b6b, 0xff8c42, 0xffd93d, 0x6bcf7f, 0x4d96ff, 0x9d84b7, 0xff6b9d,
      0xc44569, 0xf8b500, 0x00d4ff, 0xff006e, 0x8338ec, 0xfb5607, 0xffbe0b,
      0x3a86ff, 0x06ffa5, 0xff006e, 0xfb5607, 0xffbe0b, 0x8338ec, 0x3a86ff,
      0x06ffa5, 0xff006e, 0xfb5607, 0xffbe0b, 0x8338ec, 0x3a86ff, 0x06ffa5,
      0xff006e, 0xfb5607, 0xffbe0b, 0x8338ec, 0x3a86ff
    ];

    const colorValue = colors[keypointIndex % colors.length];
    return new THREE.Color(colorValue);
  }

  /**
   * Calculate tracking line positions for a keypoint across frames
   */
  static calculateTrackingLine(
    frames: SyncedFrame[],
    keypointIndex: number,
    upToFrameIndex?: number
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const endFrame = upToFrameIndex ?? frames.length - 1;

    for (let i = 0; i <= endFrame && i < frames.length; i++) {
      const frame = frames[i];
      if (frame.meshData && frame.meshData.keypoints[keypointIndex]) {
        const kp = frame.meshData.keypoints[keypointIndex];
        positions.push(new THREE.Vector3(kp.position[0], kp.position[1], kp.position[2]));
      }
    }

    return positions;
  }

  /**
   * Get keypoint name
   */
  static getKeypointName(keypointIndex: number): string {
    const names = [
      'nose',
      'left_eye_inner',
      'left_eye',
      'left_eye_outer',
      'right_eye_inner',
      'right_eye',
      'right_eye_outer',
      'left_ear',
      'right_ear',
      'mouth_left',
      'mouth_right',
      'left_shoulder',
      'right_shoulder',
      'left_elbow',
      'right_elbow',
      'left_wrist',
      'right_wrist',
      'left_pinky',
      'right_pinky',
      'left_index',
      'right_index',
      'left_thumb',
      'right_thumb',
      'left_hip',
      'right_hip',
      'left_knee',
      'right_knee',
      'left_ankle',
      'right_ankle',
      'left_heel',
      'right_heel',
      'left_foot_index',
      'right_foot_index'
    ];

    return names[keypointIndex] || `keypoint_${keypointIndex}`;
  }

  /**
   * Calculate angle between three points
   */
  static calculateAngle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
    const v1 = p1.clone().sub(p2);
    const v2 = p3.clone().sub(p2);

    const cosAngle = v1.dot(v2) / (v1.length() * v2.length());
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return (angle * 180) / Math.PI;
  }

  /**
   * Get skeleton connections for angle calculation
   */
  static getSkeletonConnections(): Array<{ from: number; to: number; parent: number }> {
    return [
      { from: 11, to: 13, parent: 12 }, // left shoulder-elbow-right shoulder
      { from: 13, to: 15, parent: 11 }, // left elbow-wrist-shoulder
      { from: 12, to: 14, parent: 11 }, // right shoulder-elbow-left shoulder
      { from: 14, to: 16, parent: 12 }, // right elbow-wrist-shoulder
      { from: 11, to: 23, parent: 12 }, // left shoulder-hip-right shoulder
      { from: 23, to: 25, parent: 24 }, // left hip-knee-right hip
      { from: 25, to: 27, parent: 23 }, // left knee-ankle-hip
      { from: 12, to: 24, parent: 11 }, // right shoulder-hip-left shoulder
      { from: 24, to: 26, parent: 23 }, // right hip-knee-left hip
      { from: 26, to: 28, parent: 24 }  // right knee-ankle-hip
    ];
  }
}
