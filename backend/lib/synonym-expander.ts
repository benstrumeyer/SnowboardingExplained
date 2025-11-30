/**
 * Synonym Expander
 * Expands snowboarding abbreviations and slang to canonical forms
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

export interface ExpandedQuery {
  original: string;
  expanded: string;
  terms: string[];
  synonymsUsed: boolean;
}

// Direction synonyms
const DIRECTION_SYNONYMS: Record<string, string> = {
  'bs': 'backside',
  'fs': 'frontside',
  'sw': 'switch',
  'reg': 'regular',
  'cab': 'caballerial',
  'half cab': 'halfcab',
  'halfcab': 'halfcab',
};

// Rotation synonyms (numbers to degrees)
const ROTATION_SYNONYMS: Record<string, string> = {
  '1': '180',
  '3': '360',
  '5': '540',
  '7': '720',
  '9': '900',
  '10': '1080',
  '12': '1260',
  '14': '1440',
};

// Trick synonyms
const TRICK_SYNONYMS: Record<string, string> = {
  'board': 'boardslide',
  'lip': 'lipslide',
  'nose': 'nosepress',
  'tail': 'tailpress',
  'butter': 'butter',
  'press': 'press',
};

// Grab synonyms
const GRAB_SYNONYMS: Record<string, string> = {
  'indy': 'indy grab',
  'melon': 'melon grab',
  'mute': 'mute grab',
  'stale': 'stalefish',
  'method': 'method grab',
  'nose grab': 'nose grab',
  'tail grab': 'tail grab',
  'japan': 'japan grab',
  'seatbelt': 'seatbelt',
};

// Flip/rotation trick synonyms
const FLIP_SYNONYMS: Record<string, string> = {
  'rodeo': 'rodeo flip',
  'misty': 'misty flip',
  'cork': 'cork',
  'dub': 'double',
  'triple': 'triple',
  'wildcat': 'wildcat',
  'tamedog': 'tamedog',
  'backflip': 'backflip',
  'frontflip': 'frontflip',
  'miller': 'miller flip',
};

// All synonyms combined
const ALL_SYNONYMS: Record<string, string> = {
  ...DIRECTION_SYNONYMS,
  ...ROTATION_SYNONYMS,
  ...TRICK_SYNONYMS,
  ...GRAB_SYNONYMS,
  ...FLIP_SYNONYMS,
};

/**
 * Check if a term looks like a rotation number in trick context
 */
function isRotationNumber(term: string, context: string[]): boolean {
  // Single digits 1, 3, 5, 7, 9 or two digits 10, 12, 14
  if (/^(1|3|5|7|9|10|12|14)$/.test(term)) {
    // Check if surrounded by trick-related terms
    const trickIndicators = ['bs', 'fs', 'backside', 'frontside', 'switch', 'cab', 'spin', 'rotation'];
    return context.some(t => trickIndicators.includes(t.toLowerCase()));
  }
  return false;
}

/**
 * Expand a single term using synonym mappings
 */
function expandTerm(term: string, context: string[]): string {
  const lowerTerm = term.toLowerCase();
  
  // Check rotation numbers with context
  if (isRotationNumber(lowerTerm, context)) {
    return ROTATION_SYNONYMS[lowerTerm] || term;
  }
  
  // Check all other synonyms
  return ALL_SYNONYMS[lowerTerm] || term;
}

/**
 * Expand a query string, preserving original terms alongside expanded ones
 * Example: "bs 3" → { original: "bs 3", expanded: "backside 360", terms: ["bs", "3", "backside", "360"] }
 */
export function expand(query: string): ExpandedQuery {
  const originalTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const expandedTerms: string[] = [];
  let synonymsUsed = false;
  
  for (const term of originalTerms) {
    const expanded = expandTerm(term, originalTerms);
    expandedTerms.push(expanded);
    
    if (expanded !== term) {
      synonymsUsed = true;
    }
  }
  
  // Combine original and expanded terms (deduplicated)
  const allTerms = [...new Set([...originalTerms, ...expandedTerms])];
  
  return {
    original: query,
    expanded: expandedTerms.join(' '),
    terms: allTerms,
    synonymsUsed,
  };
}

/**
 * Get all known synonyms (useful for testing/debugging)
 */
export function getAllSynonyms(): Record<string, string> {
  return { ...ALL_SYNONYMS };
}

/**
 * Check if a term has a known synonym
 */
export function hasSynonym(term: string): boolean {
  return term.toLowerCase() in ALL_SYNONYMS;
}
