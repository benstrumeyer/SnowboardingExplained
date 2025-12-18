/**
 * Analysis Log Service
 * Tracks MCP tool calls, state transitions, and generates analysis reports
 */

import { PoseFrame, Keypoint } from './pythonPoseService';
import logger from '../logger';

export interface MCPToolCall {
  toolName: string;
  frameNumber: number;
  parameters: Record<string, any>;
  result: Record<string, any>;
  confidence: number;
  timestamp: number;
  processingTimeMs: number;
}

export interface StateTransition {
  fromPhase: string;
  toPhase: string;
  frameNumber: number;
  timestamp: number;
  confidence: number;
}

export interface PhaseAnalysis {
  phase: string;
  frameRange: { start: number; end: number };
  keyFindings: string[];
  mcpToolResults: Record<string, any>;
}

export interface AnalysisLog {
  mcpToolCalls: MCPToolCall[];
  stateTransitions: StateTransition[];
  phaseAnalysis: PhaseAnalysis[];
  summary: string;
  totalProcessingTimeMs: number;
}

export interface FrameAnalysis {
  frameNumber: number;
  timestamp: number;
  phase: string;
  toolResults: Record<string, any>;
  confidence: number;
}

/**
 * Analysis Log Builder
 * Collects tool calls and generates analysis reports
 */
export class AnalysisLogBuilder {
  private toolCalls: MCPToolCall[] = [];
  private transitions: StateTransition[] = [];
  private startTime: number;
  private currentPhase: string = 'unknown';
  
  constructor() {
    this.startTime = Date.now();
  }
  
  /**
   * Log an MCP tool call
   */
  logToolCall(
    toolName: string,
    frameNumber: number,
    parameters: Record<string, any>,
    result: Record<string, any>,
    confidence: number = 1.0,
    processingTimeMs: number = 0
  ): void {
    this.toolCalls.push({
      toolName,
      frameNumber,
      parameters,
      result,
      confidence,
      timestamp: Date.now(),
      processingTimeMs,
    });
    
    logger.info(`[ANALYSIS] Tool call: ${toolName}`, {
      frameNumber,
      result,
      confidence,
    });
  }
  
  /**
   * Track a phase transition
   */
  trackTransition(
    fromPhase: string,
    toPhase: string,
    frameNumber: number,
    timestamp: number,
    confidence: number = 1.0
  ): void {
    this.transitions.push({
      fromPhase,
      toPhase,
      frameNumber,
      timestamp,
      confidence,
    });
    
    this.currentPhase = toPhase;
    
    logger.info(`[ANALYSIS] Phase transition: ${fromPhase} → ${toPhase}`, {
      frameNumber,
      timestamp,
      confidence,
    });
  }
  
  /**
   * Get current phase
   */
  getCurrentPhase(): string {
    return this.currentPhase;
  }
  
  /**
   * Generate phase analysis from tool calls
   */
  private generatePhaseAnalysis(): PhaseAnalysis[] {
    const phases: PhaseAnalysis[] = [];
    
    // Group tool calls by detected phase
    const phaseGroups = new Map<string, MCPToolCall[]>();
    
    for (const call of this.toolCalls) {
      if (call.toolName === 'detect_phase_transition' && call.result.phase) {
        const phase = call.result.phase;
        if (!phaseGroups.has(phase)) {
          phaseGroups.set(phase, []);
        }
        phaseGroups.get(phase)!.push(call);
      }
    }
    
    // If no phase detection, create a single "unknown" phase
    if (phaseGroups.size === 0) {
      const allFrames = this.toolCalls.map(c => c.frameNumber);
      const minFrame = Math.min(...allFrames, 0);
      const maxFrame = Math.max(...allFrames, 0);
      
      phases.push({
        phase: 'unknown',
        frameRange: { start: minFrame, end: maxFrame },
        keyFindings: this.extractKeyFindings(this.toolCalls),
        mcpToolResults: this.aggregateToolResults(this.toolCalls),
      });
    } else {
      // Create phase analysis for each detected phase
      for (const [phase, calls] of phaseGroups) {
        const frames = calls.map(c => c.frameNumber);
        phases.push({
          phase,
          frameRange: { start: Math.min(...frames), end: Math.max(...frames) },
          keyFindings: this.extractKeyFindings(calls),
          mcpToolResults: this.aggregateToolResults(calls),
        });
      }
    }
    
    return phases;
  }
  
  /**
   * Extract key findings from tool calls
   */
  private extractKeyFindings(calls: MCPToolCall[]): string[] {
    const findings: string[] = [];
    
    for (const call of calls) {
      switch (call.toolName) {
        case 'detect_stance':
          findings.push(`Stance: ${call.result.stance || call.result}`);
          break;
        case 'detect_edge':
          findings.push(`Edge: ${call.result.edge || call.result}`);
          break;
        case 'measure_leg_bend':
          if (call.result.averageBend !== undefined) {
            findings.push(`Leg bend: ${call.result.averageBend.toFixed(1)}°`);
          }
          break;
        case 'detect_body_stack':
          if (call.result.isStacked !== undefined) {
            findings.push(`Body stack: ${call.result.isStacked ? 'stacked' : 'not stacked'}`);
          }
          break;
        case 'detect_upper_body_rotation':
          if (call.result.rotation) {
            findings.push(`Upper body: ${call.result.rotation}`);
          }
          break;
      }
    }
    
    return [...new Set(findings)]; // Remove duplicates
  }
  
  /**
   * Aggregate tool results by tool name
   */
  private aggregateToolResults(calls: MCPToolCall[]): Record<string, any> {
    const results: Record<string, any> = {};
    
    for (const call of calls) {
      if (!results[call.toolName]) {
        results[call.toolName] = [];
      }
      results[call.toolName].push({
        frameNumber: call.frameNumber,
        result: call.result,
        confidence: call.confidence,
      });
    }
    
    return results;
  }
  
  /**
   * Generate summary text
   */
  private generateSummary(): string {
    const lines: string[] = [];
    
    lines.push(`Analysis completed in ${Date.now() - this.startTime}ms`);
    lines.push(`Total tool calls: ${this.toolCalls.length}`);
    lines.push(`Phase transitions: ${this.transitions.length}`);
    
    // Summarize key findings
    const stanceCalls = this.toolCalls.filter(c => c.toolName === 'detect_stance');
    if (stanceCalls.length > 0) {
      const stance = stanceCalls[0].result.stance || stanceCalls[0].result;
      lines.push(`Detected stance: ${stance}`);
    }
    
    const edgeCalls = this.toolCalls.filter(c => c.toolName === 'detect_edge');
    if (edgeCalls.length > 0) {
      const edges = edgeCalls.map(c => c.result.edge || c.result);
      const uniqueEdges = [...new Set(edges)];
      lines.push(`Edge usage: ${uniqueEdges.join(', ')}`);
    }
    
    if (this.transitions.length > 0) {
      const phases = this.transitions.map(t => t.toPhase);
      lines.push(`Phases detected: ${[...new Set(phases)].join(' → ')}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Build the final analysis log
   */
  build(): AnalysisLog {
    return {
      mcpToolCalls: this.toolCalls,
      stateTransitions: this.transitions,
      phaseAnalysis: this.generatePhaseAnalysis(),
      summary: this.generateSummary(),
      totalProcessingTimeMs: Date.now() - this.startTime,
    };
  }
}

/**
 * Analyze a single frame and return per-frame analysis
 */
export function analyzeFrame(
  poseFrame: PoseFrame,
  timestamp: number,
  analysisLog: AnalysisLogBuilder
): FrameAnalysis {
  const toolResults: Record<string, any> = {};
  const startTime = Date.now();
  
  // Skip if no keypoints
  if (poseFrame.keypoints.length === 0) {
    return {
      frameNumber: poseFrame.frameNumber,
      timestamp,
      phase: 'unknown',
      toolResults: { error: 'No keypoints detected' },
      confidence: 0,
    };
  }
  
  // Run MCP tools on this frame
  
  // 1. Detect stance
  const stanceResult = detectStance(poseFrame);
  toolResults.stance = stanceResult;
  analysisLog.logToolCall('detect_stance', poseFrame.frameNumber, {}, stanceResult, stanceResult.confidence, Date.now() - startTime);
  
  // 2. Detect edge
  const edgeResult = detectEdge(poseFrame);
  toolResults.edge = edgeResult;
  analysisLog.logToolCall('detect_edge', poseFrame.frameNumber, {}, edgeResult, edgeResult.confidence, Date.now() - startTime);
  
  // 3. Measure leg bend
  const legBendResult = measureLegBend(poseFrame);
  toolResults.legBend = legBendResult;
  analysisLog.logToolCall('measure_leg_bend', poseFrame.frameNumber, {}, legBendResult, legBendResult.confidence, Date.now() - startTime);
  
  // 4. Detect body stack
  const bodyStackResult = detectBodyStack(poseFrame);
  toolResults.bodyStack = bodyStackResult;
  analysisLog.logToolCall('detect_body_stack', poseFrame.frameNumber, {}, bodyStackResult, bodyStackResult.confidence, Date.now() - startTime);
  
  // 5. Detect upper body rotation
  const upperRotationResult = detectUpperBodyRotation(poseFrame);
  toolResults.upperRotation = upperRotationResult;
  analysisLog.logToolCall('detect_upper_body_rotation', poseFrame.frameNumber, {}, upperRotationResult, upperRotationResult.confidence, Date.now() - startTime);
  
  // Calculate overall confidence
  const confidences = [
    stanceResult.confidence,
    edgeResult.confidence,
    legBendResult.confidence,
    bodyStackResult.confidence,
    upperRotationResult.confidence,
  ];
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  return {
    frameNumber: poseFrame.frameNumber,
    timestamp,
    phase: analysisLog.getCurrentPhase(),
    toolResults,
    confidence: avgConfidence,
  };
}

// ============================================
// MCP Tool Implementations
// ============================================

function getKeypoint(keypoints: Keypoint[], name: string): Keypoint | undefined {
  return keypoints.find(kp => kp.name === name);
}

/**
 * Detect stance (regular vs goofy)
 * Based on which foot is forward (lower Y = higher in frame = forward)
 */
export function detectStance(poseFrame: PoseFrame): { stance: string; confidence: number } {
  const leftAnkle = getKeypoint(poseFrame.keypoints, 'left_ankle');
  const rightAnkle = getKeypoint(poseFrame.keypoints, 'right_ankle');
  
  if (!leftAnkle || !rightAnkle) {
    return { stance: 'unknown', confidence: 0 };
  }
  
  const confidence = Math.min(leftAnkle.confidence, rightAnkle.confidence);
  
  // In most camera angles, the forward foot will have a different X position
  // This is a simplified heuristic - in reality we'd need more context
  const leftForward = leftAnkle.x < rightAnkle.x;
  
  return {
    stance: leftForward ? 'regular' : 'goofy',
    confidence,
  };
}

/**
 * Detect edge (toe vs heel)
 * Based on hip and ankle alignment
 */
export function detectEdge(poseFrame: PoseFrame): { edge: string; confidence: number } {
  const leftHip = getKeypoint(poseFrame.keypoints, 'left_hip');
  const rightHip = getKeypoint(poseFrame.keypoints, 'right_hip');
  const leftAnkle = getKeypoint(poseFrame.keypoints, 'left_ankle');
  const rightAnkle = getKeypoint(poseFrame.keypoints, 'right_ankle');
  
  if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return { edge: 'unknown', confidence: 0 };
  }
  
  const confidence = Math.min(
    leftHip.confidence,
    rightHip.confidence,
    leftAnkle.confidence,
    rightAnkle.confidence
  );
  
  // Calculate hip center and ankle center
  const hipCenterY = (leftHip.y + rightHip.y) / 2;
  const ankleCenterY = (leftAnkle.y + rightAnkle.y) / 2;
  
  // If hips are significantly forward of ankles (in Y), likely toe edge
  // This is a simplified heuristic
  const hipAnkleOffset = hipCenterY - ankleCenterY;
  
  if (Math.abs(hipAnkleOffset) < 20) {
    return { edge: 'flat', confidence: confidence * 0.5 };
  }
  
  return {
    edge: hipAnkleOffset > 0 ? 'heel_edge' : 'toe_edge',
    confidence,
  };
}

/**
 * Measure leg bend angles
 */
export function measureLegBend(poseFrame: PoseFrame): {
  leftKneeBend: number;
  rightKneeBend: number;
  averageBend: number;
  isStraightLegs: boolean;
  confidence: number;
} {
  const leftHip = getKeypoint(poseFrame.keypoints, 'left_hip');
  const leftKnee = getKeypoint(poseFrame.keypoints, 'left_knee');
  const leftAnkle = getKeypoint(poseFrame.keypoints, 'left_ankle');
  const rightHip = getKeypoint(poseFrame.keypoints, 'right_hip');
  const rightKnee = getKeypoint(poseFrame.keypoints, 'right_knee');
  const rightAnkle = getKeypoint(poseFrame.keypoints, 'right_ankle');
  
  let leftBend = 180;
  let rightBend = 180;
  let confidence = 0;
  
  if (leftHip && leftKnee && leftAnkle) {
    leftBend = calculateAngle(leftHip, leftKnee, leftAnkle);
    confidence = Math.min(leftHip.confidence, leftKnee.confidence, leftAnkle.confidence);
  }
  
  if (rightHip && rightKnee && rightAnkle) {
    rightBend = calculateAngle(rightHip, rightKnee, rightAnkle);
    const rightConf = Math.min(rightHip.confidence, rightKnee.confidence, rightAnkle.confidence);
    confidence = confidence > 0 ? (confidence + rightConf) / 2 : rightConf;
  }
  
  const avgBend = (leftBend + rightBend) / 2;
  
  return {
    leftKneeBend: leftBend,
    rightKneeBend: rightBend,
    averageBend: avgBend,
    isStraightLegs: avgBend > 165, // Less than 15 degrees of bend
    confidence,
  };
}

/**
 * Detect body stack (weight distribution)
 */
export function detectBodyStack(poseFrame: PoseFrame): {
  isStacked: boolean;
  weightDistribution: string;
  alignment: string;
  confidence: number;
} {
  const leftShoulder = getKeypoint(poseFrame.keypoints, 'left_shoulder');
  const rightShoulder = getKeypoint(poseFrame.keypoints, 'right_shoulder');
  const leftHip = getKeypoint(poseFrame.keypoints, 'left_hip');
  const rightHip = getKeypoint(poseFrame.keypoints, 'right_hip');
  const leftAnkle = getKeypoint(poseFrame.keypoints, 'left_ankle');
  const rightAnkle = getKeypoint(poseFrame.keypoints, 'right_ankle');
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return {
      isStacked: false,
      weightDistribution: 'unknown',
      alignment: 'unknown',
      confidence: 0,
    };
  }
  
  const confidence = Math.min(
    leftShoulder.confidence,
    rightShoulder.confidence,
    leftHip.confidence,
    rightHip.confidence,
    leftAnkle.confidence,
    rightAnkle.confidence
  );
  
  // Calculate centers
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipCenterX = (leftHip.x + rightHip.x) / 2;
  const ankleCenterX = (leftAnkle.x + rightAnkle.x) / 2;
  
  // Check vertical alignment
  const shoulderHipOffset = Math.abs(shoulderCenterX - hipCenterX);
  const hipAnkleOffset = Math.abs(hipCenterX - ankleCenterX);
  
  const isAligned = shoulderHipOffset < 30 && hipAnkleOffset < 30;
  
  // Determine weight distribution
  let weightDistribution = 'centered';
  const totalOffset = shoulderCenterX - ankleCenterX;
  
  if (totalOffset > 30) {
    weightDistribution = 'forward';
  } else if (totalOffset < -30) {
    weightDistribution = 'back';
  }
  
  return {
    isStacked: isAligned && weightDistribution === 'centered',
    weightDistribution,
    alignment: isAligned ? 'aligned' : 'misaligned',
    confidence,
  };
}

/**
 * Detect upper body rotation
 */
export function detectUpperBodyRotation(poseFrame: PoseFrame): {
  rotation: string;
  degreesSeparation: number;
  confidence: number;
} {
  const leftShoulder = getKeypoint(poseFrame.keypoints, 'left_shoulder');
  const rightShoulder = getKeypoint(poseFrame.keypoints, 'right_shoulder');
  const leftHip = getKeypoint(poseFrame.keypoints, 'left_hip');
  const rightHip = getKeypoint(poseFrame.keypoints, 'right_hip');
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return {
      rotation: 'unknown',
      degreesSeparation: 0,
      confidence: 0,
    };
  }
  
  const confidence = Math.min(
    leftShoulder.confidence,
    rightShoulder.confidence,
    leftHip.confidence,
    rightHip.confidence
  );
  
  // Calculate shoulder and hip angles
  const shoulderAngle = Math.atan2(
    rightShoulder.y - leftShoulder.y,
    rightShoulder.x - leftShoulder.x
  ) * (180 / Math.PI);
  
  const hipAngle = Math.atan2(
    rightHip.y - leftHip.y,
    rightHip.x - leftHip.x
  ) * (180 / Math.PI);
  
  const separation = shoulderAngle - hipAngle;
  
  let rotation = 'aligned';
  if (separation > 15) {
    rotation = 'leading';
  } else if (separation < -15) {
    rotation = 'following';
  }
  
  return {
    rotation,
    degreesSeparation: Math.abs(separation),
    confidence,
  };
}

/**
 * Calculate angle between three points (in degrees)
 */
function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 180;
  
  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}
