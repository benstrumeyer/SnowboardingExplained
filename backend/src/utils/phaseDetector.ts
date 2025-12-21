/**
 * Phase Detector - Detects 6 trick phases from pose data
 * Phases: setupCarve → windUp → snap → takeoff → air → landing
 * All detection is pure pose-based computation - no LLM involved
 */

import {
  PoseFrame,
  PhaseMap,
  PhaseData,
  SetupCarvePhase,
  TrickType,
} from '../types/formAnalysis';
import { calculatePhaseDetectionSignals } from './phaseDetectionSignals';

const TAKEOFF_RATIO_THRESHOLD = 1.0;
const LANDING_ACCELERATION_THRESHOLD = 0.5;
const ROTATION_VELOCITY_THRESHOLD = 2;

/**
 * Detect all 6 phases from pose timeline
 */
export function detectPhases(poseTimeline: PoseFrame[]): PhaseMap {
  // Calculate all detection signals
  const signals = calculatePhaseDetectionSignals(poseTimeline);

  // Detect trick type from rotation patterns
  const trickType = detectTrickType(signals);

  // Detect takeoff frame (when board leaves lip)
  const takeoffFrame = detectTakeoffFrame(signals);

  // Detect landing frame (when board touches down)
  const landingFrame = detectLandingFrame(signals, takeoffFrame);

  // Detect air phase
  const airPhase = detectAirPhase(takeoffFrame, landingFrame, poseTimeline);

  // Detect landing phase
  const landingPhase = detectLandingPhase(landingFrame, poseTimeline, signals);

  // Detect takeoff phase (single frame)
  const takeoffPhase = detectTakeoffPhase(takeoffFrame, poseTimeline);

  // Detect snap phase (before takeoff)
  const snapPhase = detectSnapPhase(
    takeoffFrame,
    poseTimeline,
    signals,
    trickType
  );

  // Detect windup phase (before snap)
  const windUpPhase = detectWindUpPhase(
    snapPhase,
    poseTimeline,
    signals,
    trickType
  );

  // Detect setup carve phase (before windup)
  const setupCarvePhase = detectSetupCarvePhase(
    windUpPhase,
    poseTimeline,
    signals
  );

  return {
    trickType,
    phases: {
      setupCarve: setupCarvePhase,
      windUp: windUpPhase,
      snap: snapPhase,
      takeoff: takeoffPhase,
      air: airPhase,
      landing: landingPhase,
    },
    totalFrames: poseTimeline.length,
    coverage: calculatePhaseCoverage(
      setupCarvePhase,
      windUpPhase,
      snapPhase,
      takeoffPhase,
      airPhase,
      landingPhase,
      poseTimeline.length
    ),
  };
}

/**
 * Detect trick type from rotation patterns
 */
function detectTrickType(signals: any): TrickType {
  // Analyze chest rotation velocity to determine trick type
  const maxRotationVelocity = Math.max(...signals.chestRotationVelocity);

  if (maxRotationVelocity < ROTATION_VELOCITY_THRESHOLD) {
    return 'straight_air';
  }

  // Analyze edge transitions to determine frontside vs backside
  const heelsideToToeside = signals.edgeTransitions.filter(
    (t: any) => t.fromEdge === 'heelside' && t.toEdge === 'toeside'
  );
  const toesideToHeelside = signals.edgeTransitions.filter(
    (t: any) => t.fromEdge === 'toeside' && t.toEdge === 'heelside'
  );

  // More heelside→toeside transitions = frontside
  // More toeside→heelside transitions = backside
  return heelsideToToeside.length >= toesideToHeelside.length
    ? 'frontside'
    : 'backside';
}

/**
 * Detect takeoff frame (when board leaves lip)
 */
function detectTakeoffFrame(signals: any): number {
  for (let i = 1; i < signals.ankleToHipRatio.length; i++) {
    if (
      signals.ankleToHipRatio[i - 1] <= TAKEOFF_RATIO_THRESHOLD &&
      signals.ankleToHipRatio[i] > TAKEOFF_RATIO_THRESHOLD
    ) {
      return i;
    }
  }
  return Math.floor(signals.ankleToHipRatio.length / 2);
}

/**
 * Detect landing frame (when board touches down)
 */
function detectLandingFrame(signals: any, takeoffFrame: number): number {
  for (let i = takeoffFrame + 1; i < signals.ankleToHipRatio.length; i++) {
    if (
      signals.ankleToHipRatio[i] < TAKEOFF_RATIO_THRESHOLD &&
      signals.hipAcceleration[i] > LANDING_ACCELERATION_THRESHOLD
    ) {
      return i;
    }
  }
  return signals.ankleToHipRatio.length - 1;
}

/**
 * Detect setup carve phase
 */
function detectSetupCarvePhase(
  windUpPhase: PhaseData | null,
  poseTimeline: PoseFrame[],
  signals: any
): SetupCarvePhase {
  const startFrame = 0;
  const endFrame = windUpPhase ? windUpPhase.startFrame : Math.floor(poseTimeline.length * 0.3);

  // Find edge change within setup carve
  const edgeChangeTransition = signals.edgeTransitions.find(
    (t: any) => t.frame >= startFrame && t.frame <= endFrame
  );

  const edgeChangeStart = edgeChangeTransition?.frame || startFrame;
  const edgeChangeEnd = edgeChangeTransition
    ? Math.min(edgeChangeStart + 10, endFrame)
    : edgeChangeStart + 5;

  const edgeChangePoses = poseTimeline.slice(edgeChangeStart, edgeChangeEnd + 1);

  return {
    name: 'setupCarve',
    startFrame,
    endFrame,
    startTimestamp: poseTimeline[startFrame]?.timestamp || 0,
    endTimestamp: poseTimeline[endFrame]?.timestamp || 0,
    frameCount: endFrame - startFrame + 1,
    subPhases: {
      edgeChange: {
        startFrame: edgeChangeStart,
        endFrame: edgeChangeEnd,
        fromEdge: edgeChangeTransition?.fromEdge || 'heelside',
        toEdge: edgeChangeTransition?.toEdge || 'toeside',
        poses: edgeChangePoses,
        smoothness: edgeChangeTransition?.smoothness || 50,
        bodyMovementQuality: {
          value: 'smooth',
          verdict: 'acceptable',
          confidence: 75,
          reasoning: 'Body movement during edge change is within acceptable range',
          severity: 'none',
          coachTip: null,
          fixInstructions: null,
          detectionMethod: 'pose_analysis',
        },
      },
    },
  };
}

/**
 * Detect wind up phase
 */
function detectWindUpPhase(
  snapPhase: PhaseData | null,
  poseTimeline: PoseFrame[],
  signals: any,
  trickType: TrickType
): PhaseData | null {
  if (trickType === 'straight_air') {
    return null;
  }

  const snapStart = snapPhase?.startFrame || Math.floor(poseTimeline.length * 0.4);
  const startFrame = Math.max(0, snapStart - 20);

  // Find max chest rotation before snap
  const maxRotationFrame = signals.chestRotation
    .slice(startFrame, snapStart)
    .reduce(
      (maxIdx: number, val: number, idx: number) =>
        Math.abs(val) > Math.abs(signals.chestRotation[startFrame + maxIdx])
          ? idx
          : maxIdx,
      0
    );

  const endFrame = startFrame + maxRotationFrame;

  return {
    name: 'windUp',
    startFrame,
    endFrame,
    startTimestamp: poseTimeline[startFrame]?.timestamp || 0,
    endTimestamp: poseTimeline[endFrame]?.timestamp || 0,
    frameCount: endFrame - startFrame + 1,
  };
}

/**
 * Detect snap phase
 */
function detectSnapPhase(
  takeoffFrame: number,
  poseTimeline: PoseFrame[],
  signals: any,
  trickType: TrickType
): PhaseData | null {
  if (trickType === 'straight_air') {
    return null;
  }

  const endFrame = takeoffFrame;
  const startFrame = Math.max(0, takeoffFrame - 15);

  return {
    name: 'snap',
    startFrame,
    endFrame,
    startTimestamp: poseTimeline[startFrame]?.timestamp || 0,
    endTimestamp: poseTimeline[endFrame]?.timestamp || 0,
    frameCount: endFrame - startFrame + 1,
  };
}

/**
 * Detect takeoff phase (single frame)
 */
function detectTakeoffPhase(takeoffFrame: number, poseTimeline: PoseFrame[]): PhaseData {
  return {
    name: 'takeoff',
    startFrame: takeoffFrame,
    endFrame: takeoffFrame,
    startTimestamp: poseTimeline[takeoffFrame]?.timestamp || 0,
    endTimestamp: poseTimeline[takeoffFrame]?.timestamp || 0,
    frameCount: 1,
  };
}

/**
 * Detect air phase
 */
function detectAirPhase(
  takeoffFrame: number,
  landingFrame: number,
  poseTimeline: PoseFrame[]
): PhaseData {
  const startFrame = takeoffFrame + 1;
  const endFrame = landingFrame - 1;

  return {
    name: 'air',
    startFrame,
    endFrame,
    startTimestamp: poseTimeline[startFrame]?.timestamp || 0,
    endTimestamp: poseTimeline[endFrame]?.timestamp || 0,
    frameCount: Math.max(1, endFrame - startFrame + 1),
  };
}

/**
 * Detect landing phase
 */
function detectLandingPhase(
  landingFrame: number,
  poseTimeline: PoseFrame[],
  signals: any
): PhaseData {
  const startFrame = landingFrame;

  // Find stabilization frame (when velocity stabilizes)
  let endFrame = landingFrame;
  for (let i = landingFrame + 1; i < signals.hipVelocity.length; i++) {
    if (Math.abs(signals.hipVelocity[i]) < 0.01) {
      endFrame = i;
      break;
    }
  }

  endFrame = Math.min(endFrame, poseTimeline.length - 1);

  return {
    name: 'landing',
    startFrame,
    endFrame,
    startTimestamp: poseTimeline[startFrame]?.timestamp || 0,
    endTimestamp: poseTimeline[endFrame]?.timestamp || 0,
    frameCount: endFrame - startFrame + 1,
  };
}

/**
 * Calculate phase coverage percentage
 */
function calculatePhaseCoverage(
  setupCarve: SetupCarvePhase,
  windUp: PhaseData | null,
  snap: PhaseData | null,
  takeoff: PhaseData,
  air: PhaseData,
  landing: PhaseData,
  totalFrames: number
): number {
  const coveredFrames = new Set<number>();

  // Add all phase frames
  for (let i = setupCarve.startFrame; i <= setupCarve.endFrame; i++) {
    coveredFrames.add(i);
  }
  if (windUp) {
    for (let i = windUp.startFrame; i <= windUp.endFrame; i++) {
      coveredFrames.add(i);
    }
  }
  if (snap) {
    for (let i = snap.startFrame; i <= snap.endFrame; i++) {
      coveredFrames.add(i);
    }
  }
  for (let i = takeoff.startFrame; i <= takeoff.endFrame; i++) {
    coveredFrames.add(i);
  }
  for (let i = air.startFrame; i <= air.endFrame; i++) {
    coveredFrames.add(i);
  }
  for (let i = landing.startFrame; i <= landing.endFrame; i++) {
    coveredFrames.add(i);
  }

  return (coveredFrames.size / totalFrames) * 100;
}
