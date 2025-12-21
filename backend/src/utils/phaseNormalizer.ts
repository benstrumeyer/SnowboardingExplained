/**
 * Phase Normalizer
 * Maps frame indices to normalized time [0, 1] within each phase
 * Allows fair comparison across different video lengths
 */

import { Phase, PhaseMap, PoseFrame } from '../types/formAnalysis';

export interface NormalizedPhaseData {
  phase: Phase;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  normalizedFrames: Array<{
    originalFrame: number;
    normalizedTime: number; // [0, 1]
    pose: PoseFrame;
  }>;
}

/**
 * Normalize a phase's frames to [0, 1] time range
 */
export function normalizePhase(
  phase: Phase,
  startFrame: number,
  endFrame: number,
  poseTimeline: PoseFrame[]
): NormalizedPhaseData {
  const frameCount = endFrame - startFrame + 1;
  const normalizedFrames = [];

  for (let i = startFrame; i <= endFrame; i++) {
    const pose = poseTimeline[i];
    if (pose) {
      const normalizedTime = (i - startFrame) / (frameCount - 1 || 1);
      normalizedFrames.push({
        originalFrame: i,
        normalizedTime,
        pose,
      });
    }
  }

  return {
    phase,
    startFrame,
    endFrame,
    frameCount,
    normalizedFrames,
  };
}

/**
 * Normalize all phases from a phase map
 */
export function normalizeAllPhases(
  phaseMap: PhaseMap,
  poseTimeline: PoseFrame[]
): Map<Phase, NormalizedPhaseData> {
  const normalized = new Map<Phase, NormalizedPhaseData>();

  const phases: Phase[] = ['setupCarve', 'windUp', 'snap', 'takeoff', 'air', 'landing'];

  for (const phaseName of phases) {
    const phaseData = phaseMap.phases[phaseName as keyof typeof phaseMap.phases];
    if (phaseData) {
      const normalized_phase = normalizePhase(
        phaseName,
        phaseData.startFrame,
        phaseData.endFrame,
        poseTimeline
      );
      normalized.set(phaseName, normalized_phase);
    }
  }

  return normalized;
}

/**
 * Interpolate a signal value at a normalized time
 * Useful for comparing signals at the same relative point in a phase
 */
export function interpolateSignalAtNormalizedTime(
  signal: number[],
  startFrame: number,
  endFrame: number,
  normalizedTime: number // [0, 1]
): number {
  const frameCount = endFrame - startFrame + 1;
  const exactFrame = startFrame + normalizedTime * (frameCount - 1);
  const lowerFrame = Math.floor(exactFrame);
  const upperFrame = Math.ceil(exactFrame);
  const fraction = exactFrame - lowerFrame;

  if (lowerFrame === upperFrame) {
    return signal[lowerFrame] || 0;
  }

  const lowerValue = signal[lowerFrame] || 0;
  const upperValue = signal[upperFrame] || 0;

  return lowerValue + (upperValue - lowerValue) * fraction;
}

/**
 * Sample a signal at normalized time points
 * Returns signal values at evenly spaced normalized times
 */
export function sampleSignalAtNormalizedTimes(
  signal: number[],
  startFrame: number,
  endFrame: number,
  sampleCount: number = 100
): Array<{ normalizedTime: number; value: number }> {
  const samples = [];

  for (let i = 0; i < sampleCount; i++) {
    const normalizedTime = i / (sampleCount - 1);
    const value = interpolateSignalAtNormalizedTime(
      signal,
      startFrame,
      endFrame,
      normalizedTime
    );
    samples.push({ normalizedTime, value });
  }

  return samples;
}
