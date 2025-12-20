/**
 * Phase Detection Signals
 * Calculates pose-based signals used for phase detection
 * All detection is pure pose-based computation - no LLM involved
 */

import {
  PoseFrame,
  PhaseDetectionSignals,
  EdgeTransition,
  ArmPosition,
  Vector3,
} from '../types/formAnalysis';

const EDGE_ANGLE_THRESHOLD = 15; // degrees
const AIRBORNE_THRESHOLD = 0.1; // ratio
const VELOCITY_THRESHOLD = 0.02;
const ROTATION_VELOCITY_THRESHOLD = 2; // deg/s

/**
 * Calculate all phase detection signals from pose timeline
 */
export function calculatePhaseDetectionSignals(
  poseTimeline: PoseFrame[]
): PhaseDetectionSignals {
  const edgeAngle = calculateEdgeAngle(poseTimeline);
  const edgeTransitions = detectEdgeTransitions(edgeAngle);
  const hipHeight = extractHipHeight(poseTimeline);
  const hipVelocity = calculateVelocity(hipHeight);
  const hipAcceleration = calculateAcceleration(hipVelocity);
  const ankleToHipRatio = calculateAncleToHipRatio(poseTimeline);
  const chestRotation = calculateChestRotation(poseTimeline);
  const chestRotationVelocity = calculateVelocity(chestRotation);
  const chestDirection = calculateChestDirection(poseTimeline);
  const armPosition = detectArmPositions(poseTimeline);
  const gazeDirection = calculateGazeDirection(poseTimeline);
  const headRotation = calculateHeadRotation(poseTimeline);
  const bodyStackedness = calculateBodyStackedness(poseTimeline);
  const formVariance = calculateFormVariance(poseTimeline);

  return {
    edgeAngle,
    edgeTransitions,
    hipHeight,
    hipVelocity,
    hipAcceleration,
    ankleToHipRatio,
    chestRotation,
    chestRotationVelocity,
    chestDirection,
    armPosition,
    gazeDirection,
    headRotation,
    bodyStackedness,
    formVariance,
  };
}

/**
 * Calculate board edge angle (heel/toe pressure)
 * Positive = toeside, Negative = heelside
 */
function calculateEdgeAngle(poseTimeline: PoseFrame[]): number[] {
  return poseTimeline.map((frame) => {
    // Use ankle positions to infer edge angle
    const leftAnkle = frame.joints3D.find((j) => j.name === 'left_ankle');
    const rightAnkle = frame.joints3D.find((j) => j.name === 'right_ankle');

    if (!leftAnkle || !rightAnkle) return 0;

    // Simplified: difference in ankle heights indicates edge
    const ankleHeightDiff = leftAnkle.position.y - rightAnkle.position.y;
    return Math.atan2(ankleHeightDiff, 0.3) * (180 / Math.PI);
  });
}

/**
 * Detect transitions between heelside and toeside edges
 */
function detectEdgeTransitions(edgeAngle: number[]): EdgeTransition[] {
  const transitions: EdgeTransition[] = [];

  for (let i = 1; i < edgeAngle.length; i++) {
    const prevAngle = edgeAngle[i - 1];
    const currAngle = edgeAngle[i];

    // Heelside to toeside transition
    if (prevAngle < -EDGE_ANGLE_THRESHOLD && currAngle > -EDGE_ANGLE_THRESHOLD) {
      transitions.push({
        frame: i,
        fromEdge: 'heelside',
        toEdge: 'toeside',
        smoothness: calculateTransitionSmoothness(edgeAngle, i, 5),
      });
    }
    // Toeside to heelside transition
    else if (prevAngle > EDGE_ANGLE_THRESHOLD && currAngle < EDGE_ANGLE_THRESHOLD) {
      transitions.push({
        frame: i,
        fromEdge: 'toeside',
        toEdge: 'heelside',
        smoothness: calculateTransitionSmoothness(edgeAngle, i, 5),
      });
    }
  }

  return transitions;
}

/**
 * Calculate smoothness of edge transition (0-100)
 */
function calculateTransitionSmoothness(
  edgeAngle: number[],
  transitionFrame: number,
  windowSize: number
): number {
  const start = Math.max(0, transitionFrame - windowSize);
  const end = Math.min(edgeAngle.length, transitionFrame + windowSize);
  const window = edgeAngle.slice(start, end);

  // Calculate variance - lower variance = smoother transition
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  const variance =
    window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;

  // Convert variance to smoothness score (0-100)
  return Math.max(0, 100 - variance);
}

/**
 * Extract hip height (Y position) from pose timeline
 */
function extractHipHeight(poseTimeline: PoseFrame[]): number[] {
  return poseTimeline.map((frame) => {
    const leftHip = frame.joints3D.find((j) => j.name === 'left_hip');
    const rightHip = frame.joints3D.find((j) => j.name === 'right_hip');

    if (!leftHip || !rightHip) return 0;
    return (leftHip.position.y + rightHip.position.y) / 2;
  });
}

/**
 * Calculate velocity from position timeline
 */
function calculateVelocity(positions: number[]): number[] {
  const velocities: number[] = [0];

  for (let i = 1; i < positions.length; i++) {
    velocities.push(positions[i - 1] - positions[i]); // Negative = moving up
  }

  return velocities;
}

/**
 * Calculate acceleration from velocity timeline
 */
function calculateAcceleration(velocities: number[]): number[] {
  const accelerations: number[] = [0];

  for (let i = 1; i < velocities.length; i++) {
    accelerations.push(velocities[i] - velocities[i - 1]);
  }

  return accelerations;
}

/**
 * Calculate ankle to hip ratio (>1 = airborne)
 */
function calculateAncleToHipRatio(poseTimeline: PoseFrame[]): number[] {
  return poseTimeline.map((frame) => {
    const leftHip = frame.joints3D.find((j) => j.name === 'left_hip');
    const rightHip = frame.joints3D.find((j) => j.name === 'right_hip');
    const leftAnkle = frame.joints3D.find((j) => j.name === 'left_ankle');
    const rightAnkle = frame.joints3D.find((j) => j.name === 'right_ankle');

    if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) return 0;

    const hipY = (leftHip.position.y + rightHip.position.y) / 2;
    const ankleY = (leftAnkle.position.y + rightAnkle.position.y) / 2;

    return ankleY / hipY;
  });
}

/**
 * Calculate chest rotation relative to board direction
 */
function calculateChestRotation(poseTimeline: PoseFrame[]): number[] {
  return poseTimeline.map((frame) => {
    const leftShoulder = frame.joints3D.find((j) => j.name === 'left_shoulder');
    const rightShoulder = frame.joints3D.find((j) => j.name === 'right_shoulder');

    if (!leftShoulder || !rightShoulder) return 0;

    // Calculate shoulder vector
    const shoulderVector = {
      x: rightShoulder.position.x - leftShoulder.position.x,
      y: rightShoulder.position.y - leftShoulder.position.y,
      z: rightShoulder.position.z - leftShoulder.position.z,
    };

    // Angle relative to forward direction (Z-axis)
    return Math.atan2(shoulderVector.x, shoulderVector.z) * (180 / Math.PI);
  });
}

/**
 * Calculate chest direction vector (for arrow overlay)
 */
function calculateChestDirection(poseTimeline: PoseFrame[]): Vector3[] {
  return poseTimeline.map((frame) => {
    const leftShoulder = frame.joints3D.find((j) => j.name === 'left_shoulder');
    const rightShoulder = frame.joints3D.find((j) => j.name === 'right_shoulder');
    const leftHip = frame.joints3D.find((j) => j.name === 'left_hip');
    const rightHip = frame.joints3D.find((j) => j.name === 'right_hip');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { x: 0, y: 0, z: 1 };
    }

    // Chest center
    const chestCenter = {
      x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
      y: (leftShoulder.position.y + rightShoulder.position.y) / 2,
      z: (leftShoulder.position.z + rightShoulder.position.z) / 2,
    };

    // Hip center
    const hipCenter = {
      x: (leftHip.position.x + rightHip.position.x) / 2,
      y: (leftHip.position.y + rightHip.position.y) / 2,
      z: (leftHip.position.z + rightHip.position.z) / 2,
    };

    // Direction vector from hip to chest
    const direction = {
      x: chestCenter.x - hipCenter.x,
      y: chestCenter.y - hipCenter.y,
      z: chestCenter.z - hipCenter.z,
    };

    // Normalize
    const length = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
    );
    return {
      x: direction.x / length,
      y: direction.y / length,
      z: direction.z / length,
    };
  });
}

/**
 * Detect arm positions (toward tail/nose)
 */
function detectArmPositions(poseTimeline: PoseFrame[]): ArmPosition[] {
  return poseTimeline.map((frame, frameNumber) => {
    const leftShoulder = frame.joints3D.find((j) => j.name === 'left_shoulder');
    const rightShoulder = frame.joints3D.find((j) => j.name === 'right_shoulder');
    const leftWrist = frame.joints3D.find((j) => j.name === 'left_wrist');
    const rightWrist = frame.joints3D.find((j) => j.name === 'right_wrist');

    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
      return {
        frame: frameNumber,
        leftArmAngle: 0,
        rightArmAngle: 0,
        armsTowardTail: false,
        armsTowardNose: false,
      };
    }

    // Calculate arm angles
    const leftArmAngle = Math.atan2(
      leftWrist.position.y - leftShoulder.position.y,
      leftWrist.position.z - leftShoulder.position.z
    );
    const rightArmAngle = Math.atan2(
      rightWrist.position.y - rightShoulder.position.y,
      rightWrist.position.z - rightShoulder.position.z
    );

    // Determine if arms are toward tail (negative Z) or nose (positive Z)
    const avgArmZ = (leftWrist.position.z + rightWrist.position.z) / 2;
    const avgShoulderZ = (leftShoulder.position.z + rightShoulder.position.z) / 2;

    return {
      frame: frameNumber,
      leftArmAngle: leftArmAngle * (180 / Math.PI),
      rightArmAngle: rightArmAngle * (180 / Math.PI),
      armsTowardTail: avgArmZ < avgShoulderZ - 0.1,
      armsTowardNose: avgArmZ > avgShoulderZ + 0.1,
    };
  });
}

/**
 * Calculate gaze direction (eye/head direction)
 */
function calculateGazeDirection(poseTimeline: PoseFrame[]): Vector3[] {
  return poseTimeline.map((frame) => {
    const nose = frame.joints3D.find((j) => j.name === 'nose');
    const leftEye = frame.joints3D.find((j) => j.name === 'left_eye');
    const rightEye = frame.joints3D.find((j) => j.name === 'right_eye');

    if (!nose || !leftEye || !rightEye) {
      return { x: 0, y: 0, z: 1 };
    }

    // Eye center
    const eyeCenter = {
      x: (leftEye.position.x + rightEye.position.x) / 2,
      y: (leftEye.position.y + rightEye.position.y) / 2,
      z: (leftEye.position.z + rightEye.position.z) / 2,
    };

    // Direction from nose to eye center (gaze direction)
    const direction = {
      x: eyeCenter.x - nose.position.x,
      y: eyeCenter.y - nose.position.y,
      z: eyeCenter.z - nose.position.z,
    };

    // Normalize
    const length = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
    );
    return {
      x: direction.x / length,
      y: direction.y / length,
      z: direction.z / length,
    };
  });
}

/**
 * Calculate head rotation relative to body
 */
function calculateHeadRotation(poseTimeline: PoseFrame[]): number[] {
  return poseTimeline.map((frame) => {
    const nose = frame.joints3D.find((j) => j.name === 'nose');
    const leftShoulder = frame.joints3D.find((j) => j.name === 'left_shoulder');
    const rightShoulder = frame.joints3D.find((j) => j.name === 'right_shoulder');

    if (!nose || !leftShoulder || !rightShoulder) return 0;

    // Shoulder vector
    const shoulderVector = {
      x: rightShoulder.position.x - leftShoulder.position.x,
      z: rightShoulder.position.z - leftShoulder.position.z,
    };

    // Head position relative to shoulder center
    const shoulderCenter = {
      x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
      z: (leftShoulder.position.z + rightShoulder.position.z) / 2,
    };

    const headVector = {
      x: nose.position.x - shoulderCenter.x,
      z: nose.position.z - shoulderCenter.z,
    };

    // Angle between head and shoulder vectors
    const dotProduct = headVector.x * shoulderVector.x + headVector.z * shoulderVector.z;
    const magnitude1 = Math.sqrt(headVector.x * headVector.x + headVector.z * headVector.z);
    const magnitude2 = Math.sqrt(
      shoulderVector.x * shoulderVector.x + shoulderVector.z * shoulderVector.z
    );

    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  });
}

/**
 * Calculate body stackedness (alignment over board)
 */
function calculateBodyStackedness(poseTimeline: PoseFrame[]): number[] {
  return poseTimeline.map((frame) => {
    const leftHip = frame.joints3D.find((j) => j.name === 'left_hip');
    const rightHip = frame.joints3D.find((j) => j.name === 'right_hip');
    const leftShoulder = frame.joints3D.find((j) => j.name === 'left_shoulder');
    const rightShoulder = frame.joints3D.find((j) => j.name === 'right_shoulder');

    if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) return 0;

    // Hip center
    const hipCenter = {
      x: (leftHip.position.x + rightHip.position.x) / 2,
      z: (leftHip.position.z + rightHip.position.z) / 2,
    };

    // Shoulder center
    const shoulderCenter = {
      x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
      z: (leftShoulder.position.z + rightShoulder.position.z) / 2,
    };

    // Distance between hip and shoulder centers (lower = more stacked)
    const distance = Math.sqrt(
      Math.pow(shoulderCenter.x - hipCenter.x, 2) +
        Math.pow(shoulderCenter.z - hipCenter.z, 2)
    );

    // Convert to stackedness score (0-100, higher = more stacked)
    return Math.max(0, 100 - distance * 100);
  });
}

/**
 * Calculate form variance (rate of body position change)
 */
function calculateFormVariance(poseTimeline: PoseFrame[]): number[] {
  const variances: number[] = [0];

  for (let i = 1; i < poseTimeline.length; i++) {
    const prevFrame = poseTimeline[i - 1];
    const currFrame = poseTimeline[i];

    // Calculate average joint position change
    let totalChange = 0;
    let validJoints = 0;

    for (const currJoint of currFrame.joints3D) {
      const prevJoint = prevFrame.joints3D.find((j) => j.name === currJoint.name);
      if (prevJoint) {
        const change = Math.sqrt(
          Math.pow(currJoint.position.x - prevJoint.position.x, 2) +
            Math.pow(currJoint.position.y - prevJoint.position.y, 2) +
            Math.pow(currJoint.position.z - prevJoint.position.z, 2)
        );
        totalChange += change;
        validJoints++;
      }
    }

    variances.push(validJoints > 0 ? totalChange / validJoints : 0);
  }

  return variances;
}
