/**
 * Delta Computer
 * Compares rider signals to reference signals
 * Computes meaningful deltas: peak magnitude, peak timing, velocity peak
 */

import { Phase } from '../types/formAnalysis';
import { sampleSignalAtNormalizedTimes } from './phaseNormalizer';

export interface SignalDelta {
  signal: string;
  phase: Phase;
  peakDelta: number; // Difference in peak values
  peakTimingDelta: number; // Difference in when peak occurs (normalized time)
  velocityPeakDelta: number; // Difference in peak velocity
  averageDelta: number; // Average absolute difference across phase
  confidence: number; // 0-100, based on signal quality
  direction: 'rider_higher' | 'rider_lower' | 'neutral'; // Which way the delta goes
}

export interface ComparisonResult {
  riderVideoId: string;
  referenceVideoId: string;
  phase: Phase;
  deltas: SignalDelta[];
  topDeltas: SignalDelta[]; // Top 1-2 most significant deltas
  overallSimilarity: number; // 0-100
}

/**
 * Find peak value and its normalized time in a signal
 */
function findPeak(signal: number[]): { value: number; normalizedTime: number } {
  if (signal.length === 0) {
    return { value: 0, normalizedTime: 0 };
  }

  let maxValue = signal[0];
  let maxIndex = 0;

  for (let i = 1; i < signal.length; i++) {
    if (Math.abs(signal[i]) > Math.abs(maxValue)) {
      maxValue = signal[i];
      maxIndex = i;
    }
  }

  return {
    value: maxValue,
    normalizedTime: maxIndex / (signal.length - 1 || 1),
  };
}

/**
 * Calculate velocity (rate of change) of a signal
 */
function calculateVelocity(signal: number[]): number[] {
  const velocity: number[] = [0];

  for (let i = 1; i < signal.length; i++) {
    velocity.push(signal[i] - signal[i - 1]);
  }

  return velocity;
}

/**
 * Find peak velocity in a signal
 */
function findVelocityPeak(signal: number[]): number {
  const velocity = calculateVelocity(signal);
  let maxVelocity = 0;

  for (const v of velocity) {
    if (Math.abs(v) > Math.abs(maxVelocity)) {
      maxVelocity = v;
    }
  }

  return maxVelocity;
}

/**
 * Compare two signals and compute deltas
 */
export function compareSignals(
  riderSignal: number[],
  referenceSignal: number[],
  signalName: string,
  phase: Phase,
  confidence: number = 85
): SignalDelta {
  // Sample both signals at normalized times for fair comparison
  const riderSamples = sampleSignalAtNormalizedTimes(riderSignal, 0, riderSignal.length - 1, 100);
  const referenceSamples = sampleSignalAtNormalizedTimes(
    referenceSignal,
    0,
    referenceSignal.length - 1,
    100
  );

  // Extract values
  const riderValues = riderSamples.map((s) => s.value);
  const referenceValues = referenceSamples.map((s) => s.value);

  // Find peaks
  const riderPeak = findPeak(riderValues);
  const referencePeak = findPeak(referenceValues);

  // Calculate deltas
  const peakDelta = riderPeak.value - referencePeak.value;
  const peakTimingDelta = riderPeak.normalizedTime - referencePeak.normalizedTime;
  const riderVelocityPeak = findVelocityPeak(riderValues);
  const referenceVelocityPeak = findVelocityPeak(referenceValues);
  const velocityPeakDelta = riderVelocityPeak - referenceVelocityPeak;

  // Calculate average delta
  let totalDelta = 0;
  for (let i = 0; i < riderValues.length; i++) {
    totalDelta += Math.abs(riderValues[i] - referenceValues[i]);
  }
  const averageDelta = totalDelta / riderValues.length;

  // Determine direction
  let direction: 'rider_higher' | 'rider_lower' | 'neutral' = 'neutral';
  if (Math.abs(peakDelta) > 1) {
    direction = peakDelta > 0 ? 'rider_higher' : 'rider_lower';
  }

  return {
    signal: signalName,
    phase,
    peakDelta,
    peakTimingDelta,
    velocityPeakDelta,
    averageDelta,
    confidence,
    direction,
  };
}

/**
 * Compare multiple signals and rank by significance
 */
export function compareMultipleSignals(
  riderSignals: { [key: string]: number[] },
  referenceSignals: { [key: string]: number[] },
  phase: Phase
): SignalDelta[] {
  const deltas: SignalDelta[] = [];

  for (const signalName in riderSignals) {
    if (referenceSignals[signalName]) {
      const delta = compareSignals(
        riderSignals[signalName],
        referenceSignals[signalName],
        signalName,
        phase
      );
      deltas.push(delta);
    }
  }

  // Sort by magnitude × confidence
  deltas.sort((a, b) => {
    const aMagnitude = Math.abs(a.peakDelta) * (a.confidence / 100);
    const bMagnitude = Math.abs(b.peakDelta) * (b.confidence / 100);
    return bMagnitude - aMagnitude;
  });

  return deltas;
}

/**
 * Get top N most significant deltas
 */
export function getTopDeltas(deltas: SignalDelta[], topN: number = 2): SignalDelta[] {
  return deltas.slice(0, topN);
}

/**
 * Calculate overall similarity score (0-100)
 */
export function calculateSimilarityScore(deltas: SignalDelta[]): number {
  if (deltas.length === 0) return 100;

  // Average the inverse of normalized deltas
  let totalSimilarity = 0;

  for (const delta of deltas) {
    // Normalize delta to 0-1 range (assuming max reasonable delta is 50)
    const normalizedDelta = Math.min(Math.abs(delta.peakDelta) / 50, 1);
    const similarity = (1 - normalizedDelta) * 100;
    totalSimilarity += similarity;
  }

  return Math.max(0, totalSimilarity / deltas.length);
}
