/**
 * Stacked Position Analyzer
 * Analyzes and compares rider position to a reference stacked position
 * Used to detect if rider is maintaining proper stance and weight distribution
 */

import { PoseFrame, Joint3D, Vector3 } from '../types/formAnalysis';

export interface StackedPositionMetrics {
  leftKneeAngle: number;
  rightKneeAngle: number;
  kneeAngleAverage: number;
  hipForwardBias: number; // How far hips are forward of ankles
  stanceWidth: number; // Distance between left and right ankle
  bodyStackedness: number; // How aligned hips and shoulders are
  weightDistribution: number; // 0-1, 0=back foot, 1=front foot
  ankleHeightDifference: number; // Left vs right ankle height
  overallStackedness: number; // 0-100 score
}

export interface StackedPositionDelta {
  metric: string;
  referenceValue: number;
  riderValue: number;
  delta: number;
  percentDifference: number;
  isDeviation: boolean; // True if outside acceptable range
  severity: 'none' | 'minor' | 'moderate' | 'critical';
}

/**
 * Calculate knee angle from three joints (hip, knee, ankle)
 */
function calculateKneeAngle(hip: Joint3D, knee: Joint3D, ankle: Joint3D): number {
  // Vector from knee to hip
  const hipVector = {
    x: hip.position.x - knee.position.x,
    y: hip.position.y - knee.position.y,
    z: hip.position.z - knee.position.z,
  };

  // Vector from knee to ankle
  const ankleVector = {
    x: ankle.position.x - knee.position.x,
    y: ankle.position.y - knee.position.y,
    z: ankle.position.z - knee.position.z,
  };

  // Calculate angle using dot product
  const dotProduct =
    hipVector.x * ankleVector.x + hipVector.y * ankleVector.y + hipVector.z * ankleVector.z;
  const magnitude1 = Math.sqrt(
    hipVector.x * hipVector.x + hipVector.y * hipVector.y + hipVector.z * hipVector.z
  );
  const magnitude2 = Math.sqrt(
    ankleVector.x * ankleVector.x + ankleVector.y * ankleVector.y + ankleVector.z * ankleVector.z
  );

  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

/**
 * Calculate hip forward bias (how far hips are forward of ankles)
 */
function calculateHipForwardBias(
  leftHip: Joint3D,
  rightHip: Joint3D,
  leftAnkle: Joint3D,
  rightAnkle: Joint3D
): number {
  const hipCenterZ = (leftHip.position.z + rightHip.position.z) / 2;
  const ankleCenterZ = (leftAnkle.position.z + rightAnkle.position.z) / 2;

  // Positive = hips forward, negative = hips back
  return hipCenterZ - ankleCenterZ;
}

/**
 * Calculate stance width (distance between feet)
 */
function calculateStanceWidth(leftAnkle: Joint3D, rightAnkle: Joint3D): number {
  const dx = rightAnkle.position.x - leftAnkle.position.x;
  const dy = rightAnkle.position.y - leftAnkle.position.y;
  const dz = rightAnkle.position.z - leftAnkle.position.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate weight distribution (0 = back foot, 1 = front foot)
 * Based on ankle Y position (higher = more weight on that foot)
 */
function calculateWeightDistribution(leftAnkle: Joint3D, rightAnkle: Joint3D): number {
  const leftWeight = leftAnkle.position.y;
  const rightWeight = rightAnkle.position.y;
  const totalWeight = leftWeight + rightWeight;

  // Assuming right foot is front foot (adjust for goofy stance if needed)
  return rightWeight / totalWeight;
}

/**
 * Calculate body stackedness (how aligned hips and shoulders are)
 */
function calculateBodyStackedness(
  leftHip: Joint3D,
  rightHip: Joint3D,
  leftShoulder: Joint3D,
  rightShoulder: Joint3D
): number {
  const hipCenterX = (leftHip.position.x + rightHip.position.x) / 2;
  const hipCenterZ = (leftHip.position.z + rightHip.position.z) / 2;

  const shoulderCenterX = (leftShoulder.position.x + rightShoulder.position.x) / 2;
  const shoulderCenterZ = (leftShoulder.position.z + rightShoulder.position.z) / 2;

  // Distance between hip and shoulder centers (lower = more stacked)
  const distance = Math.sqrt(
    Math.pow(shoulderCenterX - hipCenterX, 2) + Math.pow(shoulderCenterZ - hipCenterZ, 2)
  );

  // Convert to stackedness score (0-100, higher = more stacked)
  return Math.max(0, 100 - distance * 100);
}

/**
 * Calculate ankle height difference (left vs right)
 */
function calculateAnkleHeightDifference(leftAnkle: Joint3D, rightAnkle: Joint3D): number {
  return rightAnkle.position.y - leftAnkle.position.y;
}

/**
 * Extract stacked position metrics from a single pose frame
 */
export function extractStackedPositionMetrics(frame: PoseFrame): StackedPositionMetrics {
  const leftHip = frame.joints3D.find((j) => j.name === 'left_hip');
  const rightHip = frame.joints3D.find((j) => j.name === 'right_hip');
  const leftKnee = frame.joints3D.find((j) => j.name === 'left_knee');
  const rightKnee = frame.joints3D.find((j) => j.name === 'right_knee');
  const leftAnkle = frame.joints3D.find((j) => j.name === 'left_ankle');
  const rightAnkle = frame.joints3D.find((j) => j.name === 'right_ankle');
  const leftShoulder = frame.joints3D.find((j) => j.name === 'left_shoulder');
  const rightShoulder = frame.joints3D.find((j) => j.name === 'right_shoulder');

  if (
    !leftHip ||
    !rightHip ||
    !leftKnee ||
    !rightKnee ||
    !leftAnkle ||
    !rightAnkle ||
    !leftShoulder ||
    !rightShoulder
  ) {
    return {
      leftKneeAngle: 0,
      rightKneeAngle: 0,
      kneeAngleAverage: 0,
      hipForwardBias: 0,
      stanceWidth: 0,
      bodyStackedness: 0,
      weightDistribution: 0.5,
      ankleHeightDifference: 0,
      overallStackedness: 0,
    };
  }

  const leftKneeAngle = calculateKneeAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateKneeAngle(rightHip, rightKnee, rightAnkle);
  const kneeAngleAverage = (leftKneeAngle + rightKneeAngle) / 2;
  const hipForwardBias = calculateHipForwardBias(leftHip, rightHip, leftAnkle, rightAnkle);
  const stanceWidth = calculateStanceWidth(leftAnkle, rightAnkle);
  const bodyStackedness = calculateBodyStackedness(
    leftHip,
    rightHip,
    leftShoulder,
    rightShoulder
  );
  const weightDistribution = calculateWeightDistribution(leftAnkle, rightAnkle);
  const ankleHeightDifference = calculateAnkleHeightDifference(leftAnkle, rightAnkle);

  // Calculate overall stackedness score (0-100)
  // Ideal stacked position: ~100° knee bend, forward hip bias, balanced weight, stacked body
  const kneeScore = Math.max(0, 100 - Math.abs(kneeAngleAverage - 100) * 2); // Ideal ~100°
  const hipScore = Math.max(0, 100 - Math.abs(hipForwardBias - 0.15) * 100); // Ideal ~0.15m forward
  const weightScore = Math.max(0, 100 - Math.abs(weightDistribution - 0.55) * 100); // Slight front bias
  const stackScore = bodyStackedness; // Already 0-100

  const overallStackedness = (kneeScore + hipScore + weightScore + stackScore) / 4;

  return {
    leftKneeAngle,
    rightKneeAngle,
    kneeAngleAverage,
    hipForwardBias,
    stanceWidth,
    bodyStackedness,
    weightDistribution,
    ankleHeightDifference,
    overallStackedness,
  };
}

/**
 * Compare rider stacked position to reference stacked position
 */
export function compareStackedPositions(
  referenceMetrics: StackedPositionMetrics,
  riderMetrics: StackedPositionMetrics,
  acceptableRanges?: {
    kneeAngle?: { min: number; max: number };
    hipForwardBias?: { min: number; max: number };
    weightDistribution?: { min: number; max: number };
    bodyStackedness?: { min: number; max: number };
  }
): StackedPositionDelta[] {
  const deltas: StackedPositionDelta[] = [];

  // Default acceptable ranges (can be customized)
  const ranges = acceptableRanges || {
    kneeAngle: { min: 85, max: 115 },
    hipForwardBias: { min: 0.1, max: 0.2 },
    weightDistribution: { min: 0.45, max: 0.65 },
    bodyStackedness: { min: 70, max: 100 },
  };

  // Compare knee angle
  const kneeAngleDelta = riderMetrics.kneeAngleAverage - referenceMetrics.kneeAngleAverage;
  const kneeAnglePercent = (kneeAngleDelta / referenceMetrics.kneeAngleAverage) * 100;
  deltas.push({
    metric: 'kneeAngle',
    referenceValue: referenceMetrics.kneeAngleAverage,
    riderValue: riderMetrics.kneeAngleAverage,
    delta: kneeAngleDelta,
    percentDifference: kneeAnglePercent,
    isDeviation:
      riderMetrics.kneeAngleAverage < ranges.kneeAngle!.min ||
      riderMetrics.kneeAngleAverage > ranges.kneeAngle!.max,
    severity: getSeverity(Math.abs(kneeAngleDelta), 5, 15, 25),
  });

  // Compare hip forward bias
  const hipBiasDelta = riderMetrics.hipForwardBias - referenceMetrics.hipForwardBias;
  const hipBiasPercent = (hipBiasDelta / (referenceMetrics.hipForwardBias || 0.15)) * 100;
  deltas.push({
    metric: 'hipForwardBias',
    referenceValue: referenceMetrics.hipForwardBias,
    riderValue: riderMetrics.hipForwardBias,
    delta: hipBiasDelta,
    percentDifference: hipBiasPercent,
    isDeviation:
      riderMetrics.hipForwardBias < ranges.hipForwardBias!.min ||
      riderMetrics.hipForwardBias > ranges.hipForwardBias!.max,
    severity: getSeverity(Math.abs(hipBiasDelta), 0.03, 0.08, 0.15),
  });

  // Compare weight distribution
  const weightDelta = riderMetrics.weightDistribution - referenceMetrics.weightDistribution;
  const weightPercent = (weightDelta / referenceMetrics.weightDistribution) * 100;
  deltas.push({
    metric: 'weightDistribution',
    referenceValue: referenceMetrics.weightDistribution,
    riderValue: riderMetrics.weightDistribution,
    delta: weightDelta,
    percentDifference: weightPercent,
    isDeviation:
      riderMetrics.weightDistribution < ranges.weightDistribution!.min ||
      riderMetrics.weightDistribution > ranges.weightDistribution!.max,
    severity: getSeverity(Math.abs(weightDelta), 0.05, 0.1, 0.15),
  });

  // Compare body stackedness
  const stackDelta = riderMetrics.bodyStackedness - referenceMetrics.bodyStackedness;
  const stackPercent = (stackDelta / referenceMetrics.bodyStackedness) * 100;
  deltas.push({
    metric: 'bodyStackedness',
    referenceValue: referenceMetrics.bodyStackedness,
    riderValue: riderMetrics.bodyStackedness,
    delta: stackDelta,
    percentDifference: stackPercent,
    isDeviation:
      riderMetrics.bodyStackedness < ranges.bodyStackedness!.min ||
      riderMetrics.bodyStackedness > ranges.bodyStackedness!.max,
    severity: getSeverity(Math.abs(stackDelta), 5, 15, 25),
  });

  // Compare ankle height difference (symmetry)
  const ankleHeightDelta =
    riderMetrics.ankleHeightDifference - referenceMetrics.ankleHeightDifference;
  deltas.push({
    metric: 'ankleHeightSymmetry',
    referenceValue: referenceMetrics.ankleHeightDifference,
    riderValue: riderMetrics.ankleHeightDifference,
    delta: ankleHeightDelta,
    percentDifference: (ankleHeightDelta / (referenceMetrics.ankleHeightDifference || 0.01)) * 100,
    isDeviation: Math.abs(riderMetrics.ankleHeightDifference) > 0.1,
    severity: getSeverity(Math.abs(ankleHeightDelta), 0.03, 0.08, 0.15),
  });

  return deltas;
}

/**
 * Determine severity based on delta magnitude
 */
function getSeverity(
  delta: number,
  minorThreshold: number,
  moderateThreshold: number,
  criticalThreshold: number
): 'none' | 'minor' | 'moderate' | 'critical' {
  if (delta < minorThreshold) return 'none';
  if (delta < moderateThreshold) return 'minor';
  if (delta < criticalThreshold) return 'moderate';
  return 'critical';
}

/**
 * Generate coaching feedback from stacked position deltas
 */
export function generateStackedPositionFeedback(deltas: StackedPositionDelta[]): string[] {
  const feedback: string[] = [];

  for (const delta of deltas) {
    if (!delta.isDeviation) continue;

    switch (delta.metric) {
      case 'kneeAngle':
        if (delta.delta < -5) {
          feedback.push('Your knees are too straight. Bend them more to maintain a stacked position.');
        } else if (delta.delta > 5) {
          feedback.push('Your knees are too bent. Straighten them slightly for better balance.');
        }
        break;

      case 'hipForwardBias':
        if (delta.delta < -0.05) {
          feedback.push('Your hips are too far back. Move them forward over your feet.');
        } else if (delta.delta > 0.05) {
          feedback.push('Your hips are too far forward. Bring them back slightly.');
        }
        break;

      case 'weightDistribution':
        if (delta.delta < -0.05) {
          feedback.push('Your weight is too far back. Shift it forward to the front foot.');
        } else if (delta.delta > 0.05) {
          feedback.push('Your weight is too far forward. Balance it more evenly.');
        }
        break;

      case 'bodyStackedness':
        if (delta.delta < -10) {
          feedback.push('Your upper body is too open. Stack your shoulders over your hips.');
        } else if (delta.delta > 10) {
          feedback.push('Your body is too stacked. Open up slightly for better control.');
        }
        break;

      case 'ankleHeightSymmetry':
        if (Math.abs(delta.delta) > 0.08) {
          feedback.push('Your feet are landing at different heights. Land more symmetrically.');
        }
        break;
    }
  }

  return feedback;
}

/**
 * Calculate average stacked position metrics across multiple frames
 */
export function calculateAverageStackedPosition(frames: PoseFrame[]): StackedPositionMetrics {
  if (frames.length === 0) {
    return {
      leftKneeAngle: 0,
      rightKneeAngle: 0,
      kneeAngleAverage: 0,
      hipForwardBias: 0,
      stanceWidth: 0,
      bodyStackedness: 0,
      weightDistribution: 0.5,
      ankleHeightDifference: 0,
      overallStackedness: 0,
    };
  }

  const allMetrics = frames.map((f) => extractStackedPositionMetrics(f));

  return {
    leftKneeAngle: allMetrics.reduce((sum, m) => sum + m.leftKneeAngle, 0) / frames.length,
    rightKneeAngle: allMetrics.reduce((sum, m) => sum + m.rightKneeAngle, 0) / frames.length,
    kneeAngleAverage: allMetrics.reduce((sum, m) => sum + m.kneeAngleAverage, 0) / frames.length,
    hipForwardBias: allMetrics.reduce((sum, m) => sum + m.hipForwardBias, 0) / frames.length,
    stanceWidth: allMetrics.reduce((sum, m) => sum + m.stanceWidth, 0) / frames.length,
    bodyStackedness: allMetrics.reduce((sum, m) => sum + m.bodyStackedness, 0) / frames.length,
    weightDistribution:
      allMetrics.reduce((sum, m) => sum + m.weightDistribution, 0) / frames.length,
    ankleHeightDifference:
      allMetrics.reduce((sum, m) => sum + m.ankleHeightDifference, 0) / frames.length,
    overallStackedness:
      allMetrics.reduce((sum, m) => sum + m.overallStackedness, 0) / frames.length,
  };
}
