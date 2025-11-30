/**
 * TF-IDF Scorer
 * Computes term frequency-inverse document frequency weights for video titles
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

export interface TFIDFWeights {
  termFrequency: Map<string, Map<string, number>>;  // docId -> term -> count
  documentFrequency: Map<string, number>;            // term -> doc count
  inverseDocFrequency: Map<string, number>;          // term -> IDF score
  totalDocuments: number;
}

// Stop words to filter out (common words with low information value)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'how', 'what', 'when', 'where', 'why', 'who', 'which', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my',
  'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'us', 'them',
]);

let weights: TFIDFWeights | null = null;
let documentTitles: Map<string, string> = new Map();

/**
 * Tokenize a string into terms
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')  // Keep hyphens for terms like "50-50"
    .split(/\s+/)
    .filter(term => term.length > 1 && !STOP_WORDS.has(term));
}

/**
 * Initialize TF-IDF weights from a list of video titles
 */
export function initialize(titles: { id: string; title: string }[]): void {
  const termFrequency = new Map<string, Map<string, number>>();
  const documentFrequency = new Map<string, number>();
  
  documentTitles.clear();
  
  // Compute term frequency for each document
  for (const { id, title } of titles) {
    documentTitles.set(id, title);
    const terms = tokenize(title);
    const tfMap = new Map<string, number>();
    
    for (const term of terms) {
      tfMap.set(term, (tfMap.get(term) || 0) + 1);
    }
    
    termFrequency.set(id, tfMap);
    
    // Update document frequency (count unique terms per doc)
    const uniqueTerms = new Set(terms);
    for (const term of uniqueTerms) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }
  
  // Compute inverse document frequency
  const totalDocs = titles.length;
  const inverseDocFrequency = new Map<string, number>();
  
  for (const [term, docCount] of documentFrequency) {
    // IDF = log(N / df) where N = total docs, df = docs containing term
    // Add 1 to avoid division by zero and smooth the values
    const idf = Math.log((totalDocs + 1) / (docCount + 1)) + 1;
    inverseDocFrequency.set(term, idf);
  }
  
  weights = {
    termFrequency,
    documentFrequency,
    inverseDocFrequency,
    totalDocuments: totalDocs,
  };
  
  console.log(`📊 TF-IDF initialized: ${totalDocs} documents, ${documentFrequency.size} unique terms`);
}

/**
 * Get the IDF weight for a term (higher = rarer = more important)
 */
export function getTermWeight(term: string): number {
  if (!weights) {
    console.warn('TF-IDF not initialized');
    return 1;
  }
  
  const lowerTerm = term.toLowerCase();
  return weights.inverseDocFrequency.get(lowerTerm) || 0;
}

/**
 * Score a query against a document title
 * Returns normalized score between 0 and 1
 */
export function score(query: string, docId: string): number {
  if (!weights) {
    console.warn('TF-IDF not initialized');
    return 0;
  }
  
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;
  
  const docTf = weights.termFrequency.get(docId);
  if (!docTf) return 0;
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  for (const term of queryTerms) {
    const idf = weights.inverseDocFrequency.get(term) || 0;
    const tf = docTf.get(term) || 0;
    
    // TF-IDF score for this term
    const termScore = tf * idf;
    totalScore += termScore;
    
    // Max possible score (if term appeared with max frequency)
    maxPossibleScore += idf;
  }
  
  // Normalize to 0-1 range
  if (maxPossibleScore === 0) return 0;
  return Math.min(1, totalScore / maxPossibleScore);
}

/**
 * Score a query against a title string directly (for titles not in the index)
 */
export function scoreTitle(query: string, title: string): number {
  if (!weights) {
    console.warn('TF-IDF not initialized');
    return 0;
  }
  
  const queryTerms = tokenize(query);
  const titleTerms = tokenize(title);
  
  if (queryTerms.length === 0 || titleTerms.length === 0) return 0;
  
  // Create a temporary TF map for the title
  const titleTf = new Map<string, number>();
  for (const term of titleTerms) {
    titleTf.set(term, (titleTf.get(term) || 0) + 1);
  }
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  for (const term of queryTerms) {
    const idf = weights.inverseDocFrequency.get(term) || 1;  // Default IDF for unknown terms
    const tf = titleTf.get(term) || 0;
    
    totalScore += tf * idf;
    maxPossibleScore += idf;
  }
  
  if (maxPossibleScore === 0) return 0;
  return Math.min(1, totalScore / maxPossibleScore);
}

/**
 * Check if TF-IDF has been initialized
 */
export function isInitialized(): boolean {
  return weights !== null;
}

/**
 * Get statistics about the TF-IDF index
 */
export function getStats(): { totalDocs: number; uniqueTerms: number; topTerms: string[] } | null {
  if (!weights) return null;
  
  // Get top 10 terms by IDF (rarest terms)
  const sortedTerms = [...weights.inverseDocFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
  
  return {
    totalDocs: weights.totalDocuments,
    uniqueTerms: weights.documentFrequency.size,
    topTerms: sortedTerms,
  };
}
