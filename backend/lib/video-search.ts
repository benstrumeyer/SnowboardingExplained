/**
 * Video Search Service
 * Searches videos by title similarity using text matching
 */

import { generateEmbedding } from './gemini';

export interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  similarity?: number;
}

// Video database - will be loaded from JSON or environment
let videoDatabase: VideoInfo[] = [];

/**
 * Initialize video database from JSON data
 */
export function initVideoDatabase(videos: VideoInfo[]): void {
  videoDatabase = videos;
  console.log(`📚 Video database initialized with ${videos.length} videos`);
}

/**
 * Get all videos in the database
 */
export function getAllVideos(): VideoInfo[] {
  return videoDatabase;
}

/**
 * Simple text similarity using word overlap (Jaccard similarity)
 */
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Check if query terms appear in the title
 */
function containsQueryTerms(title: string, query: string): number {
  const titleLower = title.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (queryTerms.length === 0) return 0;
  
  let matchCount = 0;
  for (const term of queryTerms) {
    if (titleLower.includes(term)) {
      matchCount++;
    }
  }
  
  return matchCount / queryTerms.length;
}

/**
 * Search videos by title similarity
 * Returns top N most similar videos based on the query
 */
export function searchVideosByTitle(
  query: string,
  topK: number = 5
): VideoInfo[] {
  if (videoDatabase.length === 0) {
    console.warn('⚠️ Video database is empty');
    return [];
  }
  
  // Score each video
  const scored = videoDatabase.map(video => {
    const jaccardScore = textSimilarity(video.title, query);
    const containsScore = containsQueryTerms(video.title, query);
    
    // Weighted combination: prioritize direct term matches
    const similarity = (containsScore * 0.7) + (jaccardScore * 0.3);
    
    return {
      ...video,
      similarity,
    };
  });
  
  // Sort by similarity and return top K
  return scored
    .filter(v => v.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Search videos using semantic similarity with embeddings
 * More accurate but requires API call
 */
export async function searchVideosSemantic(
  query: string,
  topK: number = 5
): Promise<VideoInfo[]> {
  if (videoDatabase.length === 0) {
    console.warn('⚠️ Video database is empty');
    return [];
  }
  
  // First, do a quick text-based filter to reduce candidates
  const candidates = searchVideosByTitle(query, Math.min(20, videoDatabase.length));
  
  if (candidates.length === 0) {
    // Fall back to returning some videos if no text matches
    return videoDatabase.slice(0, topK).map(v => ({ ...v, similarity: 0.1 }));
  }
  
  // For now, return text-based results
  // In production, you could generate embeddings for titles and do vector similarity
  return candidates.slice(0, topK);
}

/**
 * Get videos related to a specific trick/topic
 */
export function getVideosForTrick(trick: string, topK: number = 5): VideoInfo[] {
  // Common snowboarding terms to expand the search
  const trickTerms: Record<string, string[]> = {
    '180': ['180', 'one eighty', 'spin', 'rotation'],
    '360': ['360', 'three sixty', 'spin', 'rotation'],
    '540': ['540', 'five forty', 'spin'],
    '720': ['720', 'seven twenty', 'spin'],
    'backside': ['backside', 'bs', 'back'],
    'frontside': ['frontside', 'fs', 'front'],
    'ollie': ['ollie', 'pop', 'jump'],
    'nollie': ['nollie', 'nose ollie'],
    'butter': ['butter', 'press', 'nose press', 'tail press'],
    'carve': ['carve', 'carving', 'turn', 'edge'],
    'jump': ['jump', 'kicker', 'air', 'booter'],
    'rail': ['rail', 'jib', 'box', 'slide'],
    'grab': ['grab', 'indy', 'melon', 'mute', 'stalefish'],
    'flip': ['flip', 'rodeo', 'misty', 'cork'],
  };
  
  // Expand the trick query with related terms
  let expandedQuery = trick.toLowerCase();
  for (const [key, terms] of Object.entries(trickTerms)) {
    if (expandedQuery.includes(key)) {
      expandedQuery += ' ' + terms.join(' ');
    }
  }
  
  return searchVideosByTitle(expandedQuery, topK);
}
