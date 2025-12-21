/**
 * Body Awareness Library
 * Task 16: Body awareness functions for form analysis
 * Maps pose data to body position checks
 */

import { PoseFrame, Vector3 } from '../types/formAnalysis';

export interface BodyPositionCheck {
  checkType: string;
  result: boolean;
  confidence: number;
  angleValue?: number;
  description: string;
}

/**
 * Check if arms are positioned toward tail
 */
export function isArmsTowardTail(pose: PoseFrame): BodyPositionCheck {
  const leftShoulder = getJointPosition(pose, 'left_shoulder');
  const rightShoulder = getJointPosition(pose, 'right_shoulder');
  const leftWrist = getJointPosition(pose, 'left_wrist');
  const rightWrist = getJointPosition(pose, 'right_wrist');

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
    return {
      checkType: 'arms_toward_tail',
      result: false,
      confidence: 0,
      description: 'Unable to detect arm position',
    };
  }

  // Check if wrists are behind shoulders (toward tail)
  const leftArmBehind = leftWrist.z < leftShoulder.z;
  const rightArmBehind = rightWrist.z < rightShoulder.z;

  const result = leftArmBehind && rightArmBehind;
  const confidence = pose.confidence * 100;

  return {
    checkType: 'arms_toward_tail',
    result,
    confidence,
    description: result ? 'Arms positioned toward tail' : 'Arms not toward tail',
  };
}

/**
 * Check if chest is wound up
 */
export function isChestWoundUp(pose: PoseFrame): BodyPositionCheck {
  const spineAngle = pose.jointAngles?.spine || 0;
  const isWoundUp = Math.abs(spineAngle) > 20;
  const confidence = Math.min(100, Math.abs(spineAngle) * 2);

  return {
    checkType: 'chest_wound_up',
    result: isWoundUp,
    confidence,
    angleValue: spineAngle,
    description: isWoundUp ? `Chest wound up ${Math.abs(spineAngle).toFixed(1)}°` : 'Chest not wound up',
  };
}

/**
 * Check if body is stacked over board
 */
export function isBodyStacked(pose: PoseFrame): BodyPositionCheck {
  const leftHip = getJointPosition(pose, 'left_hip');
  const rightHip = getJointPosition(pose, 'right_hip');
  const leftShoulder = getJointPosition(pose, 'left_shoulder');
  const rightShoulder = getJointPosition(pose, 'right_shoulder');

  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) {
    return {
      checkType: 'body_stacked',
      result: false,
      confidence: 0,
      description: 'Unable to detect body position',
    };
  }

  // Check if shoulders are roughly above hips (stacked)
  const hipCenterX = (leftHip.x + rightHip.x) / 2;
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const xDeviation = Math.abs(shoulderCenterX - hipCenterX);

  const isStacked = xDeviation < 0.15; // Within 15cm
  const confidence = Math.max(0, 100 - xDeviation * 100);

  return {
    checkType: 'body_stacked',
    result: isStacked,
    confidence,
    angleValue: xDeviation,
    description: isStacked ? 'Body well-stacked' : `Body offset by ${xDeviation.toFixed(2)}m`,
  };
}

/**
 * Check if knees are bent
 */
export function isKneesBent(pose: PoseFrame): BodyPositionCheck {
  const leftKnee = pose.jointAngles?.leftKnee || 180;
  const rightKnee = pose.jointAngles?.rightKnee || 180;
  const avgKneeAngle = (leftKnee + rightKnee) / 2;

  const isBent = avgKneeAngle < 150;
  const confidence = Math.min(100, Math.abs(180 - avgKneeAngle));

  return {
    checkType: 'knees_bent',
    result: isBent,
    confidence,
    angleValue: avgKneeAngle,
    description: isBent ? `Knees bent ${avgKneeAngle.toFixed(1)}°` : `Knees extended ${avgKneeAngle.toFixed(1)}°`,
  };
}

/**
 * Check if chest is open
 */
export function isChestOpen(pose: PoseFrame): BodyPositionCheck {
  const spineAngle = pose.jointAngles?.spine || 0;
  const isOpen = Math.abs(spineAngle) < 15;
  const confidence = Math.min(100, (15 - Math.abs(spineAngle)) * 5);

  return {
    checkType: 'chest_open',
    result: isOpen,
    confidence,
    angleValue: spineAngle,
    description: isOpen ? 'Chest open' : `Chest rotated ${Math.abs(spineAngle).toFixed(1)}°`,
  };
}

/**
 * Check if hips are opening
 */
export function isHipsOpening(pose: PoseFrame): BodyPositionCheck {
  const leftHip = getJointPosition(pose, 'left_hip');
  const rightHip = getJointPosition(pose, 'right_hip');

  if (!leftHip || !rightHip) {
    return {
      checkType: 'hips_opening',
      result: false,
      confidence: 0,
      description: 'Unable to detect hip position',
    };
  }

  // Check if hips are rotating (Z-axis difference)
  const hipRotation = Math.abs(leftHip.z - rightHip.z);
  const isOpening = hipRotation > 0.1;
  const confidence = Math.min(100, hipRotation * 100);

  return {
    checkType: 'hips_opening',
    result: isOpening,
    confidence,
    angleValue: hipRotation,
    description: isOpening ? 'Hips opening' : 'Hips closed',
  };
}

/**
 * Run all body awareness checks
 */
export function runAllBodyChecks(pose: PoseFrame): BodyPositionCheck[] {
  return [
    isArmsTowardTail(pose),
    isChestWoundUp(pose),
    isBodyStacked(pose),
    isKneesBent(pose),
    isChestOpen(pose),
    isHipsOpening(pose),
  ];
}

/**
 * Helper: Get joint position from pose
 */
function getJointPosition(pose: PoseFrame, jointName: string): Vector3 | null {
  const joint = pose.joints3D.find((j) => j.name === jointName);
  return joint ? joint.position : null;
}
