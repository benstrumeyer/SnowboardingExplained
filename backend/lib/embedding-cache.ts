/**
 * Embedding Cache Service
 * 
 * Loads pre-computed embeddings from disk and provides fast local similarity search
 * This eliminates the need to call Gemini's embedding API for every query
 * 
 * Flow:
 * 1. Data pipeline pre-computes embeddings for all video chunks
 * 2. Embeddings are stored in data/embeddings/embeddings.json
 * 3. This service loads them into memory on startup
 * 4. For user queries, we compute embedding once, then do local similarity search
 * 5. Return top K results without hitting Pinecone
 */

import fs from 'fs';
import path from 'path';

export interface CachedChunk {
  id: string;
  videoId: string;
  videoTitle: string;
  text: string;
  timestamp: number;
  duration: number;
  topics: string[];
  embedding: number[];
  isPrimary?: boolean;
  trickId?: string;
  trickName?: string;
  stepNumber?: number;
  totalSteps?: number;
  stepTitle?: string;
}

class EmbeddingCache {
  private chunks: CachedChunk[] = [];
  private loaded = false;

  /**
   * Load embeddings from disk (call once on startup)
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const embeddingsPath = path.join(
        process.cwd(),
        'data',
        'embeddings',
        'embeddings.json'
      );

      if (!fs.existsSync(embeddingsPath)) {
        console.warn(
          '⚠️  Embeddings file not found at',
          embeddingsPath,
          '- embedding cache disabled'
        );
        this.loaded = true;
        return;
      }

      const content = fs.readFileSync(embeddingsPath, 'utf-8');
      this.chunks = JSON.parse(content);
      this.loaded = true;

      console.log(`✅ Loaded ${this.chunks.length} pre-computed embeddings`);
    } catch (error) {
      console.error('❌ Failed to load embeddings:', error);
      this.loaded = true; // Mark as loaded to prevent retry loops
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * Returns value between -1 and 1 (higher = more similar)
   * Handles dimension mismatches by using the minimum length
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;

    // Use minimum length to handle dimension mismatches
    const len = Math.min(a.length, b.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Search cached embeddings for similar content
   * Much faster than Pinecone - no API call needed!
   */
  search(queryEmbedding: number[], topK: number = 10): CachedChunk[] {
    if (this.chunks.length === 0) {
      console.warn('⚠️  No cached embeddings available');
      return [];
    }

    // Calculate similarity for all chunks
    const results = this.chunks.map((chunk) => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return results.slice(0, topK).map((r) => r.chunk);
  }

  /**
   * Search with filters (trick, primary tutorials, etc.)
   */
  searchWithFilters(
    queryEmbedding: number[],
    options: {
      topK?: number;
      filterPrimary?: boolean;
      trickId?: string;
      trickName?: string;
    } = {}
  ): CachedChunk[] {
    const { topK = 10, filterPrimary, trickId, trickName } = options;

    if (this.chunks.length === 0) {
      return [];
    }

    // Filter chunks based on criteria
    let filtered = this.chunks;

    if (filterPrimary) {
      filtered = filtered.filter((c) => c.isPrimary);
    }

    if (trickId) {
      filtered = filtered.filter((c) => c.trickId === trickId);
    }

    if (trickName) {
      filtered = filtered.filter((c) => c.trickName === trickName);
    }

    // Calculate similarity for filtered chunks
    const results = filtered.map((chunk) => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return results.slice(0, topK).map((r) => r.chunk);
  }

  /**
   * Get chunk by ID
   */
  getById(id: string): CachedChunk | undefined {
    return this.chunks.find((c) => c.id === id);
  }

  /**
   * Get all chunks for a trick
   */
  getByTrickId(trickId: string): CachedChunk[] {
    return this.chunks.filter((c) => c.trickId === trickId);
  }

  /**
   * Get stats about cached embeddings
   */
  getStats() {
    return {
      totalChunks: this.chunks.length,
      uniqueVideos: new Set(this.chunks.map((c) => c.videoId)).size,
      primaryTutorials: this.chunks.filter((c) => c.isPrimary).length,
      embeddingDimensions: this.chunks[0]?.embedding.length || 0,
    };
  }
}

// Singleton instance
let instance: EmbeddingCache | null = null;

export function getEmbeddingCache(): EmbeddingCache {
  if (!instance) {
    instance = new EmbeddingCache();
  }
  return instance;
}

export async function initializeEmbeddingCache(): Promise<void> {
  const cache = getEmbeddingCache();
  await cache.load();
}
