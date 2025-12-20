/**
 * MongoDB Collection Schemas for Form Analysis System
 * Defines the structure of documents stored in MongoDB
 */

import { Db, Collection } from 'mongodb';
import {
  VideoAnalysis,
  ReferencePose,
  CoachingTip,
} from '../../../types/formAnalysis';

/**
 * Initialize all form analysis collections with indexes
 */
export async function initializeFormAnalysisCollections(db: Db): Promise<void> {
  // VideoAnalysis collection
  const videoAnalysisCollection = db.collection('videoAnalysis');
  await videoAnalysisCollection.createIndex({ videoId: 1 }, { unique: true });
  await videoAnalysisCollection.createIndex({ uploadedAt: -1 });
  await videoAnalysisCollection.createIndex({ 'phases.trickType': 1 });
  await videoAnalysisCollection.createIndex({ stance: 1 });

  // ReferencePose collection
  const referencePoseCollection = db.collection('referencePoses');
  await referencePoseCollection.createIndex({ trickName: 1, phase: 1, stance: 1 });
  await referencePoseCollection.createIndex({ isPrimary: 1 });
  await referencePoseCollection.createIndex({ createdAt: -1 });

  // CoachingTip collection
  const coachingTipCollection = db.collection('coachingTips');
  await coachingTipCollection.createIndex({ trickName: 1 });
  await coachingTipCollection.createIndex({ phase: 1 });
  await coachingTipCollection.createIndex({ problemType: 1 });
  await coachingTipCollection.createIndex({ relevanceScore: -1 });

  console.log('✓ Form analysis collections initialized with indexes');
}

/**
 * Get VideoAnalysis collection
 */
export function getVideoAnalysisCollection(db: Db): Collection<VideoAnalysis> {
  return db.collection('videoAnalysis') as Collection<VideoAnalysis>;
}

/**
 * Get ReferencePose collection
 */
export function getReferencePoseCollection(db: Db): Collection<ReferencePose> {
  return db.collection('referencePoses') as Collection<ReferencePose>;
}

/**
 * Get CoachingTip collection
 */
export function getCoachingTipCollection(db: Db): Collection<CoachingTip> {
  return db.collection('coachingTips') as Collection<CoachingTip>;
}

/**
 * Sample VideoAnalysis document structure
 */
export const videoAnalysisSampleSchema = {
  videoId: 'string (UUID)',
  uploadedAt: 'Date',
  duration: 'number (seconds)',
  frameCount: 'number',
  fps: 'number',
  intendedTrick: 'string | null',
  inferredTrick: {
    name: 'string',
    confidence: 'number (0-100)',
    alternatives: 'string[]',
  },
  stance: 'regular | goofy',
  analysisStatus: 'untagged | in_progress | fully_analyzed',
  poseTimeline: 'PoseFrame[]',
  phases: 'PhaseMap',
  measurements: 'MeasurementMap',
  evaluations: 'EvaluationMap',
  comparison: 'FormComparison | null',
  summary: 'VideoSummary',
  processingErrors: [
    {
      stage: 'string',
      error: 'string',
      timestamp: 'Date',
    },
  ],
};

/**
 * Sample ReferencePose document structure
 */
export const referencePoseSampleSchema = {
  trickName: 'string',
  phase: 'setupCarve | windUp | snap | takeoff | air | landing',
  stance: 'regular | goofy',
  qualityRating: '1 | 2 | 3 | 4 | 5',
  sourceVideoId: 'string',
  sourceFrameNumber: 'number',
  poseData: 'PoseFrame',
  jointAngles: 'JointAngles',
  acceptableRanges: {
    '[metric]': { min: 'number', max: 'number' },
  },
  keyPoints: 'string[]',
  commonMistakes: 'string[]',
  notes: 'string',
  styleVariation: 'compact | extended | aggressive | smooth | counter_rotated | squared',
  isPrimary: 'boolean',
  createdAt: 'Date',
  updatedAt: 'Date',
};

/**
 * Sample CoachingTip document structure
 */
export const coachingTipSampleSchema = {
  trickName: 'string',
  phase: 'setupCarve | windUp | snap | takeoff | air | landing',
  problemType: 'string',
  tip: 'string',
  fixInstructions: 'string',
  commonCauses: 'string[]',
  sourceVideoId: 'string',
  sourceTimestamp: 'number',
  relevanceScore: 'number (0-100)',
  createdAt: 'Date',
};
