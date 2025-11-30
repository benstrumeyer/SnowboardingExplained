/**
 * Fuzzy Search with Fuse.js
 * Handles typos and partial matches for video title search
 * Requirements: 2.1, 2.2, 2.3
 */

import Fuse, { IFuseOptions } from 'fuse.js';

export interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

export interface FuzzyResult {
  item: VideoInfo;
  score: number;  // 0 = perfect match, 1 = no match (Fuse.js convention)
  refIndex: number;
}

// Fuse.js configuration optimized for snowboarding video titles
const FUSE_OPTIONS: IFuseOptions<VideoInfo> = {
  // Search configuration
  keys: ['title'],
  threshold: 0.4,           // 0.0 = exact, 1.0 = match anything
  distance: 100,            // Max distance for match
  
  // Optimization settings
  ignoreLocation: true,     // Match anywhere in string
  minMatchCharLength: 2,    // Ignore single char matches
  
  // Result settings
  includeScore: true,
  includeMatches: false,    // Don't need match details
  
  // Performance
  shouldSort: true,
  findAllMatches: false,    // Stop at first good match per item
};

let fuseIndex: Fuse<VideoInfo> | null = null;
let videoDatabase: VideoInfo[] = [];

/**
 * Initialize the Fuse.js index with video data
 * Should be called once at startup
 */
export function initializeFuzzySearch(videos: VideoInfo[]): void {
  videoDatabase = videos;
  fuseIndex = new Fuse(videos, FUSE_OPTIONS);
  console.log(`🔍 Fuzzy search initialized with ${videos.length} videos`);
}

/**
 * Search videos by query with fuzzy matching
 * Returns results sorted by relevance (best matches first)
 */
export function fuzzySearch(query: string, limit: number = 10): FuzzyResult[] {
  if (!fuseIndex) {
    console.warn('Fuzzy search not initialized');
    return [];
  }
  
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const results = fuseIndex.search(query, { limit });
  
  return results.map(result => ({
    item: result.item,
    score: result.score ?? 1,  // Default to worst score if undefined
    refIndex: result.refIndex,
  }));
}

/**
 * Convert Fuse.js score (0=best, 1=worst) to similarity score (1=best, 0=worst)
 */
export function fuseScoreToSimilarity(fuseScore: number): number {
  return 1 - fuseScore;
}

/**
 * Search and return results with similarity scores (1=best, 0=worst)
 */
export function searchWithSimilarity(query: string, limit: number = 10): Array<{
  video: VideoInfo;
  similarity: number;
}> {
  const results = fuzzySearch(query, limit);
  
  return results.map(result => ({
    video: result.item,
    similarity: fuseScoreToSimilarity(result.score),
  }));
}

/**
 * Check if fuzzy search has been initialized
 */
export function isInitialized(): boolean {
  return fuseIndex !== null;
}

/**
 * Get the video database
 */
export function getVideoDatabase(): VideoInfo[] {
  return videoDatabase;
}

/**
 * Get a video by ID
 */
export function getVideoById(videoId: string): VideoInfo | undefined {
  return videoDatabase.find(v => v.videoId === videoId);
}
