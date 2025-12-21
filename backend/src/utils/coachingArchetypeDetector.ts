/**
 * Coaching Archetype Detector
 * Maps signal deltas to coaching patterns (archetypes)
 * Deterministic pattern matching - no LLM involved
 */

import { Phase } from '../types/formAnalysis';
import { SignalDelta } from './deltaComputer';

export type CoachingArchetype =
  | 'early_extension'
  | 'late_compression'
  | 'arm_imbalance'
  | 'premature_rotation'
  | 'over_connected'
  | 'asymmetric_landing'
  | 'insufficient_pop'
  | 'excessive_rotation'
  | 'unstable_air';

export interface ArchetypeDetection {
  archetype: CoachingArchetype;
  confidence: number; // 0-100
  signals: string[]; // Which signals triggered this archetype
  coachingTip: string;
  fixInstructions: string;
  severity: 'minor' | 'moderate' | 'critical';
}

/**
 * Detect coaching archetypes from signal deltas
 */
export function detectArchetypes(
  deltas: SignalDelta[],
  phase: Phase
): ArchetypeDetection[] {
  const archetypes: ArchetypeDetection[] = [];

  // Create a map of signal deltas for easy lookup
  const deltaMap = new Map<string, SignalDelta>();
  for (const delta of deltas) {
    deltaMap.set(delta.signal, delta);
  }

  // Setup Phase Archetypes
  if (phase === 'setupCarve') {
    // Early Extension: Knee extension starts too early
    if (deltaMap.has('hipVelocity')) {
      const hipVel = deltaMap.get('hipVelocity')!;
      if (hipVel.direction === 'rider_higher' && hipVel.peakTimingDelta < -0.1) {
        archetypes.push({
          archetype: 'early_extension',
          confidence: Math.min(100, 60 + Math.abs(hipVel.peakTimingDelta) * 100),
          signals: ['hipVelocity'],
          coachingTip: 'You extended ~{timing}ms earlier than the reference',
          fixInstructions:
            'Focus on staying compressed longer. Count to 3 before extending your legs.',
          severity: 'moderate',
        });
      }
    }

    // Over-Connected: Chest and hips too aligned
    if (deltaMap.has('bodyStackedness')) {
      const stackedness = deltaMap.get('bodyStackedness')!;
      if (stackedness.direction === 'rider_higher' && stackedness.peakDelta > 15) {
        archetypes.push({
          archetype: 'over_connected',
          confidence: Math.min(100, 70 + stackedness.peakDelta),
          signals: ['bodyStackedness'],
          coachingTip: 'Your upper and lower body are too connected',
          fixInstructions:
            'Separate your upper body from your hips. Lead with your chest into the turn.',
          severity: 'moderate',
        });
      }
    }
  }

  // Takeoff Phase Archetypes
  if (phase === 'takeoff') {
    // Premature Rotation: Chest opens before extension
    if (deltaMap.has('chestRotationVelocity')) {
      const chestVel = deltaMap.get('chestRotationVelocity')!;
      if (chestVel.peakTimingDelta < -0.15) {
        archetypes.push({
          archetype: 'premature_rotation',
          confidence: Math.min(100, 75 + Math.abs(chestVel.peakTimingDelta) * 100),
          signals: ['chestRotationVelocity'],
          coachingTip: 'Your shoulders are opening before your legs extend',
          fixInstructions:
            'Delay your shoulder rotation. Extend your legs first, then snap your shoulders.',
          severity: 'critical',
        });
      }
    }

    // Arm Imbalance: One arm higher than the other
    if (deltaMap.has('armPosition')) {
      const armPos = deltaMap.get('armPosition')!;
      if (Math.abs(armPos.peakDelta) > 20) {
        archetypes.push({
          archetype: 'arm_imbalance',
          confidence: Math.min(100, 65 + Math.abs(armPos.peakDelta)),
          signals: ['armPosition'],
          coachingTip: 'Your arms are unbalanced during takeoff',
          fixInstructions:
            'Keep both arms at chest height. Practice with arms symmetrical.',
          severity: 'moderate',
        });
      }
    }

    // Insufficient Pop: Hip velocity too low
    if (deltaMap.has('hipVelocity')) {
      const hipVel = deltaMap.get('hipVelocity')!;
      if (hipVel.direction === 'rider_lower' && Math.abs(hipVel.peakDelta) > 0.3) {
        archetypes.push({
          archetype: 'insufficient_pop',
          confidence: Math.min(100, 70 + Math.abs(hipVel.peakDelta) * 100),
          signals: ['hipVelocity'],
          coachingTip: 'Your pop is not as explosive as the reference',
          fixInstructions:
            'Increase your extension speed. Snap harder off the tail.',
          severity: 'moderate',
        });
      }
    }
  }

  // Air Phase Archetypes
  if (phase === 'air') {
    // Excessive Rotation: Spinning too fast
    if (deltaMap.has('chestRotation')) {
      const chestRot = deltaMap.get('chestRotation')!;
      if (chestRot.direction === 'rider_higher' && Math.abs(chestRot.peakDelta) > 30) {
        archetypes.push({
          archetype: 'excessive_rotation',
          confidence: Math.min(100, 75 + Math.abs(chestRot.peakDelta) / 2),
          signals: ['chestRotation'],
          coachingTip: 'You are rotating ~{degrees}° more than the reference',
          fixInstructions:
            'Reduce your snap intensity. Control your rotation speed.',
          severity: 'moderate',
        });
      }
    }

    // Unstable Air: High form variance
    if (deltaMap.has('formVariance')) {
      const variance = deltaMap.get('formVariance')!;
      if (variance.direction === 'rider_higher' && variance.peakDelta > 0.2) {
        archetypes.push({
          archetype: 'unstable_air',
          confidence: Math.min(100, 70 + variance.peakDelta * 100),
          signals: ['formVariance'],
          coachingTip: 'Your body position is unstable in the air',
          fixInstructions:
            'Focus on holding a stable position. Minimize body adjustments.',
          severity: 'moderate',
        });
      }
    }
  }

  // Landing Phase Archetypes
  if (phase === 'landing') {
    // Asymmetric Landing: Feet landing at different times
    if (deltaMap.has('ankleLandingSync')) {
      const ankleSync = deltaMap.get('ankleLandingSync')!;
      if (Math.abs(ankleSync.peakDelta) > 0.1) {
        archetypes.push({
          archetype: 'asymmetric_landing',
          confidence: Math.min(100, 75 + Math.abs(ankleSync.peakDelta) * 100),
          signals: ['ankleLandingSync'],
          coachingTip: 'Your feet are landing ~{timing}ms apart',
          fixInstructions:
            'Land both feet at the same time. Practice synchronized landings.',
          severity: 'moderate',
        });
      }
    }

    // Late Compression: Not absorbing impact properly
    if (deltaMap.has('hipVelocity')) {
      const hipVel = deltaMap.get('hipVelocity')!;
      if (hipVel.peakTimingDelta > 0.1) {
        archetypes.push({
          archetype: 'late_compression',
          confidence: Math.min(100, 70 + hipVel.peakTimingDelta * 100),
          signals: ['hipVelocity'],
          coachingTip: 'You are absorbing impact too late',
          fixInstructions:
            'Bend your knees earlier on landing. Prepare for impact sooner.',
          severity: 'moderate',
        });
      }
    }
  }

  // Sort by confidence
  archetypes.sort((a, b) => b.confidence - a.confidence);

  return archetypes;
}

/**
 * Get top N archetypes
 */
export function getTopArchetypes(
  archetypes: ArchetypeDetection[],
  topN: number = 2
): ArchetypeDetection[] {
  return archetypes.slice(0, topN);
}

/**
 * Format archetype detection for coaching display
 */
export function formatArchetypeForCoaching(
  archetype: ArchetypeDetection,
  context?: { timing?: number; degrees?: number }
): string {
  let tip = archetype.coachingTip;

  if (context?.timing) {
    tip = tip.replace('{timing}', Math.abs(context.timing).toFixed(0));
  }
  if (context?.degrees) {
    tip = tip.replace('{degrees}', Math.abs(context.degrees).toFixed(1));
  }

  return tip;
}
