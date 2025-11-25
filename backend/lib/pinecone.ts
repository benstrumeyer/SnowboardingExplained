/**
 * Pinecone Service
 * Handles vector search for relevant coaching content
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

export async function searchVideoSegments(
  queryEmbedding: number[],
  topK: number = 5
): Promise<VideoSegment[]> {
  const pinecone = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  
  const index = pinecone.index(indexName);
  
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });
  
  return queryResponse.matches?.map((match: any) => ({
    id: match.id,
    videoId: match.metadata.videoId,
    videoTitle: match.metadata.videoTitle,
    text: match.metadata.text,
    timestamp: match.metadata.timestamp,
    duration: match.metadata.duration,
    topics: match.metadata.topics || [],
  })) || [];
}
