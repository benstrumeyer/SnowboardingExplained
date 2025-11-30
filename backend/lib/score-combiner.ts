/**
 * Score Combiner
 * Combines fuzzy, TF-IDF, and synonym scores into final relevance score
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

export interface ScoreComponents {
  fuzzy: number;      // 0-1, from Fuse.js (converted to similarity)
  tfidf: number;      // 0-1, from TF-IDF scorer
  synonym: number;    // 0-1, bonus for synonym matches
}

export interface ScoredResult<T> {
  item: T;
  scores: ScoreComponents;
  combined: number;
  exactMatch: boolean;
}

// Scoring weights
const WEIGHTS = {
  fuzzy: 0.5,
  tfidf: 0.3,
  synonym: 0.2,
};

// Exact match multiplier
const EXACT_MATCH_MULTIPLIER = 1.5;

/**
 * Combine individual scores into a final relevance score
 * Formula: (fuzzy * 0.5) + (tfidf * 0.3) + (synonym * 0.2)
 * Multiplied by 1.5 if exact match
 */
export function combine(
  fuzzyScore: number,
  tfidfScore: number,
  synonymBonus: number,
  exactMatch: boolean = false
): number {
  // Ensure scores are in valid range
  const f = Math.max(0, Math.min(1, fuzzyScore));
  const t = Math.max(0, Math.min(1, tfidfScore));
  const s = Math.max(0, Math.min(1, synonymBonus));
  
  // Weighted combination
  let combined = (f * WEIGHTS.fuzzy) + (t * WEIGHTS.tfidf) + (s * WEIGHTS.synonym);
  
  // Apply exact match boost
  if (exactMatch) {
    combined *= EXACT_MATCH_MULTIPLIER;
  }
  
  // Cap at 1.0
  return Math.min(1, combined);
}

/**
 * Check if a query exactly matches a title (after normalization)
 */
export function isExactMatch(query: string, title: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTitle = title.toLowerCase().trim();
  
  // Check if query is contained in title or vice versa
  return normalizedTitle.includes(normalizedQuery) || 
         normalizedQuery.includes(normalizedTitle);
}

/**
 * Sort results by combined score (descending)
 */
export function sortByScore<T>(results: ScoredResult<T>[]): ScoredResult<T>[] {
  return [...results].sort((a, b) => b.combined - a.combined);
}

/**
 * Create a scored result object
 */
export function createScoredResult<T>(
  item: T,
  fuzzyScore: number,
  tfidfScore: number,
  synonymBonus: number,
  exactMatch: boolean = false
): ScoredResult<T> {
  const scores: ScoreComponents = {
    fuzzy: fuzzyScore,
    tfidf: tfidfScore,
    synonym: synonymBonus,
  };
  
  return {
    item,
    scores,
    combined: combine(fuzzyScore, tfidfScore, synonymBonus, exactMatch),
    exactMatch,
  };
}

/**
 * Get the scoring weights (for transparency/debugging)
 */
export function getWeights(): typeof WEIGHTS {
  return { ...WEIGHTS };
}

/**
 * Get the exact match multiplier
 */
export function getExactMatchMultiplier(): number {
  return EXACT_MATCH_MULTIPLIER;
}
