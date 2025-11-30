# Design Document

## Overview

This design implements a comprehensive video similarity search system with a guided question flow for the Snowboarding Explained coaching app. The system combines three local search algorithms (fuzzy matching, TF-IDF weighting, synonym expansion) to find relevant videos without API calls. A structured question flow gathers user context before making a single Gemini API call. The mobile app includes bottom navigation, a ChatGPT-style sidebar for chat history, and voice input support.

## Architecture

```mermaid
graph TB
    subgraph Mobile App
        UI[React Native UI]
        Sidebar[Sidebar: Mode Switch + Chat History]
        Voice[Voice Input Mode]
        Text[Text Input Mode]
        QFlow[Question Flow Manager]
    end
    
    subgraph Backend API
        Chat[/api/chat]
        Search[Video Search Service]
        Gemini[Gemini API]
        Pinecone[Pinecone Vector DB]
    end
    
    subgraph Search Components
        Fuzzy[Fuse.js Fuzzy Search]
        TFIDF[TF-IDF Scorer]
        Synonym[Synonym Expander]
        Combiner[Score Combiner]
    end
    
    Sidebar --> Text
    Sidebar --> Voice
    Text --> QFlow
    Voice --> QFlow
    QFlow --> Chat
    Chat --> Search
    Chat --> Gemini
    Chat --> Pinecone
    Search --> Fuzzy
    Search --> TFIDF
    Search --> Synonym
    Fuzzy --> Combiner
    TFIDF --> Combiner
    Synonym --> Combiner
    UI --> Sidebar
```

### Sidebar Layout

```
┌─────────────────────┐
│  Snowboarding       │
│  Explained          │
├─────────────────────┤
│  � Text  Mode       │
│  🔊 Voice Mode      │ (sound icon button)
├─────────────────────┤
│  ─────────────────  │ (separator)
├─────────────────────┤
│  Chat History       │
│  ┌─────────────────┐│
│  │ Backside 360    ││
│  │  └ Nov 28       ││
│  │  └ Nov 25       ││
│  │ Frontside 180   ││
│  │  └ Nov 20       ││
│  │ Boardslide      ││
│  │  └ Nov 15       ││
│  └─────────────────┘│
└─────────────────────┘
```

- **Text Mode**: Opens text chat interface (no header/navbar on main screen)
- **Voice Mode** (🔊): Opens voice input interface with microphone button, transcribes speech to text in real-time

## Components and Interfaces

### 1. Synonym Expander

Expands snowboarding abbreviations and slang to canonical forms.

```typescript
interface SynonymExpander {
  expand(query: string): ExpandedQuery;
}

interface ExpandedQuery {
  original: string;
  expanded: string;
  terms: string[];
  synonymsUsed: boolean;
}

// Synonym mappings
const SYNONYMS = {
  // Direction
  'bs': 'backside',
  'fs': 'frontside',
  'sw': 'switch',
  'reg': 'regular',
  
  // Rotations (in trick context)
  '1': '180',
  '3': '360',
  '5': '540',
  '7': '720',
  '9': '900',
  '10': '1080',
  
  // Tricks
  'board': 'boardslide',
  'lip': 'lipslide',
  'nose': 'nosepress',
  'tail': 'tailpress',
  
  // Grabs
  'indy': 'indy grab',
  'melon': 'melon grab',
  'mute': 'mute grab',
  'stale': 'stalefish',
};
```

### 2. TF-IDF Scorer

Pre-computes term weights at startup, scores queries at runtime.

```typescript
interface TFIDFScorer {
  initialize(titles: string[]): void;
  score(query: string, title: string): number;
  getTermWeight(term: string): number;
}

interface TFIDFWeights {
  termFrequency: Map<string, Map<string, number>>;  // term -> doc -> count
  documentFrequency: Map<string, number>;            // term -> doc count
  inverseDocFrequency: Map<string, number>;          // term -> IDF score
  totalDocuments: number;
}
```

### 3. Fuzzy Search (Fuse.js)

Handles typos and partial matches. Optimized based on benchmarking best practices.

```typescript
interface FuzzySearchConfig {
  threshold: number;      // 0.0 = exact, 1.0 = match anything (default: 0.4)
  distance: number;       // Max distance for match (default: 100)
  keys: string[];         // Fields to search (default: ['title'])
  includeScore: boolean;  // Include match score (default: true)
  ignoreLocation: boolean; // Ignore where in string match occurs (default: true)
  useExtendedSearch: boolean; // Enable extended search operators (default: false)
  minMatchCharLength: number; // Min chars before match counts (default: 2)
}

interface FuzzyResult {
  item: VideoInfo;
  score: number;  // 0 = perfect match, 1 = no match
  refIndex: number;
}
```

**Fuse.js Optimization Notes:**
- Pre-create Fuse index at startup (not per-search)
- Use `ignoreLocation: true` for better partial matches
- Set `minMatchCharLength: 2` to avoid single-char noise
- Keep `threshold: 0.4` for good typo tolerance without false positives
- For 129 videos, no need for web workers (fast enough synchronously)

### 4. Score Combiner

Combines all scoring methods into final relevance score.

```typescript
interface ScoreCombiner {
  combine(
    fuzzyScore: number,
    tfidfScore: number,
    synonymBonus: number,
    exactMatch: boolean
  ): number;
}

// Weights
const WEIGHTS = {
  fuzzy: 0.5,
  tfidf: 0.3,
  synonym: 0.2,
  exactMatchMultiplier: 1.5,
};
```

### 5. Question Flow Manager

Manages the guided question sequence.

```typescript
interface Question {
  id: string;
  prompt: string;
  type: 'freeText' | 'singleChoice' | 'multipleChoice';
  options?: string[];
  optional: boolean;
  contextKey: keyof UserContext;
}

interface QuestionFlowManager {
  getCurrentQuestion(): Question | null;
  submitAnswer(answer: string): void;
  skip(): void;
  isComplete(): boolean;
  getContext(): UserContext;
}

const QUESTIONS: Question[] = [
  {
    id: 'trick',
    prompt: 'What trick do you want to do?',
    type: 'freeText',
    optional: false,
    contextKey: 'trick',
  },
  {
    id: 'featureSize',
    prompt: 'What size feature are you doing?',
    type: 'singleChoice',
    options: ['small', 'medium', 'large', 'xl', 'flat'],
    optional: true,
    contextKey: 'featureSize',
  },
  // ... more questions
];
```

### 6. Voice Input Service

Handles speech-to-text transcription.

```typescript
interface VoiceInputService {
  startListening(): void;
  stopListening(): void;
  onTranscript(callback: (text: string) => void): void;
  onError(callback: (error: Error) => void): void;
}
```

## Data Models

### Video Database Entry
```typescript
interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  tfidfVector?: number[];  // Pre-computed TF-IDF weights (optional)
}
```

### Search Result
```typescript
interface SearchResult {
  video: VideoInfo;
  scores: {
    fuzzy: number;
    tfidf: number;
    synonym: number;
    combined: number;
  };
  source: 'transcript' | 'similarity';
}
```

### Chat History Entry
```typescript
interface ChatHistoryEntry {
  id: string;
  trick: string;
  context: UserContext;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Synonym expansion preserves original terms
*For any* query string, after synonym expansion, the result SHALL contain both the original terms and their expanded equivalents.
**Validates: Requirements 1.4**

### Property 2: Fuzzy matching returns results above threshold
*For any* misspelled query with Levenshtein distance ≤ 3 from a valid term, the fuzzy search SHALL return at least one result with score ≥ 0.6.
**Validates: Requirements 2.1**

### Property 3: Results are sorted by combined score
*For any* search query returning multiple results, the results array SHALL be sorted in descending order by combined score.
**Validates: Requirements 2.4, 4.2**

### Property 4: TF-IDF scores are normalized
*For any* computed TF-IDF score, the value SHALL be within the range [0, 1].
**Validates: Requirements 3.4**

### Property 5: Rare terms score higher than common terms
*For any* two terms where term A appears in fewer documents than term B, the TF-IDF weight of term A SHALL be greater than term B.
**Validates: Requirements 3.2, 3.3**

### Property 6: Combined score formula is correct
*For any* search result, the combined score SHALL equal: (fuzzyScore × 0.5) + (tfidfScore × 0.3) + (synonymBonus × 0.2), multiplied by 1.5 if exact match.
**Validates: Requirements 4.1, 4.3**

### Property 7: Results include similarity scores
*For any* search result returned, the result object SHALL include a similarity score field with a numeric value.
**Validates: Requirements 4.4**

### Property 8: Video array fills to 5 with similarity search
*For any* chat response where transcript search returns N < 5 videos, the final videos array SHALL contain N transcript videos plus (5 - N) similarity-matched videos.
**Validates: Requirements 6.1, 6.2**

### Property 9: Question flow stores answers in context
*For any* answer submitted to the question flow, the corresponding contextKey in UserContext SHALL be updated with the answer value.
**Validates: Requirements 7.3**

### Property 10: Skip commands halt question flow
*For any* skip command ("that's all", "skip", "done"), the question flow SHALL immediately mark itself as complete.
**Validates: Requirements 8.1**

### Property 11: Partial context triggers API call
*For any* question flow that is skipped or completed, the system SHALL proceed to make the Gemini API call regardless of how many questions were answered.
**Validates: Requirements 8.2, 8.4**

### Property 12: Follow-up responses return correct video count
*For any* follow-up question after initial coaching, the response SHALL include exactly 1 relevant video and 1 similar video suggestion.
**Validates: Requirements 13.2**

### Property 13: Context persists across follow-ups
*For any* follow-up question in a session, the original UserContext SHALL remain accessible and unchanged.
**Validates: Requirements 13.3**

## Error Handling

1. **Empty search results**: Return top 5 videos by recency if no matches found
2. **Voice transcription failure**: Fall back to text input, show error toast
3. **Pinecone unavailable**: Use similarity search only, log warning
4. **Invalid user input**: Show validation message, don't proceed
5. **Gemini API failure**: Show cached response if available, otherwise error message

## Testing Strategy

### Unit Tests
- Synonym expansion with various abbreviation combinations
- TF-IDF weight computation for known document sets
- Score combination formula verification
- Question flow state transitions

### Property-Based Tests
- Use fast-check library for TypeScript
- Each correctness property above will have a corresponding PBT
- Minimum 100 iterations per property test
- Tests tagged with format: `**Feature: video-similarity-search, Property {N}: {description}**`

### Integration Tests
- Full search pipeline with real video database
- Question flow to API call flow
- Voice input to text processing

## Voice API Recommendations

| API | Cost | Pros | Cons |
|-----|------|------|------|
| **Web Speech API** | Free | Built into browsers, no setup | Mobile support varies, no offline |
| **Whisper (OpenAI)** | $0.006/min | Very accurate, handles accents | Requires API call, latency |
| **Deepgram** | $0.0043/min | Real-time streaming, fast | Requires account setup |
| **AssemblyAI** | $0.00025/sec | Good accuracy, real-time | Slightly more expensive |
| **React Native Voice** | Free | Native mobile, offline capable | Less accurate than cloud |

**Recommendation**: Start with **Web Speech API** for web/PWA (free, good enough for short queries). For React Native mobile, use **react-native-voice** (free, offline) with Whisper as fallback for poor transcriptions.
