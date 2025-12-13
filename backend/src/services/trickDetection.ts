import logger from '../logger';
import { PoseKeypoint, BiomechanicalMetrics } from '../types';
import { PoseEstimationService } from './poseEstimation';

export interface TrickDetectionResult {
  trickName: string;
  rotationDirection: 'frontside' | 'backside';
  confidence: number;
  rotationCount: number;
  estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
}

/**
 * Trick Detection Service
 * Analyzes pose sequences to identify the trick being performed
 */
export class TrickDetectionService {
  /**
   * Detect trick from pose sequence
   */
  static detectTrick(poseSequence: Array<{ keypoints: PoseKeypoint[]; frameNumber: number }>): TrickDetectionResult {
    logger.info(`Detecting trick from pose sequence: ${poseSequence.length} frames`);

    // Analyze rotation
    const rotationAnalysis = this.analyzeRotation(poseSequence);
    const rotationCount = rotationAnalysis.rotationCount;
    const rotationDirection = rotationAnalysis.direction;

    // Analyze body position and style
    const styleAnalysis = this.analyzeStyle(poseSequence);

    // Determine trick name based on rotation count and style
    const trickName = this.determineTrickName(rotationCount, styleAnalysis);

    // Estimate difficulty
    const difficulty = this.estimateDifficulty(rotationCount, styleAnalysis);

    const result: TrickDetectionResult = {
      trickName,
      rotationDirection,
      confidence: rotationAnalysis.confidence,
      rotationCount,
      estimatedDifficulty: difficulty,
      description: this.generateDescription(trickName, rotationCount, rotationDirection, styleAnalysis)
    };

    logger.info(`Trick detected: ${trickName} (${rotationCount} rotations, ${rotationDirection})`, {
      trickName,
      rotationCount,
      rotationDirection,
      confidence: result.confidence,
      difficulty
    });

    return result;
  }

  /**
   * Analyze rotation from pose sequence
   */
  private static analyzeRotation(poseSequence: Array<{ keypoints: PoseKeypoint[]; frameNumber: number }>) {
    let totalRotation = 0;
    let rotationDirection: 'frontside' | 'backside' = 'frontside';
    let confidence = 0.5;

    if (poseSequence.length < 2) {
      return { rotationCount: 0, direction: rotationDirection, confidence };
    }

    // Track shoulder rotation across frames
    const shoulderAngles: number[] = [];

    for (let i = 0; i < poseSequence.length; i++) {
      const keypoints = poseSequence[i].keypoints;
      const leftShoulder = PoseEstimationService.getKeypointByName(keypoints, 'left_shoulder');
      const rightShoulder = PoseEstimationService.getKeypointByName(keypoints, 'right_shoulder');
      const nose = PoseEstimationService.getKeypointByName(keypoints, 'nose');

      if (leftShoulder && rightShoulder && nose) {
        // Calculate shoulder angle relative to vertical
        const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
        
        const angle = Math.atan2(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y) * (180 / Math.PI);
        shoulderAngles.push(angle);
      }
    }

    // Calculate total rotation from angle changes
    if (shoulderAngles.length > 1) {
      for (let i = 1; i < shoulderAngles.length; i++) {
        let angleDiff = shoulderAngles[i] - shoulderAngles[i - 1];
        
        // Handle wraparound
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        totalRotation += angleDiff;
      }

      // Determine rotation direction from total rotation
      rotationDirection = totalRotation > 0 ? 'frontside' : 'backside';
      
      // Calculate rotation count (360 degrees = 1 rotation)
      const rotationCount = Math.abs(totalRotation) / 360;
      confidence = Math.min(0.95, 0.5 + (shoulderAngles.length / 100));

      return {
        rotationCount,
        direction: rotationDirection,
        confidence,
        totalRotation
      };
    }

    return { rotationCount: 0, direction: rotationDirection, confidence };
  }

  /**
   * Analyze style elements (grabs, tweaks, etc.)
   */
  private static analyzeStyle(poseSequence: Array<{ keypoints: PoseKeypoint[]; frameNumber: number }>) {
    const styleElements = {
      hasGrab: false,
      grabType: 'none' as 'none' | 'indy' | 'melon' | 'tail' | 'nose',
      isTweaked: false,
      hasSpinAxis: 'vertical' as 'vertical' | 'forward_lean' | 'backward_lean' | 'sideways_lean',
      isBlind: false
    };

    // Analyze for grabs (hand near board)
    for (const frame of poseSequence) {
      const keypoints = frame.keypoints;
      const leftHand = PoseEstimationService.getKeypointByName(keypoints, 'left_wrist');
      const rightHand = PoseEstimationService.getKeypointByName(keypoints, 'right_wrist');
      const leftHip = PoseEstimationService.getKeypointByName(keypoints, 'left_hip');
      const rightHip = PoseEstimationService.getKeypointByName(keypoints, 'right_hip');

      if (leftHand && rightHand && leftHip && rightHip) {
        const hipMidY = (leftHip.y + rightHip.y) / 2;
        
        // Check if hand is near hip level (grab position)
        if (Math.abs(leftHand.y - hipMidY) < 50 || Math.abs(rightHand.y - hipMidY) < 50) {
          styleElements.hasGrab = true;
          styleElements.grabType = 'indy'; // Default to indy, could be refined
        }
      }
    }

    // Analyze for tweaks (body lean)
    const bodyLeans = this.analyzeBodyLean(poseSequence);
    if (bodyLeans.maxLean > 30) {
      styleElements.isTweaked = true;
      styleElements.hasSpinAxis = bodyLeans.leanDirection;
    }

    return styleElements;
  }

  /**
   * Analyze body lean for tweaks
   */
  private static analyzeBodyLean(poseSequence: Array<{ keypoints: PoseKeypoint[]; frameNumber: number }>) {
    let maxLean = 0;
    let leanDirection: 'vertical' | 'forward_lean' | 'backward_lean' | 'sideways_lean' = 'vertical';

    for (const frame of poseSequence) {
      const keypoints = frame.keypoints;
      const leftShoulder = PoseEstimationService.getKeypointByName(keypoints, 'left_shoulder');
      const rightShoulder = PoseEstimationService.getKeypointByName(keypoints, 'right_shoulder');
      const leftHip = PoseEstimationService.getKeypointByName(keypoints, 'left_hip');
      const rightHip = PoseEstimationService.getKeypointByName(keypoints, 'right_hip');
      const nose = PoseEstimationService.getKeypointByName(keypoints, 'nose');

      if (leftShoulder && rightShoulder && leftHip && rightHip && nose) {
        const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
        const hipMidX = (leftHip.x + rightHip.x) / 2;
        const hipMidY = (leftHip.y + rightHip.y) / 2;

        // Calculate forward/backward lean
        const forwardLean = Math.abs(shoulderMidY - hipMidY);
        
        // Calculate sideways lean
        const sidewaysLean = Math.abs(shoulderMidX - hipMidX);

        const totalLean = Math.sqrt(forwardLean * forwardLean + sidewaysLean * sidewaysLean);

        if (totalLean > maxLean) {
          maxLean = totalLean;
          
          if (forwardLean > sidewaysLean) {
            leanDirection = shoulderMidY < hipMidY ? 'forward_lean' : 'backward_lean';
          } else {
            leanDirection = 'sideways_lean';
          }
        }
      }
    }

    return { maxLean, leanDirection };
  }

  /**
   * Determine trick name from rotation count and style
   */
  private static determineTrickName(rotationCount: number, style: any): string {
    const baseRotations = Math.round(rotationCount);

    const trickMap: { [key: number]: string } = {
      0: 'Ollie',
      1: '180',
      2: '360',
      3: '540',
      4: '720',
      5: '900',
      6: '1080',
      7: '1260',
      8: '1440'
    };

    let trickName = trickMap[baseRotations] || `${baseRotations * 180}°`;

    // Add style modifiers
    if (style.hasGrab) {
      trickName += ` ${style.grabType}`;
    }

    if (style.isTweaked) {
      trickName += ' Tweaked';
    }

    if (style.isBlind) {
      trickName += ' Blind';
    }

    return trickName;
  }

  /**
   * Estimate difficulty based on trick complexity
   */
  private static estimateDifficulty(rotationCount: number, style: any): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    let difficultyScore = rotationCount;

    if (style.hasGrab) difficultyScore += 0.5;
    if (style.isTweaked) difficultyScore += 0.5;
    if (style.isBlind) difficultyScore += 1;

    if (difficultyScore < 1) return 'beginner';
    if (difficultyScore < 2) return 'intermediate';
    if (difficultyScore < 4) return 'advanced';
    return 'expert';
  }

  /**
   * Generate human-readable description
   */
  private static generateDescription(
    trickName: string,
    rotationCount: number,
    rotationDirection: string,
    style: any
  ): string {
    let description = `${trickName} - ${rotationDirection} rotation`;

    if (rotationCount > 0) {
      description += ` (${rotationCount.toFixed(1)} rotations)`;
    }

    if (style.hasGrab) {
      description += ` with ${style.grabType} grab`;
    }

    if (style.isTweaked) {
      description += ` tweaked ${style.hasSpinAxis}`;
    }

    return description;
  }
}
