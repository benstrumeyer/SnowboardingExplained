/**
 * Type-safe MongoDB document casting utilities
 * Provides safe casting from MongoDB WithId<Document> to typed interfaces
 */

import { WithId, Document } from 'mongodb';
import { VideoAnalysis } from '../types/formAnalysis';

/**
 * Type guard to check if a document is a valid VideoAnalysis
 * Validates the presence of required fields
 */
function isVideoAnalysis(doc: unknown): doc is VideoAnalysis {
  if (!doc || typeof doc !== 'object') return false;
  
  const obj = doc as Record<string, unknown>;
  
  // Check required fields
  return (
    typeof obj.videoId === 'string' &&
    obj.uploadedAt instanceof Date &&
    typeof obj.duration === 'number' &&
    typeof obj.frameCount === 'number' &&
    typeof obj.fps === 'number' &&
    Array.isArray(obj.poseTimeline) &&
    typeof obj.analysisStatus === 'string'
  );
}

/**
 * Safely cast a MongoDB document to VideoAnalysis
 * Throws an error if the document doesn't have required fields
 */
export function castToVideoAnalysis(doc: WithId<Document> | null): VideoAnalysis | null {
  if (!doc) return null;
  
  if (!isVideoAnalysis(doc)) {
    throw new Error(
      `Invalid VideoAnalysis document: missing required fields. ` +
      `Got: ${JSON.stringify(Object.keys(doc))}`
    );
  }
  
  return doc as unknown as VideoAnalysis;
}

/**
 * Safely cast a MongoDB document to VideoAnalysis with fallback
 * Returns null if document is invalid instead of throwing
 */
export function trycastToVideoAnalysis(doc: WithId<Document> | null): VideoAnalysis | null {
  if (!doc) return null;
  
  try {
    return castToVideoAnalysis(doc);
  } catch {
    return null;
  }
}

/**
 * Safely cast an array of MongoDB documents to VideoAnalysis[]
 */
export function castToVideoAnalysisArray(docs: WithId<Document>[]): VideoAnalysis[] {
  return docs
    .map(doc => trycastToVideoAnalysis(doc))
    .filter((doc): doc is VideoAnalysis => doc !== null);
}


/**
 * Type guard to check if a document is a valid VideoSequence
 */
function isVideoSequence(doc: unknown): doc is any {
  if (!doc || typeof doc !== 'object') return false;
  
  const obj = doc as Record<string, unknown>;
  
  // Check required fields for VideoSequence
  return (
    typeof obj.videoId === 'string' &&
    typeof obj.fps === 'number' &&
    typeof obj.totalFrames === 'number' &&
    typeof obj.videoDuration === 'number' &&
    Array.isArray(obj.frames)
  );
}

/**
 * Safely cast a MongoDB document to VideoSequence
 */
export function castToVideoSequence(doc: any | null): any | null {
  if (!doc) return null;
  
  if (!isVideoSequence(doc)) {
    throw new Error(
      `Invalid VideoSequence document: missing required fields. ` +
      `Got: ${JSON.stringify(Object.keys(doc))}`
    );
  }
  
  return doc;
}

/**
 * Safely cast an array of MongoDB documents to VideoSequence[]
 */
export function castToVideoSequenceArray(docs: any[]): any[] {
  return docs
    .map(doc => {
      try {
        return castToVideoSequence(doc);
      } catch {
        return null;
      }
    })
    .filter((doc): doc is any => doc !== null);
}
