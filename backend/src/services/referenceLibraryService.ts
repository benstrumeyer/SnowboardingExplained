/**
 * Reference Library Service
 * Manages a comprehensive library of reference poses and signals from coach videos
 * Extracts and stores all signals for each phase of each trick
 */

import { ObjectId } from 'mongodb';
import { db } from '../db/connection';
import { PoseFrame, Phase, VideoAnalysis } from '../types/formAnalysis';
import { calculatePhaseDetectionSignals } from '../utils/phaseDetectionSignals';
import { extractStackedPositionMetrics } from '../utils/stackedPositionAnalyzer';

export interface ReferenceSignalSet {
  _id?: string;
  trick: string; // e.g., "backside_360", "frontside_180"
  phase: Phase;
  stance: 'regular' | 'goofy';
  sourceVideoId: string;
  sourceFrameRange: {
    startFrame: number;
    endFrame: number;
  };
  
  // All extracted signals
  signals: {
    edgeAngle: number[];
    hipHeight: number[];
    hipVelocity: number[];
    hipAcceleration: number[];
    ankleToHipRatio: number[];
    chestRotation: number[];
    chestRotationVelocity: number[];
    headRotation: number[];
    bodyStackedness: number[];
    formVariance: number[];
    ankleLandingSync: Array<{
      frame: number;
      leftAnkleY: number;
      rightAnkleY: number;
      yDifference: number;
      timingOffsetMs: number;
    }>;
  };

  // Stacked position metrics
  stackedPosition: {
    leftKneeAngle: number;
    rightKneeAngle: number;
    kneeAngleAverage: number;
    hipForwardBias: number;
    stanceWidth: number;
    bodyStackedness: number;
    weightDistribution: number;
    ankleHeightDifference: number;
    overallStackedness: number;
  };

  // Statistics
  statistics: {
    frameCount: number;
    averageConfidence: number;
    signalQuality: number; // 0-100
  };

  // Metadata
  coachName: string;
  description: string;
  quality: 1 | 2 | 3 | 4 | 5; // 1=poor, 5=perfect
  notes: string;
  tags: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extract all signals from a video phase and store as reference
 */
export async function createReferenceSignalSet(
  trick: string,
  phase: Phase,
  stance: 'regular' | 'goofy',
  sourceVideoId: string,
  startFrame: number,
  endFrame: number,
  coachName: string,
  description: string,
  quality: 1 | 2 | 3 | 4 | 5,
  notes: string = '',
  tags: string[] = []
): Promise<ReferenceSignalSet> {
  // Fetch the video analysis
  const videoAnalysis = (await db
    .collection('videoAnalyses')
    .findOne({ videoId: sourceVideoId })) as VideoAnalysis | null;

  if (!videoAnalysis) {
    throw new Error(`Video ${sourceVideoId} not found`);
  }

  // Extract frames for this phase
  const phaseFrames = videoAnalysis.poseTimeline.slice(startFrame, endFrame + 1);

  if (phaseFrames.length === 0) {
    throw new Error(`No frames found in range ${startFrame}-${endFrame}`);
  }

  // Calculate phase detection signals
  const phaseSignals = calculatePhaseDetectionSignals(phaseFrames);

  // Calculate average stacked position
  const stackedPositions = phaseFrames.map((f) => extractStackedPositionMetrics(f));
  const avgStackedPosition = {
    leftKneeAngle: stackedPositions.reduce((sum, s) => sum + s.leftKneeAngle, 0) / phaseFrames.length,
    rightKneeAngle: stackedPositions.reduce((sum, s) => sum + s.rightKneeAngle, 0) / phaseFrames.length,
    kneeAngleAverage: stackedPositions.reduce((sum, s) => sum + s.kneeAngleAverage, 0) / phaseFrames.length,
    hipForwardBias: stackedPositions.reduce((sum, s) => sum + s.hipForwardBias, 0) / phaseFrames.length,
    stanceWidth: stackedPositions.reduce((sum, s) => sum + s.stanceWidth, 0) / phaseFrames.length,
    bodyStackedness: stackedPositions.reduce((sum, s) => sum + s.bodyStackedness, 0) / phaseFrames.length,
    weightDistribution: stackedPositions.reduce((sum, s) => sum + s.weightDistribution, 0) / phaseFrames.length,
    ankleHeightDifference: stackedPositions.reduce((sum, s) => sum + s.ankleHeightDifference, 0) / phaseFrames.length,
    overallStackedness: stackedPositions.reduce((sum, s) => sum + s.overallStackedness, 0) / phaseFrames.length,
  };

  // Calculate average confidence
  const avgConfidence = phaseFrames.reduce((sum, f) => sum + f.confidence, 0) / phaseFrames.length;

  // Calculate signal quality (based on confidence and consistency)
  const signalQuality = Math.min(100, avgConfidence * 100);

  const referenceSet: ReferenceSignalSet = {
    trick,
    phase,
    stance,
    sourceVideoId,
    sourceFrameRange: { startFrame, endFrame },
    signals: {
      edgeAngle: phaseSignals.edgeAngle,
      hipHeight: phaseSignals.hipHeight,
      hipVelocity: phaseSignals.hipVelocity,
      hipAcceleration: phaseSignals.hipAcceleration,
      ankleToHipRatio: phaseSignals.ankleToHipRatio,
      chestRotation: phaseSignals.chestRotation,
      chestRotationVelocity: phaseSignals.chestRotationVelocity,
      headRotation: phaseSignals.headRotation,
      bodyStackedness: phaseSignals.bodyStackedness,
      formVariance: phaseSignals.formVariance,
      ankleLandingSync: phaseSignals.ankleLandingSync,
    },
    stackedPosition: avgStackedPosition,
    statistics: {
      frameCount: phaseFrames.length,
      averageConfidence: avgConfidence,
      signalQuality,
    },
    coachName,
    description,
    quality,
    notes,
    tags,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in database
  const collection = db.collection('referenceSignalSets');
  const result = await collection.insertOne(referenceSet as any);

  return {
    ...referenceSet,
    _id: result.insertedId.toString(),
  };
}

/**
 * Get reference signal set by ID
 */
export async function getReferenceSignalSet(id: string): Promise<ReferenceSignalSet | null> {
  const collection = db.collection('referenceSignalSets');
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? (doc as unknown as ReferenceSignalSet) : null;
}

/**
 * Get all reference signal sets for a trick and phase
 */
export async function getReferenceSignalSetsForPhase(
  trick: string,
  phase: Phase,
  stance?: 'regular' | 'goofy'
): Promise<ReferenceSignalSet[]> {
  const collection = db.collection('referenceSignalSets');
  const query: any = { trick, phase };
  if (stance) {
    query.stance = stance;
  }
  const docs = await collection.find(query).toArray();
  return docs as unknown as ReferenceSignalSet[];
}

/**
 * Get best reference signal set for a trick and phase (highest quality)
 */
export async function getBestReferenceSignalSet(
  trick: string,
  phase: Phase,
  stance: 'regular' | 'goofy'
): Promise<ReferenceSignalSet | null> {
  const collection = db.collection('referenceSignalSets');
  const doc = await collection
    .findOne({ trick, phase, stance }, { sort: { quality: -1 } });
  return doc ? (doc as unknown as ReferenceSignalSet) : null;
}

/**
 * Get all reference signal sets for a trick
 */
export async function getReferenceSignalSetsForTrick(trick: string): Promise<ReferenceSignalSet[]> {
  const collection = db.collection('referenceSignalSets');
  const docs = await collection.find({ trick }).toArray();
  return docs as unknown as ReferenceSignalSet[];
}

/**
 * Get all reference signal sets by coach
 */
export async function getReferenceSignalSetsByCoach(coachName: string): Promise<ReferenceSignalSet[]> {
  const collection = db.collection('referenceSignalSets');
  const docs = await collection.find({ coachName }).toArray();
  return docs as unknown as ReferenceSignalSet[];
}

/**
 * List all reference signal sets
 */
export async function listAllReferenceSignalSets(): Promise<ReferenceSignalSet[]> {
  const collection = db.collection('referenceSignalSets');
  const docs = await collection.find({}).toArray();
  return docs as unknown as ReferenceSignalSet[];
}

/**
 * Update reference signal set
 */
export async function updateReferenceSignalSet(
  id: string,
  updates: Partial<ReferenceSignalSet>
): Promise<ReferenceSignalSet | null> {
  const collection = db.collection('referenceSignalSets');
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  return result && result.value ? (result.value as unknown as ReferenceSignalSet) : null;
}

/**
 * Delete reference signal set
 */
export async function deleteReferenceSignalSet(id: string): Promise<boolean> {
  const collection = db.collection('referenceSignalSets');
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * Get statistics about the reference library
 */
export async function getReferenceLibraryStats(): Promise<{
  totalReferenceSets: number;
  tricksCount: number;
  tricks: string[];
  phasesCount: number;
  phases: Phase[];
  coachesCount: number;
  coaches: string[];
  averageQuality: number;
}> {
  const collection = db.collection('referenceSignalSets');
  const docs = await collection.find({}).toArray();
  const allSets = docs as unknown as ReferenceSignalSet[];

  const tricks = new Set(allSets.map((s) => s.trick));
  const phases = new Set(allSets.map((s) => s.phase));
  const coaches = new Set(allSets.map((s) => s.coachName));
  const avgQuality = allSets.reduce((sum, s) => sum + s.quality, 0) / (allSets.length || 1);

  return {
    totalReferenceSets: allSets.length,
    tricksCount: tricks.size,
    tricks: Array.from(tricks),
    phasesCount: phases.size,
    phases: Array.from(phases) as Phase[],
    coachesCount: coaches.size,
    coaches: Array.from(coaches),
    averageQuality: avgQuality,
  };
}

/**
 * Search reference signal sets by tags
 */
export async function searchReferenceSignalSetsByTags(tags: string[]): Promise<ReferenceSignalSet[]> {
  const collection = db.collection('referenceSignalSets');
  const docs = await collection
    .find({ tags: { $in: tags } })
    .toArray();
  return docs as unknown as ReferenceSignalSet[];
}

/**
 * Get reference signal sets with minimum quality
 */
export async function getReferenceSignalSetsWithMinQuality(
  minQuality: number
): Promise<ReferenceSignalSet[]> {
  const collection = db.collection('referenceSignalSets');
  const docs = await collection
    .find({ quality: { $gte: minQuality } })
    .toArray();
  return docs as unknown as ReferenceSignalSet[];
}
