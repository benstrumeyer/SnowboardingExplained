/**
 * Phase Detection Logger
 * Provides detailed logging of phase detection calculations
 */

import { PoseFrame, PhaseMap } from '../types/formAnalysis';

export interface PhaseDetectionLog {
  videoId: string;
  timestamp: Date;
  totalFrames: number;
  fps: number;
  
  // Detection signals
  signals: {
    edgeAngleRange: { min: number; max: number };
    hipHeightRange: { min: number; max: number };
    hipVelocityRange: { min: number; max: number };
    chestRotationRange: { min: number; max: number };
    bodyStackednessRange: { min: number; max: number };
  };

  // Phase boundaries
  phases: {
    setupCarve: {
      startFrame: number;
      endFrame: number;
      frameCount: number;
      reasoning: string;
    };
    windUp: {
      startFrame: number | null;
      endFrame: number | null;
      frameCount: number;
      reasoning: string;
    };
    snap: {
      startFrame: number | null;
      endFrame: number | null;
      frameCount: number;
      reasoning: string;
    };
    takeoff: {
      startFrame: number;
      endFrame: number;
      frameCount: number;
      reasoning: string;
    };
    air: {
      startFrame: number;
      endFrame: number;
      frameCount: number;
      reasoning: string;
    };
    landing: {
      startFrame: number;
      endFrame: number;
      frameCount: number;
      reasoning: string;
    };
  };

  // Coverage
  coverage: number;
  unassignedFrames: number[];

  // Trick type detection
  trickType: {
    detected: string;
    rotationCount: number;
    rotationDirection: string;
    reasoning: string;
  };

  // Key moments
  keyMoments: Array<{
    frame: number;
    timestamp: number;
    event: string;
    signal: string;
    value: number;
  }>;

  // Warnings
  warnings: string[];
}

export class PhaseDetectionLogger {
  private logs: PhaseDetectionLog[] = [];

  logPhaseDetection(
    videoId: string,
    poseTimeline: PoseFrame[],
    phases: PhaseMap,
    signals: any
  ): PhaseDetectionLog {
    const fps = calculateFPS(poseTimeline);
    
    const log: PhaseDetectionLog = {
      videoId,
      timestamp: new Date(),
      totalFrames: poseTimeline.length,
      fps,

      signals: {
        edgeAngleRange: getRange(signals.edgeAngle),
        hipHeightRange: getRange(signals.hipHeight),
        hipVelocityRange: getRange(signals.hipVelocity),
        chestRotationRange: getRange(signals.chestRotation),
        bodyStackednessRange: getRange(signals.bodyStackedness),
      },

      phases: {
        setupCarve: {
          startFrame: phases.phases.setupCarve.startFrame,
          endFrame: phases.phases.setupCarve.endFrame,
          frameCount: phases.phases.setupCarve.endFrame - phases.phases.setupCarve.startFrame + 1,
          reasoning: `Detected from edge transitions and body preparation. Hip height increases from ${signals.hipHeight[phases.phases.setupCarve.startFrame].toFixed(2)} to ${signals.hipHeight[phases.phases.setupCarve.endFrame].toFixed(2)}`,
        },
        windUp: {
          startFrame: phases.phases.windUp?.startFrame ?? null,
          endFrame: phases.phases.windUp?.endFrame ?? null,
          frameCount: phases.phases.windUp ? phases.phases.windUp.endFrame - phases.phases.windUp.startFrame + 1 : 0,
          reasoning: phases.phases.windUp
            ? `Detected from chest rotation and arm positioning. Max rotation: ${signals.chestRotation[phases.phases.windUp.endFrame].toFixed(2)}°`
            : 'Not detected (straight air)',
        },
        snap: {
          startFrame: phases.phases.snap?.startFrame ?? null,
          endFrame: phases.phases.snap?.endFrame ?? null,
          frameCount: phases.phases.snap ? phases.phases.snap.endFrame - phases.phases.snap.startFrame + 1 : 0,
          reasoning: phases.phases.snap
            ? `Detected from rapid rotation velocity and body stackedness. Velocity: ${signals.chestRotationVelocity[phases.phases.snap.endFrame].toFixed(2)}°/frame`
            : 'Not detected (straight air)',
        },
        takeoff: {
          startFrame: phases.phases.takeoff.startFrame,
          endFrame: phases.phases.takeoff.endFrame,
          frameCount: phases.phases.takeoff.endFrame - phases.phases.takeoff.startFrame + 1,
          reasoning: `Detected from hip acceleration spike. Acceleration: ${signals.hipAcceleration[phases.phases.takeoff.startFrame].toFixed(2)}`,
        },
        air: {
          startFrame: phases.phases.air.startFrame,
          endFrame: phases.phases.air.endFrame,
          frameCount: phases.phases.air.endFrame - phases.phases.air.startFrame + 1,
          reasoning: `Detected from sustained low hip height and rotation. Duration: ${((phases.phases.air.endFrame - phases.phases.air.startFrame) / fps).toFixed(2)}s`,
        },
        landing: {
          startFrame: phases.phases.landing.startFrame,
          endFrame: phases.phases.landing.endFrame,
          frameCount: phases.phases.landing.endFrame - phases.phases.landing.startFrame + 1,
          reasoning: `Detected from hip acceleration increase and body stabilization. Acceleration: ${signals.hipAcceleration[phases.phases.landing.startFrame].toFixed(2)}`,
        },
      },

      coverage: phases.coverage,
      unassignedFrames: findUnassignedFrames(phases, poseTimeline.length),

      trickType: {
        detected: phases.trickType,
        rotationCount: countRotations(signals.chestRotation),
        rotationDirection: getRotationDirection(signals.chestRotation),
        reasoning: `Detected from chest rotation pattern. Total rotation: ${getTotalRotation(signals.chestRotation).toFixed(0)}°`,
      },

      keyMoments: extractKeyMoments(poseTimeline, phases, signals),

      warnings: generateWarnings(phases, signals, poseTimeline),
    };

    this.logs.push(log);
    return log;
  }

  getLogs(): PhaseDetectionLog[] {
    return this.logs;
  }

  getLogAsString(log: PhaseDetectionLog): string {
    return JSON.stringify(log, null, 2);
  }

  printLog(log: PhaseDetectionLog): void {
    console.log('=== PHASE DETECTION LOG ===');
    console.log(`Video ID: ${log.videoId}`);
    console.log(`Total Frames: ${log.totalFrames} @ ${log.fps} FPS`);
    console.log(`Duration: ${(log.totalFrames / log.fps).toFixed(2)}s`);
    console.log('');

    console.log('--- DETECTION SIGNALS ---');
    console.log(`Edge Angle: ${log.signals.edgeAngleRange.min.toFixed(1)}° to ${log.signals.edgeAngleRange.max.toFixed(1)}°`);
    console.log(`Hip Height: ${log.signals.hipHeightRange.min.toFixed(2)} to ${log.signals.hipHeightRange.max.toFixed(2)}`);
    console.log(`Hip Velocity: ${log.signals.hipVelocityRange.min.toFixed(2)} to ${log.signals.hipVelocityRange.max.toFixed(2)}`);
    console.log(`Chest Rotation: ${log.signals.chestRotationRange.min.toFixed(1)}° to ${log.signals.chestRotationRange.max.toFixed(1)}°`);
    console.log('');

    console.log('--- PHASES DETECTED ---');
    Object.entries(log.phases).forEach(([phaseName, phaseData]) => {
      if (phaseData.startFrame !== null && phaseData.endFrame !== null) {
        console.log(`${phaseName.toUpperCase()}: Frames ${phaseData.startFrame}-${phaseData.endFrame} (${phaseData.frameCount} frames)`);
        console.log(`  Reasoning: ${phaseData.reasoning}`);
      }
    });
    console.log('');

    console.log(`--- COVERAGE ---`);
    console.log(`Phase Coverage: ${log.coverage.toFixed(1)}%`);
    console.log(`Unassigned Frames: ${log.unassignedFrames.length}`);
    console.log('');

    console.log(`--- TRICK TYPE ---`);
    console.log(`Detected: ${log.trickType.detected}`);
    console.log(`Rotations: ${log.trickType.rotationCount} (${log.trickType.rotationDirection})`);
    console.log(`Reasoning: ${log.trickType.reasoning}`);
    console.log('');

    if (log.warnings.length > 0) {
      console.log('--- WARNINGS ---');
      log.warnings.forEach(w => console.log(`⚠️  ${w}`));
      console.log('');
    }
  }
}

// Helper functions

function calculateFPS(poseTimeline: PoseFrame[]): number {
  if (poseTimeline.length < 2) return 30;
  const timeDiff = poseTimeline[poseTimeline.length - 1].timestamp - poseTimeline[0].timestamp;
  return Math.round((poseTimeline.length - 1) / timeDiff);
}

function getRange(values: number[]): { min: number; max: number } {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function findUnassignedFrames(phases: PhaseMap, totalFrames: number): number[] {
  const assigned = new Set<number>();
  Object.values(phases.phases).forEach(phase => {
    if (phase) {
      for (let i = phase.startFrame; i <= phase.endFrame; i++) {
        assigned.add(i);
      }
    }
  });

  const unassigned: number[] = [];
  for (let i = 0; i < totalFrames; i++) {
    if (!assigned.has(i)) {
      unassigned.push(i);
    }
  }
  return unassigned;
}

function countRotations(chestRotation: number[]): number {
  let rotations = 0;
  let lastDirection = 0;

  for (let i = 1; i < chestRotation.length; i++) {
    const delta = chestRotation[i] - chestRotation[i - 1];
    if (Math.abs(delta) > 5) {
      if ((lastDirection > 0 && delta < 0) || (lastDirection < 0 && delta > 0)) {
        rotations++;
      }
      lastDirection = delta;
    }
  }

  return Math.floor(rotations / 2);
}

function getRotationDirection(chestRotation: number[]): string {
  const totalRotation = getTotalRotation(chestRotation);
  return totalRotation > 0 ? 'frontside' : 'backside';
}

function getTotalRotation(chestRotation: number[]): number {
  if (chestRotation.length === 0) return 0;
  return chestRotation[chestRotation.length - 1] - chestRotation[0];
}

function extractKeyMoments(
  poseTimeline: PoseFrame[],
  phases: PhaseMap,
  signals: any
): Array<{ frame: number; timestamp: number; event: string; signal: string; value: number }> {
  const moments: Array<{ frame: number; timestamp: number; event: string; signal: string; value: number }> = [];

  // Takeoff moment
  moments.push({
    frame: phases.phases.takeoff.startFrame,
    timestamp: poseTimeline[phases.phases.takeoff.startFrame].timestamp,
    event: 'Takeoff',
    signal: 'Hip Acceleration',
    value: signals.hipAcceleration[phases.phases.takeoff.startFrame],
  });

  // Peak height
  const airPhase = phases.phases.air;
  const peakFrame = airPhase.startFrame + Math.floor((airPhase.endFrame - airPhase.startFrame) / 2);
  moments.push({
    frame: peakFrame,
    timestamp: poseTimeline[peakFrame].timestamp,
    event: 'Peak Height',
    signal: 'Hip Height',
    value: signals.hipHeight[peakFrame],
  });

  // Landing moment
  moments.push({
    frame: phases.phases.landing.startFrame,
    timestamp: poseTimeline[phases.phases.landing.startFrame].timestamp,
    event: 'Landing',
    signal: 'Hip Acceleration',
    value: signals.hipAcceleration[phases.phases.landing.startFrame],
  });

  return moments;
}

function generateWarnings(phases: PhaseMap, signals: any, poseTimeline: PoseFrame[]): string[] {
  const warnings: string[] = [];

  // Check coverage
  if (phases.coverage < 80) {
    warnings.push(`Low phase coverage: ${phases.coverage.toFixed(1)}% (expected > 80%)`);
  }

  // Check phase durations
  const airDuration = (phases.phases.air.endFrame - phases.phases.air.startFrame) / 30;
  if (airDuration < 0.3) {
    warnings.push(`Short air time: ${airDuration.toFixed(2)}s (expected > 0.3s)`);
  }

  // Check confidence
  const avgConfidence = poseTimeline.reduce((sum, f) => sum + f.confidence, 0) / poseTimeline.length;
  if (avgConfidence < 0.7) {
    warnings.push(`Low average confidence: ${(avgConfidence * 100).toFixed(0)}% (expected > 70%)`);
  }

  return warnings;
}
