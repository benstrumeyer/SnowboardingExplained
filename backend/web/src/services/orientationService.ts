import * as THREE from 'three';
import { SyncedFrame } from '../types';

/**
 * Orientation Service
 * Handles model orientation and ground placement
 */
export class OrientationService {
  /**
   * Calculate orientation to place feet on ground and head upright
   */
  static calculateOrientation(firstFrame: SyncedFrame): THREE.Quaternion {
    if (!firstFrame.meshData || !firstFrame.meshData.keypoints) {
      return new THREE.Quaternion();
    }

    const keypoints = firstFrame.meshData.keypoints;

    // Get key body points
    const head = keypoints[0]?.position; // nose
    const leftHip = keypoints[23]?.position;
    const rightHip = keypoints[24]?.position;
    const leftAnkle = keypoints[27]?.position;
    const rightAnkle = keypoints[28]?.position;

    if (!head || !leftHip || !rightHip || !leftAnkle || !rightAnkle) {
      return new THREE.Quaternion();
    }

    // Calculate body direction (from hips to head)
    const hipCenter = new THREE.Vector3(
      (leftHip[0] + rightHip[0]) / 2,
      (leftHip[1] + rightHip[1]) / 2,
      (leftHip[2] + rightHip[2]) / 2
    );

    const headVec = new THREE.Vector3(head[0], head[1], head[2]);
    const upDirection = headVec.clone().sub(hipCenter).normalize();

    // Calculate side direction (from left to right)
    const leftHipVec = new THREE.Vector3(leftHip[0], leftHip[1], leftHip[2]);
    const rightHipVec = new THREE.Vector3(rightHip[0], rightHip[1], rightHip[2]);
    const sideDirection = rightHipVec.clone().sub(leftHipVec).normalize();

    // Calculate forward direction (perpendicular to up and side)
    const forwardDirection = new THREE.Vector3().crossVectors(sideDirection, upDirection);

    // Create rotation matrix
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(sideDirection, upDirection, forwardDirection);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(matrix);

    return quaternion;
  }

  /**
   * Apply orientation to all frames
   */
  static applyOrientationToFrames(
    frames: SyncedFrame[],
    quaternion: THREE.Quaternion
  ): SyncedFrame[] {
    return frames.map(frame => {
      if (!frame.meshData || !frame.meshData.keypoints) {
        return frame;
      }

      const rotatedKeypoints = frame.meshData.keypoints.map(kp => ({
        ...kp,
        position: OrientationService.rotatePoint(
          new THREE.Vector3(...kp.position),
          quaternion
        ) as [number, number, number]
      }));

      return {
        ...frame,
        meshData: {
          ...frame.meshData,
          keypoints: rotatedKeypoints
        }
      };
    });
  }

  /**
   * Rotate a point using quaternion
   */
  private static rotatePoint(point: THREE.Vector3, quaternion: THREE.Quaternion): THREE.Vector3 {
    return point.applyQuaternion(quaternion);
  }

  /**
   * Get ground offset (lowest y-coordinate)
   */
  static getGroundOffset(frame: SyncedFrame): number {
    if (!frame.meshData || !frame.meshData.keypoints) {
      return 0;
    }

    let minY = Infinity;
    for (const kp of frame.meshData.keypoints) {
      minY = Math.min(minY, kp.position[1]);
    }

    return minY === Infinity ? 0 : minY;
  }

  /**
   * Place model on ground
   */
  static placeOnGround(frames: SyncedFrame[]): SyncedFrame[] {
    if (frames.length === 0) {
      return frames;
    }

    const groundOffset = OrientationService.getGroundOffset(frames[0]);

    return frames.map(frame => {
      if (!frame.meshData || !frame.meshData.keypoints) {
        return frame;
      }

      const adjustedKeypoints = frame.meshData.keypoints.map(kp => ({
        ...kp,
        position: [kp.position[0], kp.position[1] - groundOffset, kp.position[2]] as [
          number,
          number,
          number
        ]
      }));

      return {
        ...frame,
        meshData: {
          ...frame.meshData,
          keypoints: adjustedKeypoints
        }
      };
    });
  }
}
