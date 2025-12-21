/**
 * Frame Viewer Helper - Provides phase reasoning and detection logs
 */

import { FormAnalysisResult } from './FormAnalysisScreen';

export interface FramePhaseInfo {
  phaseName: string;
  phaseColor: string;
  reasoning: string;
  frameInPhase: number;
  totalFramesInPhase: number;
  percentThroughPhase: number;
  detectionSignals: {
    signal: string;
    value: number;
    threshold?: number;
    status: 'good' | 'warning' | 'critical';
  }[];
}

export function getPhaseForFrame(
  frameIndex: number,
  result: FormAnalysisResult
): FramePhaseInfo | null {
  const phases = result.phases.phases;
  const phaseColors: { [key: string]: string } = {
    setupCarve: '#FF6B6B',
    windUp: '#4ECDC4',
    snap: '#45B7D1',
    takeoff: '#FFA07A',
    air: '#98D8C8',
    landing: '#F7DC6F',
  };

  // Check each phase
  for (const [phaseName, phaseData] of Object.entries(phases)) {
    if (phaseData && frameIndex >= phaseData.startFrame && frameIndex <= phaseData.endFrame) {
      const frameInPhase = frameIndex - phaseData.startFrame;
      const totalFramesInPhase = phaseData.endFrame - phaseData.startFrame + 1;
      const percentThroughPhase = (frameInPhase / totalFramesInPhase) * 100;

      return {
        phaseName,
        phaseColor: phaseColors[phaseName] || '#999',
        reasoning: getPhaseReasoning(phaseName, frameInPhase, totalFramesInPhase, result),
        frameInPhase,
        totalFramesInPhase,
        percentThroughPhase,
        detectionSignals: getDetectionSignals(phaseName, frameIndex, result),
      };
    }
  }

  return null;
}

function getPhaseReasoning(
  phaseName: string,
  frameInPhase: number,
  totalFramesInPhase: number,
  result: FormAnalysisResult
): string {
  const reasonings: { [key: string]: string } = {
    setupCarve: `Setting up the carve to generate momentum. Frame ${frameInPhase + 1}/${totalFramesInPhase}. Body is preparing for the pop by loading the edge and building pressure.`,
    windUp: `Winding up for the pop. Rotating body and loading the tail. Frame ${frameInPhase + 1}/${totalFramesInPhase}. Maximum chest rotation is building up before the snap.`,
    snap: `Snapping off the tail. Maximum rotation and pop power. Frame ${frameInPhase + 1}/${totalFramesInPhase}. This is the explosive moment where all energy is released.`,
    takeoff: `Leaving the lip. Body position and momentum transfer critical. Frame ${frameInPhase + 1}/${totalFramesInPhase}. The board is leaving the snow and rider is airborne.`,
    air: `In the air. Rotation and body control. Frame ${frameInPhase + 1}/${totalFramesInPhase}. Rider is executing the trick rotation while airborne.`,
    landing: `Landing and riding away. Absorption and control. Frame ${frameInPhase + 1}/${totalFramesInPhase}. Rider is absorbing impact and stabilizing for the ride away.`,
  };

  return reasonings[phaseName] || 'Unknown phase';
}

function getDetectionSignals(
  phaseName: string,
  frameIndex: number,
  result: FormAnalysisResult
): FramePhaseInfo['detectionSignals'] {
  // Mock detection signals - in production these would come from actual pose analysis
  const signals: FramePhaseInfo['detectionSignals'] = [];

  switch (phaseName) {
    case 'setupCarve':
      signals.push(
        { signal: 'Hip Height', value: 1.2, threshold: 1.0, status: 'good' },
        { signal: 'Edge Angle', value: 25, threshold: 20, status: 'good' },
        { signal: 'Body Stackedness', value: 0.8, threshold: 0.7, status: 'good' }
      );
      break;
    case 'windUp':
      signals.push(
        { signal: 'Chest Rotation', value: 45, threshold: 30, status: 'good' },
        { signal: 'Arm Position', value: 0.9, threshold: 0.7, status: 'good' },
        { signal: 'Hip Velocity', value: 0.5, threshold: 0.3, status: 'good' }
      );
      break;
    case 'snap':
      signals.push(
        { signal: 'Rotation Velocity', value: 8.5, threshold: 5.0, status: 'good' },
        { signal: 'Body Stackedness', value: 0.95, threshold: 0.8, status: 'good' },
        { signal: 'Hip Acceleration', value: 2.1, threshold: 1.5, status: 'good' }
      );
      break;
    case 'takeoff':
      signals.push(
        { signal: 'Hip Acceleration', value: 3.2, threshold: 2.0, status: 'good' },
        { signal: 'Ankle-to-Hip Ratio', value: 1.5, threshold: 1.0, status: 'good' },
        { signal: 'Vertical Velocity', value: 2.8, threshold: 2.0, status: 'good' }
      );
      break;
    case 'air':
      signals.push(
        { signal: 'Hip Height', value: 0.3, threshold: 0.2, status: 'good' },
        { signal: 'Rotation Angle', value: 180, threshold: 0, status: 'good' },
        { signal: 'Body Control', value: 0.85, threshold: 0.7, status: 'good' }
      );
      break;
    case 'landing':
      signals.push(
        { signal: 'Hip Acceleration', value: 1.8, threshold: 1.0, status: 'good' },
        { signal: 'Body Stabilization', value: 0.9, threshold: 0.7, status: 'good' },
        { signal: 'Edge Engagement', value: 0.8, threshold: 0.6, status: 'good' }
      );
      break;
  }

  return signals;
}

export function generateDetectionLog(result: FormAnalysisResult): string {
  const log = {
    videoId: result.videoId,
    timestamp: new Date().toISOString(),
    analysis: {
      duration: result.duration.toFixed(2) + 's',
      frameCount: result.frameCount,
      fps: result.fps,
      stance: result.stance,
      trickType: result.phases.trickType,
      coverage: result.phases.coverage.toFixed(1) + '%',
    },
    phases: {
      setupCarve: {
        frames: `${result.phases.phases.setupCarve.startFrame}-${result.phases.phases.setupCarve.endFrame}`,
        duration: `${((result.phases.phases.setupCarve.endFrame - result.phases.phases.setupCarve.startFrame) / result.fps).toFixed(2)}s`,
        reasoning: 'Detected from edge transitions and body preparation signals',
      },
      windUp: result.phases.phases.windUp
        ? {
            frames: `${result.phases.phases.windUp.startFrame}-${result.phases.phases.windUp.endFrame}`,
            duration: `${((result.phases.phases.windUp.endFrame - result.phases.phases.windUp.startFrame) / result.fps).toFixed(2)}s`,
            reasoning: 'Detected from chest rotation and arm positioning',
          }
        : { frames: 'N/A', duration: 'N/A', reasoning: 'Not detected (straight air)' },
      snap: result.phases.phases.snap
        ? {
            frames: `${result.phases.phases.snap.startFrame}-${result.phases.phases.snap.endFrame}`,
            duration: `${((result.phases.phases.snap.endFrame - result.phases.phases.snap.startFrame) / result.fps).toFixed(2)}s`,
            reasoning: 'Detected from rapid rotation velocity and body stackedness',
          }
        : { frames: 'N/A', duration: 'N/A', reasoning: 'Not detected (straight air)' },
      takeoff: {
        frames: `${result.phases.phases.takeoff.startFrame}-${result.phases.phases.takeoff.endFrame}`,
        duration: `${((result.phases.phases.takeoff.endFrame - result.phases.phases.takeoff.startFrame) / result.fps).toFixed(2)}s`,
        reasoning: 'Detected from hip acceleration spike and ankle-to-hip ratio threshold',
      },
      air: {
        frames: `${result.phases.phases.air.startFrame}-${result.phases.phases.air.endFrame}`,
        duration: `${((result.phases.phases.air.endFrame - result.phases.phases.air.startFrame) / result.fps).toFixed(2)}s`,
        reasoning: 'Detected from sustained low hip height and rotation maintenance',
      },
      landing: {
        frames: `${result.phases.phases.landing.startFrame}-${result.phases.phases.landing.endFrame}`,
        duration: `${((result.phases.phases.landing.endFrame - result.phases.phases.landing.startFrame) / result.fps).toFixed(2)}s`,
        reasoning: 'Detected from hip acceleration increase and body stabilization',
      },
    },
    summary: {
      trickIdentified: result.summary.trickIdentified,
      confidence: (result.summary.confidence * 100).toFixed(0) + '%',
      phasesDetected: result.summary.phasesDetected.join(', '),
      keyIssues: result.summary.keyIssues,
      keyPositives: result.summary.keyPositives,
    },
  };

  return JSON.stringify(log, null, 2);
}
