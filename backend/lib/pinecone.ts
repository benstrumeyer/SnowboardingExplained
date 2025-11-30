/**
 * Pinecone Service
 * Handles vector search for relevant coaching content
 * Supports primary trick tutorials with priority sorting
 */

import { Pinecone } from '@pinecone-database/pinecone';
import type { VideoSegment } from './types';

let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export interface SearchOptions {
  topK?: number;
  filterPrimary?: boolean;  // Only return primary trick tutorials
  trickId?: string;         // Filter by specific trick (legacy)
  trickName?: string;       // Filter by trickName metadata
}

export interface EnhancedVideoSegment extends VideoSegment {
  isPrimary?: boolean;
  trickId?: string;
  trickName?: string;
  stepNumber?: number;
  totalSteps?: number;
  stepTitle?: string;
}

export async function searchVideoSegments(
  queryEmbedding: number[],
  topK: number = 5
): Promise<EnhancedVideoSegment[]> {
  return searchVideoSegmentsWithOptions(queryEmbedding, { topK });
}

/**
 * Search with advanced options for trick tutorial support
 */
export async function searchVideoSegmentsWithOptions(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<EnhancedVideoSegment[]> {
  const { topK = 5, filterPrimary, trickId, trickName } = options;
  
  const pinecone = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);
  
  // Build filter if needed
  let filter: any = undefined;
  if (filterPrimary || trickId || trickName) {
    filter = {};
    if (filterPrimary) {
      filter.isPrimary = { $eq: true };
    }
    if (trickId) {
      filter.trickId = { $eq: trickId };
    }
    if (trickName) {
      filter.trickName = { $eq: trickName };
    }
  }
  
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter,
  });
  
  const segments = queryResponse.matches?.map((match: any) => ({
    id: match.id,
    videoId: match.metadata.videoId,
    videoTitle: match.metadata.videoTitle,
    text: match.metadata.text,
    timestamp: match.metadata.timestamp,
    duration: match.metadata.totalDuration || match.metadata.duration,  // Total video duration
    topics: match.metadata.topics || [],
    // Enhanced fields for trick tutorials
    isPrimary: match.metadata.isPrimary || false,
    trickId: match.metadata.trickId,
    trickName: match.metadata.trickName,
    stepNumber: match.metadata.stepNumber,
    totalSteps: match.metadata.totalSteps,
    stepTitle: match.metadata.stepTitle,
  })) || [];
  
  // Sort: primary tutorials first, then by step number
  return segments.sort((a, b) => {
    // Primary tutorials come first
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    
    // Within primary tutorials, sort by step number
    if (a.isPrimary && b.isPrimary) {
      return (a.stepNumber || 0) - (b.stepNumber || 0);
    }
    
    return 0;  // Keep original order for non-primary
  });
}

/**
 * Search specifically for trick tutorials
 * Returns ordered steps for a specific trick
 */
export async function searchTrickTutorial(
  queryEmbedding: number[],
  trickId: string
): Promise<EnhancedVideoSegment[]> {
  return searchVideoSegmentsWithOptions(queryEmbedding, {
    topK: 15,  // Get all steps
    filterPrimary: true,
    trickId,
  });
}

/**
 * Search by trickName metadata
 * Use this to find all segments tagged with a specific trick
 * Example: searchByTrickName(embedding, "Frontside 720")
 */
export async function searchByTrickName(
  queryEmbedding: number[],
  trickName: string,
  topK: number = 20
): Promise<EnhancedVideoSegment[]> {
  return searchVideoSegmentsWithOptions(queryEmbedding, {
    topK,
    trickName,
  });
}
