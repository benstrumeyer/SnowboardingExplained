/**
 * Reference Stacked Position Service
 * Manages storage and retrieval of reference stacked positions
 * Allows comparing rider positions to perfect stacked form
 */

import { ObjectId } from 'mongodb';
import { db } from '../db/connection';
import { PoseFrame } from '../types/formAnalysis';
import {
  StackedPositionMetrics,
  extractStackedPositionMetrics,
  calculateAverageStackedPosition,
} from '../utils/stackedPositionAnalyzer';

export interface ReferenceStackedPosition {
  _id?: string;
  name: string; // e.g., "Perfect Stacked Position - Regular Stance"
  description: string;
  stance: 'regular' | 'goofy';
  trick?: string; // Optional: specific trick this is for
  metrics: StackedPositionMetrics;
  referenceFrame: PoseFrame; // The actual pose frame
  acceptableRanges?: {
    kneeAngle?: { min: number; max: number };
    hipForwardBias?: { min: number; max: number };
    weightDistribution?: { min: number; max: number };
    bodyStackedness?: { min: number; max: number };
  };
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean; // Mark as default reference
}

/**
 * Store a reference stacked position
 */
export async function storeReferenceStackedPosition(
  name: string,
  description: string,
  stance: 'regular' | 'goofy',
  referenceFrame: PoseFrame,
  trick?: string,
  acceptableRanges?: ReferenceStackedPosition['acceptableRanges']
): Promise<ReferenceStackedPosition> {
  const metrics = extractStackedPositionMetrics(referenceFrame);

  const reference: Omit<ReferenceStackedPosition, '_id'> = {
    name,
    description,
    stance,
    trick,
    metrics,
    referenceFrame,
    acceptableRanges,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const collection = db.collection('referenceStackedPositions');
  const result = await collection.insertOne(reference as any);

  return {
    ...reference,
    _id: result.insertedId.toString(),
  } as ReferenceStackedPosition;
}

/**
 * Get reference stacked position by ID
 */
export async function getReferenceStackedPosition(
  id: string
): Promise<ReferenceStackedPosition | null> {
  const collection = db.collection('referenceStackedPositions');
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? (doc as unknown as ReferenceStackedPosition) : null;
}

/**
 * Get default reference stacked position for a stance
 */
export async function getDefaultStackedPosition(
  stance: 'regular' | 'goofy'
): Promise<ReferenceStackedPosition | null> {
  const collection = db.collection('referenceStackedPositions');
  const doc = await collection.findOne({
    stance,
    isDefault: true,
  });
  return doc ? (doc as unknown as ReferenceStackedPosition) : null;
}

/**
 * Get all reference stacked positions for a stance
 */
export async function getStackedPositionsForStance(
  stance: 'regular' | 'goofy'
): Promise<ReferenceStackedPosition[]> {
  const collection = db.collection('referenceStackedPositions');
  const docs = await collection
    .find({ stance })
    .toArray();
  return docs as unknown as ReferenceStackedPosition[];
}

/**
 * Get reference stacked position for a specific trick
 */
export async function getStackedPositionForTrick(
  trick: string,
  stance: 'regular' | 'goofy'
): Promise<ReferenceStackedPosition | null> {
  const collection = db.collection('referenceStackedPositions');
  const doc = await collection.findOne({
    trick,
    stance,
  });
  return doc ? (doc as unknown as ReferenceStackedPosition) : null;
}

/**
 * Update reference stacked position
 */
export async function updateReferenceStackedPosition(
  id: string,
  updates: Partial<ReferenceStackedPosition>
): Promise<ReferenceStackedPosition | null> {
  const collection = db.collection('referenceStackedPositions');
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

  return result && result.value ? (result.value as unknown as ReferenceStackedPosition) : null;
}

/**
 * Set a reference stacked position as default
 */
export async function setAsDefaultStackedPosition(
  id: string,
  stance: 'regular' | 'goofy'
): Promise<void> {
  const collection = db.collection('referenceStackedPositions');

  // Remove default flag from other positions with same stance
  await collection.updateMany({ stance, isDefault: true }, { $set: { isDefault: false } });

  // Set this one as default
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: { isDefault: true } });
}

/**
 * Delete reference stacked position
 */
export async function deleteReferenceStackedPosition(id: string): Promise<boolean> {
  const collection = db.collection('referenceStackedPositions');
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * List all reference stacked positions
 */
export async function listAllReferenceStackedPositions(): Promise<ReferenceStackedPosition[]> {
  const collection = db.collection('referenceStackedPositions');
  const docs = await collection.find({}).toArray();
  return docs as unknown as ReferenceStackedPosition[];
}

/**
 * Create default stacked positions for both stances
 * Call this once during setup
 */
export async function initializeDefaultStackedPositions(): Promise<void> {
  const collection = db.collection('referenceStackedPositions');

  // Check if defaults already exist
  const existingDefaults = await collection.countDocuments({ isDefault: true });
  if (existingDefaults > 0) {
    console.log('Default stacked positions already exist');
    return;
  }

  console.log('Initializing default stacked positions...');
  console.log('Note: You need to upload a perfect stacked position video first');
  console.log('Then extract a frame and call storeReferenceStackedPosition()');
}
