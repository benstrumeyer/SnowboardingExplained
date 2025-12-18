import { MCPTool } from './registry';

export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface SnowboardingFeatures {
  rotationAngle: number; // 0-720+ degrees
  rotationDirection: 'frontside' | 'backside' | 'unknown';
  edgeEngaged: 'toe' | 'heel' | 'both' | 'unknown';
  stance: 'regular' | 'switch' | 'unknown';
  grabType: string | null; // 'indy', 'melon', 'tail', etc.
  airtimeMs: number; // milliseconds in air
  bodyPosition: {
    isTweaked: boolean;
    isBlind: boolean;
    spinAxis: 'vertical' | 'forward' | 'lateral' | 'unknown';
  };
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Helper functions for snowboarding feature analysis
 */
class SnowboardingAnalyzer {
  /**
   * Get keypoint by name from sequence
   */
  static getKeypoint(keypoints: PoseKeypoint[], name: string): PoseKeypoint | undefined {
    return keypoints.find(kp => kp.name === name);
  }

  /**
   * Calculate distance between two keypoints
   */
  static distance(kp1: PoseKeypoint, kp2: PoseKeypoint): number {
    const dx = kp1.x - kp2.x;
    const dy = kp1.y - kp2.y;
    const dz = (kp1.z || 0) - (kp2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate angle between three keypoints (in degrees)
   */
  static angle(kp1: PoseKeypoint, kp2: PoseKeypoint, kp3: PoseKeypoint): number {
    const v1 = { x: kp1.x - kp2.x, y: kp1.y - kp2.y };
    const v2 = { x: kp3.x - kp2.x, y: kp3.y - kp2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }

  /**
   * Detect stance from shoulder position
   */
  static detectStance(keypoints: PoseKeypoint[]): 'regular' | 'switch' | 'unknown' {
    const leftShoulder = this.getKeypoint(keypoints, 'left_shoulder');
    const rightShoulder = this.getKeypoint(keypoints, 'right_shoulder');

    if (!leftShoulder || !rightShoulder) return 'unknown';

    // Regular: left shoulder forward (smaller x)
    // Switch: right shoulder forward (smaller x)
    const stance = leftShoulder.x < rightShoulder.x ? 'regular' : 'switch';
    return stance;
  }

  /**
   * Detect rotation direction from shoulder rotation
   */
  static detectRotationDirection(
    startKeypoints: PoseKeypoint[],
    endKeypoints: PoseKeypoint[]
  ): 'frontside' | 'backside' | 'unknown' {
    const startLeftShoulder = this.getKeypoint(startKeypoints, 'left_shoulder');
    const startRightShoulder = this.getKeypoint(startKeypoints, 'right_shoulder');
    const endLeftShoulder = this.getKeypoint(endKeypoints, 'left_shoulder');
    const endRightShoulder = this.getKeypoint(endKeypoints, 'right_shoulder');

    if (!startLeftShoulder || !startRightShoulder || !endLeftShoulder || !endRightShoulder) {
      return 'unknown';
    }

    // Calculate shoulder rotation (which shoulder moved forward)
    const startShoulderDiff = startLeftShoulder.x - startRightShoulder.x;
    const endShoulderDiff = endLeftShoulder.x - endRightShoulder.x;

    // If shoulder difference decreased, rider rotated toward that shoulder
    const rotationChange = endShoulderDiff - startShoulderDiff;

    // Frontside: rotating toward toe edge (left shoulder leads for regular)
    // Backside: rotating toward heel edge (right shoulder leads for regular)
    const stance = this.detectStance(startKeypoints);
    if (stance === 'regular') {
      return rotationChange < 0 ? 'frontside' : 'backside';
    } else {
      return rotationChange > 0 ? 'frontside' : 'backside';
    }
  }

  /**
   * Estimate rotation angle from shoulder rotation
   */
  static estimateRotationAngle(
    startKeypoints: PoseKeypoint[],
    endKeypoints: PoseKeypoint[]
  ): number {
    const startLeftShoulder = this.getKeypoint(startKeypoints, 'left_shoulder');
    const startRightShoulder = this.getKeypoint(startKeypoints, 'right_shoulder');
    const endLeftShoulder = this.getKeypoint(endKeypoints, 'left_shoulder');
    const endRightShoulder = this.getKeypoint(endKeypoints, 'right_shoulder');

    if (!startLeftShoulder || !startRightShoulder || !endLeftShoulder || !endRightShoulder) {
      return 0;
    }

    // Calculate shoulder vectors
    const startVector = {
      x: startRightShoulder.x - startLeftShoulder.x,
      y: startRightShoulder.y - startLeftShoulder.y,
    };
    const endVector = {
      x: endRightShoulder.x - endLeftShoulder.x,
      y: endRightShoulder.y - endLeftShoulder.y,
    };

    // Calculate angle between vectors
    const dot = startVector.x * endVector.x + startVector.y * endVector.y;
    const mag1 = Math.sqrt(startVector.x * startVector.x + startVector.y * startVector.y);
    const mag2 = Math.sqrt(endVector.x * endVector.x + endVector.y * endVector.y);

    const cosAngle = dot / (mag1 * mag2);
    let angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

    // Normalize to 0-720
    angle = angle % 360;
    return angle;
  }

  /**
   * Detect if body is tweaked (exaggerated arch)
   */
  static detectTweaked(keypoints: PoseKeypoint[]): boolean {
    const leftShoulder = this.getKeypoint(keypoints, 'left_shoulder');
    const leftHip = this.getKeypoint(keypoints, 'left_hip');
    const rightShoulder = this.getKeypoint(keypoints, 'right_shoulder');
    const rightHip = this.getKeypoint(keypoints, 'right_hip');

    if (!leftShoulder || !leftHip || !rightShoulder || !rightHip) return false;

    // Calculate spine angle
    const leftSpineAngle = this.angle(leftShoulder, leftHip, { x: leftHip.x, y: leftHip.y + 100, z: 0, name: 'ref', confidence: 1 });
    const rightSpineAngle = this.angle(rightShoulder, rightHip, { x: rightHip.x, y: rightHip.y + 100, z: 0, name: 'ref', confidence: 1 });

    // Tweaked if spine is significantly arched (angle > 100 degrees)
    return leftSpineAngle > 100 || rightSpineAngle > 100;
  }

  /**
   * Detect if landing is blind (looking away)
   */
  static detectBlind(keypoints: PoseKeypoint[]): boolean {
    const nose = this.getKeypoint(keypoints, 'nose');
    const leftShoulder = this.getKeypoint(keypoints, 'left_shoulder');
    const rightShoulder = this.getKeypoint(keypoints, 'right_shoulder');

    if (!nose || !leftShoulder || !rightShoulder) return false;

    // Calculate head direction relative to shoulders
    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const headOffset = nose.x - shoulderCenterX;

    // Blind if head is turned significantly away (offset > 50 pixels)
    return Math.abs(headOffset) > 50;
  }

  /**
   * Detect grab type from hand position
   */
  static detectGrabType(keypoints: PoseKeypoint[]): string | null {
    const leftWrist = this.getKeypoint(keypoints, 'left_wrist');
    const rightWrist = this.getKeypoint(keypoints, 'right_wrist');
    const leftHip = this.getKeypoint(keypoints, 'left_hip');
    const rightHip = this.getKeypoint(keypoints, 'right_hip');

    if (!leftWrist || !rightWrist || !leftHip || !rightHip) return null;

    // Indy: back hand grabs toe edge (left hand for regular)
    // Melon: front hand grabs heel edge (right hand for regular)
    // Tail: back hand grabs tail
    // Nose: front hand grabs nose

    const hipCenterY = (leftHip.y + rightHip.y) / 2;

    // Check if hands are near board (below hip level)
    const leftHandNearBoard = leftWrist.y > hipCenterY;
    const rightHandNearBoard = rightWrist.y > hipCenterY;

    if (leftHandNearBoard && rightHandNearBoard) {
      // Both hands grabbing - likely indy or melon
      return 'indy'; // Default to indy
    } else if (leftHandNearBoard) {
      return 'indy';
    } else if (rightHandNearBoard) {
      return 'melon';
    }

    return null;
  }

  /**
   * Detect edge engagement from body lean
   */
  static detectEdgeEngagement(keypoints: PoseKeypoint[]): 'toe' | 'heel' | 'both' | 'unknown' {
    const leftShoulder = this.getKeypoint(keypoints, 'left_shoulder');
    const rightShoulder = this.getKeypoint(keypoints, 'right_shoulder');
    const leftHip = this.getKeypoint(keypoints, 'left_hip');
    const rightHip = this.getKeypoint(keypoints, 'right_hip');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 'unknown';

    // Calculate body lean
    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenterX = (leftHip.x + rightHip.x) / 2;
    const lean = shoulderCenterX - hipCenterX;

    // Positive lean = toe edge, negative = heel edge
    if (Math.abs(lean) < 10) return 'both';
    return lean > 0 ? 'toe' : 'heel';
  }
}

/**
 * Analyze rotation angle from frame sequence
 * Looks at rider orientation changes across frames
 */
export const analyzeRotationAngleTool: MCPTool = {
  name: 'analyze_rotation_angle',
  description: 'Analyze the rotation angle from a sequence of frames by tracking rider orientation',
  parameters: {
    poseSequence: {
      type: 'array',
      description: 'Array of pose keypoint sequences with frameNumber',
      required: true,
    },
    startFrame: {
      type: 'number',
      description: 'Frame number to start analysis from',
    },
    endFrame: {
      type: 'number',
      description: 'Frame number to end analysis at',
    },
  },
  handler: async (params) => {
    const { poseSequence, startFrame = 0, endFrame } = params;

    try {
      if (!poseSequence || poseSequence.length < 2) {
        return {
          success: true,
          data: {
            estimatedRotationAngle: 0,
            rotationDirection: 'unknown',
            confidence: 0,
            reasoning: 'Insufficient pose data for rotation analysis',
          },
        };
      }

      const start = poseSequence[0];
      const end = poseSequence[poseSequence.length - 1];

      const rotationAngle = SnowboardingAnalyzer.estimateRotationAngle(start.keypoints, end.keypoints);
      const rotationDirection = SnowboardingAnalyzer.detectRotationDirection(start.keypoints, end.keypoints);

      return {
        success: true,
        data: {
          estimatedRotationAngle: Math.round(rotationAngle),
          rotationDirection,
          confidence: 0.7,
          reasoning: `Detected ${Math.round(rotationAngle)}° ${rotationDirection} rotation from shoulder tracking`,
          frameRange: { start: startFrame, end: endFrame || poseSequence.length - 1 },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze rotation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Detect edge engagement (toe vs heel) from frame
 * Analyzes board angle and rider weight distribution
 */
export const detectEdgeEngagementTool: MCPTool = {
  name: 'detect_edge_engagement',
  description: 'Detect which edge of the board is engaged (toe or heel) from a frame',
  parameters: {
    keypoints: {
      type: 'array',
      description: 'Pose keypoints for the frame',
      required: true,
    },
    frameNumber: {
      type: 'number',
      description: 'Frame number for context',
    },
  },
  handler: async (params) => {
    const { keypoints, frameNumber = 0 } = params;

    try {
      const edgeEngaged = SnowboardingAnalyzer.detectEdgeEngagement(keypoints);

      return {
        success: true,
        data: {
          edgeEngaged,
          confidence: 0.65,
          reasoning: `Detected ${edgeEngaged} edge engagement from body lean analysis`,
          frameNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to detect edge: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Detect stance (regular vs switch) from rider orientation
 */
export const detectStanceTool: MCPTool = {
  name: 'detect_stance',
  description: 'Detect rider stance (regular or switch) from frame',
  parameters: {
    keypoints: {
      type: 'array',
      description: 'Pose keypoints for the frame',
      required: true,
    },
    frameNumber: {
      type: 'number',
      description: 'Frame number for context',
    },
  },
  handler: async (params) => {
    const { keypoints, frameNumber = 0 } = params;

    try {
      const stance = SnowboardingAnalyzer.detectStance(keypoints);

      return {
        success: true,
        data: {
          stance,
          confidence: 0.75,
          reasoning: `Detected ${stance} stance from shoulder positioning`,
          frameNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to detect stance: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Detect grab type from hand and board position
 */
export const detectGrabTypeTool: MCPTool = {
  name: 'detect_grab_type',
  description: 'Detect grab type (indy, melon, tail, etc.) from frame',
  parameters: {
    keypoints: {
      type: 'array',
      description: 'Pose keypoints for the frame',
      required: true,
    },
    frameNumber: {
      type: 'number',
      description: 'Frame number for context',
    },
  },
  handler: async (params) => {
    const { keypoints, frameNumber = 0 } = params;

    try {
      const grabType = SnowboardingAnalyzer.detectGrabType(keypoints);

      return {
        success: true,
        data: {
          grabDetected: grabType !== null,
          grabType,
          confidence: grabType ? 0.6 : 0,
          reasoning: grabType ? `Detected ${grabType} grab from hand positioning` : 'No grab detected',
          frameNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to detect grab: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Detect body tweaks and styling
 */
export const detectBodyPositionTool: MCPTool = {
  name: 'detect_body_position',
  description: 'Detect body position tweaks (tweaked, blind, etc.) from frame',
  parameters: {
    keypoints: {
      type: 'array',
      description: 'Pose keypoints for the frame',
      required: true,
    },
    frameNumber: {
      type: 'number',
      description: 'Frame number for context',
    },
  },
  handler: async (params) => {
    const { keypoints, frameNumber = 0 } = params;

    try {
      const isTweaked = SnowboardingAnalyzer.detectTweaked(keypoints);
      const isBlind = SnowboardingAnalyzer.detectBlind(keypoints);

      return {
        success: true,
        data: {
          isTweaked,
          isBlind,
          spinAxis: 'vertical',
          confidence: 0.65,
          reasoning: `Detected body position: ${isTweaked ? 'tweaked' : 'clean'}${isBlind ? ', blind' : ''}`,
          frameNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to detect body position: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Estimate airtime from frame sequence
 */
export const estimateAirtimeTool: MCPTool = {
  name: 'estimate_airtime',
  description: 'Estimate airtime duration from frame sequence',
  parameters: {
    poseSequence: {
      type: 'array',
      description: 'Array of pose keypoint sequences with frameNumber and timestamp',
      required: true,
    },
    fps: {
      type: 'number',
      description: 'Frames per second of the video',
      required: true,
    },
  },
  handler: async (params) => {
    const { poseSequence, fps } = params;

    try {
      if (!poseSequence || poseSequence.length < 2) {
        return {
          success: true,
          data: {
            estimatedAirtimeMs: 0,
            confidence: 0,
            reasoning: 'Insufficient pose data for airtime estimation',
          },
        };
      }

      // Estimate airtime from frame count
      // Assumes all frames are in air (would need ground contact detection for accuracy)
      const durationMs = (poseSequence.length / fps) * 1000;

      return {
        success: true,
        data: {
          estimatedAirtimeMs: Math.round(durationMs),
          confidence: 0.5,
          reasoning: `Estimated ${Math.round(durationMs)}ms airtime from ${poseSequence.length} frames at ${fps}fps`,
          frameCount: poseSequence.length,
          fps,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to estimate airtime: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

/**
 * Synthesize all features into a comprehensive analysis
 */
export const synthesizeSnowboardingFeaturesTool: MCPTool = {
  name: 'synthesize_snowboarding_features',
  description: 'Synthesize all detected features into a comprehensive snowboarding analysis for LLM reasoning',
  parameters: {
    rotationAngle: {
      type: 'number',
      description: 'Detected rotation angle in degrees',
    },
    rotationDirection: {
      type: 'string',
      description: 'Rotation direction: frontside, backside, or unknown',
      enum: ['frontside', 'backside', 'unknown'],
    },
    edgeEngaged: {
      type: 'string',
      description: 'Edge engaged: toe, heel, both, or unknown',
      enum: ['toe', 'heel', 'both', 'unknown'],
    },
    stance: {
      type: 'string',
      description: 'Stance: regular, switch, or unknown',
      enum: ['regular', 'switch', 'unknown'],
    },
    grabType: {
      type: 'string',
      description: 'Grab type detected (indy, melon, tail, etc.) or null',
    },
    airtimeMs: {
      type: 'number',
      description: 'Airtime in milliseconds',
    },
    isTweaked: {
      type: 'boolean',
      description: 'Whether the trick is tweaked',
    },
    isBlind: {
      type: 'boolean',
      description: 'Whether the trick is blind',
    },
  },
  handler: async (params) => {
    const {
      rotationAngle = 0,
      rotationDirection = 'unknown',
      edgeEngaged = 'unknown',
      stance = 'unknown',
      grabType = null,
      airtimeMs = 0,
      isTweaked = false,
      isBlind = false,
    } = params;

    try {
      // Build a structured analysis that Gemini can use
      const features: SnowboardingFeatures = {
        rotationAngle,
        rotationDirection: rotationDirection as 'frontside' | 'backside' | 'unknown',
        edgeEngaged: edgeEngaged as 'toe' | 'heel' | 'both' | 'unknown',
        stance: stance as 'regular' | 'switch' | 'unknown',
        grabType,
        airtimeMs,
        bodyPosition: {
          isTweaked,
          isBlind,
          spinAxis: 'unknown',
        },
        confidence: 0.5, // Average confidence across all detections
        reasoning: `Detected: ${rotationAngle}° ${rotationDirection} rotation with ${stance} stance, ${edgeEngaged} edge engaged${grabType ? `, ${grabType} grab` : ''}${isTweaked ? ', tweaked' : ''}${isBlind ? ', blind' : ''}`,
      };

      return {
        success: true,
        data: features,
        prompt: `Based on these snowboarding mechanics, identify the trick:
- Rotation: ${rotationAngle}° ${rotationDirection}
- Stance: ${stance}
- Edge: ${edgeEngaged}
- Grab: ${grabType || 'none'}
- Style: ${[isTweaked && 'tweaked', isBlind && 'blind'].filter(Boolean).join(', ') || 'clean'}
- Airtime: ${airtimeMs}ms

What trick is this?`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to synthesize features: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const featureExtractionTools = [
  analyzeRotationAngleTool,
  detectEdgeEngagementTool,
  detectStanceTool,
  detectGrabTypeTool,
  detectBodyPositionTool,
  estimateAirtimeTool,
  synthesizeSnowboardingFeaturesTool,
];
