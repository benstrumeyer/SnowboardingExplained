/**
 * Comparison Service
 * Orchestrates the comparison between rider and reference videos
 * Handles phase normalization, delta computation, and archetype detection
 */

import { Phase, VideoAnalysis, PhaseDetectionSignals } from '../types/formAnalysis';
import { normalizePhase } from '../utils/phaseNormalizer';
import {
  compareMultipleSignals,
  getTopDeltas,
  calculateSimilarityScore,
  SignalDelta,
  ComparisonResult,
} from '../utils/deltaComputer';
import {
  detectArchetypes,
  getTopArchetypes,
  ArchetypeDetection,
  formatArchetypeForCoaching,
} from '../utils/coachingArchetypeDetector';

export interface PhaseComparisonResult {
  phase: Phase;
  deltas: SignalDelta[];
  topDeltas: SignalDelta[];
  archetypes: ArchetypeDetection[];
  topArchetypes: ArchetypeDetection[];
  similarity: number;
}

export interface FullComparisonResult {
  riderVideoId: string;
  referenceVideoId: string;
  phases: Map<Phase, PhaseComparisonResult>;
  overallSimilarity: number;
  topIssues: Array<{
    phase: Phase;
    archetype: ArchetypeDetection;
    coachingTip: string;
  }>;
}

/**
 * Compare rider video to reference video
 */
export async function compareVideos(
  riderAnalysis: VideoAnalysis,
  referenceAnalysis: VideoAnalysis
): Promise<FullComparisonResult> {
  const phases: Map<Phase, PhaseComparisonResult> = new Map();
  const allTopArchetypes: Array<{
    phase: Phase;
    archetype: ArchetypeDetection;
  }> = [];

  // Compare each phase
  const phaseNames: Phase[] = ['setupCarve', 'windUp', 'snap', 'takeoff', 'air', 'landing'];

  for (const phaseName of phaseNames) {
    const riderPhase = riderAnalysis.phases.phases[phaseName as keyof typeof riderAnalysis.phases.phases];
    const referencePhase = referenceAnalysis.phases.phases[phaseName as keyof typeof referenceAnalysis.phases.phases];

    if (!riderPhase || !referencePhase) continue;

    // Normalize phases to [0, 1] time
    const riderNormalized = normalizePhase(
      phaseName,
      riderPhase.startFrame,
      riderPhase.endFrame,
      riderAnalysis.poseTimeline
    );

    const referenceNormalized = normalizePhase(
      phaseName,
      referencePhase.startFrame,
      referencePhase.endFrame,
      referenceAnalysis.poseTimeline
    );

    // Extract signals for comparison
    const riderSignals = extractSignalsForPhase(
      riderAnalysis.measurements,
      phaseName
    );
    const referenceSignals = extractSignalsForPhase(
      referenceAnalysis.measurements,
      phaseName
    );

    // Compare signals
    const deltas = compareMultipleSignals(riderSignals, referenceSignals, phaseName);
    const topDeltas = getTopDeltas(deltas, 2);
    const similarity = calculateSimilarityScore(deltas);

    // Detect archetypes
    const archetypes = detectArchetypes(deltas, phaseName);
    const topArchetypes = getTopArchetypes(archetypes, 2);

    // Store phase comparison
    phases.set(phaseName, {
      phase: phaseName,
      deltas,
      topDeltas,
      archetypes,
      topArchetypes,
      similarity,
    });

    // Collect top archetypes
    for (const archetype of topArchetypes) {
      allTopArchetypes.push({ phase: phaseName, archetype });
    }
  }

  // Calculate overall similarity
  let totalSimilarity = 0;
  let phaseCount = 0;
  for (const [, phaseResult] of phases) {
    totalSimilarity += phaseResult.similarity;
    phaseCount++;
  }
  const overallSimilarity = phaseCount > 0 ? totalSimilarity / phaseCount : 100;

  // Format top issues for coaching
  const topIssues = allTopArchetypes
    .sort((a, b) => b.archetype.confidence - a.archetype.confidence)
    .slice(0, 3)
    .map(({ phase, archetype }) => ({
      phase,
      archetype,
      coachingTip: formatArchetypeForCoaching(archetype),
    }));

  return {
    riderVideoId: riderAnalysis.videoId,
    referenceVideoId: referenceAnalysis.videoId,
    phases,
    overallSimilarity,
    topIssues,
  };
}

/**
 * Extract numeric signals from measurements for a specific phase
 */
function extractSignalsForPhase(
  measurements: any,
  phase: Phase
): { [key: string]: number[] } {
  const signals: { [key: string]: number[] } = {};

  // Map phase to measurement key
  const measurementKey = phase === 'setupCarve' ? 'setupCarve' : phase;
  const phaseMeasurements = measurements[measurementKey];

  if (!phaseMeasurements) {
    return signals;
  }

  // Extract numeric arrays from measurements
  for (const [key, value] of Object.entries(phaseMeasurements)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') {
      signals[key] = value as number[];
    }
  }

  return signals;
}

/**
 * Get comparison result for a specific phase
 */
export function getPhaseComparison(
  result: FullComparisonResult,
  phase: Phase
): PhaseComparisonResult | undefined {
  return result.phases.get(phase);
}

/**
 * Format comparison result for API response
 */
export function formatComparisonForAPI(result: FullComparisonResult) {
  const phases: any = {};

  for (const [phaseName, phaseResult] of result.phases) {
    phases[phaseName] = {
      similarity: phaseResult.similarity,
      topDeltas: phaseResult.topDeltas.map((d) => ({
        signal: d.signal,
        peakDelta: d.peakDelta.toFixed(2),
        peakTimingDelta: d.peakTimingDelta.toFixed(3),
        direction: d.direction,
      })),
      topArchetypes: phaseResult.topArchetypes.map((a) => ({
        archetype: a.archetype,
        confidence: a.confidence.toFixed(0),
        coachingTip: formatArchetypeForCoaching(a),
        severity: a.severity,
      })),
    };
  }

  return {
    riderVideoId: result.riderVideoId,
    referenceVideoId: result.referenceVideoId,
    overallSimilarity: result.overallSimilarity.toFixed(0),
    phases,
    topIssues: result.topIssues.map((issue) => ({
      phase: issue.phase,
      archetype: issue.archetype.archetype,
      confidence: issue.archetype.confidence.toFixed(0),
      coachingTip: issue.coachingTip,
      severity: issue.archetype.severity,
    })),
  };
}
