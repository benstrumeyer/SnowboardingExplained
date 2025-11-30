/**
 * Video Search Service
 * Combines synonym expansion, fuzzy search, TF-IDF, and score combining
 * for intelligent video title matching
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.3
 */

import { expand } from './synonym-expander';
import { initialize as initTFIDF, scoreTitle, isInitialized as isTFIDFInitialized } from './tfidf-scorer';
import { initializeFuzzySearch, searchWithSimilarity, getVideoDatabase, isInitialized as isFuzzyInitialized, type VideoInfo } from './fuzzy-search';
import { combine, isExactMatch, sortByScore, createScoredResult, type ScoredResult } from './score-combiner';

export type { VideoInfo };

export interface SearchResult {
  video: VideoInfo;
  similarity: number;
  scores: {
    fuzzy: number;
    tfidf: number;
    synonym: number;
    combined: number;
  };
  source: 'similarity';
}

/**
 * Initialize the video search system with video data
 * Should be called once at startup
 */
export function initVideoDatabase(videos: VideoInfo[]): void {
  // Initialize fuzzy search
  initializeFuzzySearch(videos);
  
  // Initialize TF-IDF with video titles
  const titlesForTFIDF = videos.map(v => ({
    id: v.videoId,
    title: v.title,
  }));
  initTFIDF(titlesForTFIDF);
  
  console.log(`📚 Video search initialized with ${videos.length} videos`);
}

/**
 * Search videos using the full pipeline:
 * 1. Synonym expansion
 * 2. Fuzzy search
 * 3. TF-IDF scoring
 * 4. Score combining
 */
export function searchVideos(query: string, topK: number = 5): SearchResult[] {
  if (!isFuzzyInitialized() || !isTFIDFInitialized()) {
    console.warn('Video search not initialized');
    return [];
  }
  
  // Step 1: Expand synonyms
  const expanded = expand(query);
  const searchQuery = expanded.expanded;
  
  // Step 2: Fuzzy search with expanded query
  const fuzzyResults = searchWithSimilarity(searchQuery, topK * 2);  // Get more for re-ranking
  
  if (fuzzyResults.length === 0) {
    return [];
  }
  
  // Step 3 & 4: Score each result with TF-IDF and combine
  const scoredResults: ScoredResult<VideoInfo>[] = fuzzyResults.map(result => {
    const fuzzyScore = result.similarity;
    const tfidfScore = scoreTitle(searchQuery, result.video.title);
    const synonymBonus = expanded.synonymsUsed ? 0.2 : 0;
    const exactMatch = isExactMatch(searchQuery, result.video.title);
    
    return createScoredResult(
      result.video,
      fuzzyScore,
      tfidfScore,
      synonymBonus,
      exactMatch
    );
  });
  
  // Sort by combined score and take top K
  const sorted = sortByScore(scoredResults).slice(0, topK);
  
  // Convert to SearchResult format
  return sorted.map(result => ({
    video: result.item,
    similarity: result.combined,
    scores: {
      fuzzy: result.scores.fuzzy,
      tfidf: result.scores.tfidf,
      synonym: result.scores.synonym,
      combined: result.combined,
    },
    source: 'similarity' as const,
  }));
}

/**
 * Get videos for a specific trick (convenience wrapper)
 */
export function getVideosForTrick(trick: string, topK: number = 5): SearchResult[] {
  return searchVideos(trick, topK);
}

/**
 * Get all videos in the database
 */
export function getAllVideos(): VideoInfo[] {
  return getVideoDatabase();
}

/**
 * Fill video slots: use provided videos first, fill remaining with similarity search
 * Returns exactly targetCount videos (or fewer if not enough exist)
 */
export function fillVideoSlots(
  existingVideos: Array<{ videoId: string }>,
  query: string,
  targetCount: number = 5
): SearchResult[] {
  const existingIds = new Set(existingVideos.map(v => v.videoId));
  const needed = targetCount - existingVideos.length;
  
  if (needed <= 0) {
    return [];
  }
  
  // Search for similar videos, excluding existing ones
  const searchResults = searchVideos(query, needed + existingIds.size);
  
  // Filter out existing videos and take what we need
  return searchResults
    .filter(r => !existingIds.has(r.video.videoId))
    .slice(0, needed);
}
