# Snowboarding Coach AI - Technical Specification

## Product Vision

A mobile app that provides personalized snowboarding coaching through AI-powered conversations, trained exclusively on Snowboarding Explained YouTube channel content. Users can chat with their pocket coach on the chairlift, getting advice that uses the coach's exact words and teaching methodology.

## Core Requirements

### 1. Guided Coaching Flow
Users answer structured questions before getting AI coaching:
- What trick do you want to do?
- What size feature are you doing?
- Have you landed the pre-trick?
- How are your edge transfers?
- What are the issues?
- Can you spot the landing for the full rotation?
- How consistently are you landing this trick?
- Do you feel in control during this trick?

### 2. AI Coaching Response
- Uses collected context to provide personalized advice
- References actual video content verbatim
- Natural, friendly coaching tone
- Includes video thumbnails with timestamps

### 3. Cost Optimization
- Collect all context before making API call
- Use local vector search to find relevant content
- Cache responses for similar contexts
- Minimize API calls through smart architecture

### 4. Video Integration
- Show video thumbnails for referenced content
- Include timestamps for specific techniques
- Link directly to YouTube videos
- Display in a friendly, non-intrusive way

## Technical Architecture

### Data Flow

```
User Opens App
    ↓
Guided Question Flow (Local)
    ↓
Collect User Context
    ↓
Vector Search Transcripts (Local)
    ↓
Find Top 5 Relevant Segments
    ↓
Check Cache (Redis)
    ↓
Cache Hit? → Return Cached Response
    ↓
Cache Miss? → Call Gemini API
    ↓
Generate Coaching Response
    ↓
Cache Response
    ↓
Display with Video Thumbnails
    ↓
Continue Conversation
```

### Component Architecture

#### Mobile App (React Native)

```
screens/
├── HomeScreen.tsx              # Landing page
├── ChatScreen.tsx              # Main coaching chat
├── QuestionFlowScreen.tsx      # Guided questions
├── VideoPlayerScreen.tsx       # Full video playback
└── SettingsScreen.tsx          # User preferences

components/
├── ChatMessage.tsx             # Chat bubble
├── VideoThumbnail.tsx          # Video reference card
├── QuestionCard.tsx            # Question UI
├── TypingIndicator.tsx         # Loading state
└── CoachAvatar.tsx             # Coach profile pic

services/
├── api.ts                      # Backend API client
├── cache.ts                    # Local caching
├── vectorSearch.ts             # Local vector search
└── youtube.ts                  # YouTube integration
```

#### Backend (Vercel Serverless)

```
api/
├── chat.ts                     # POST /api/chat - Main chat endpoint
├── videos.ts                   # GET /api/videos/:id - Video metadata
└── health.ts                   # GET /api/health - Health check

lib/
├── gemini.ts                   # Gemini API integration
├── pinecone.ts                 # Pinecone vector search
├── cache.ts                    # Vercel KV caching
└── types.ts                    # TypeScript types
```

#### Data Pipeline

```
scripts/
├── scrape-transcripts.ts       # YouTube transcript scraper
├── generate-embeddings.ts      # Create vector embeddings
├── build-index.ts              # Build searchable index
└── update-videos.ts            # Add new videos

data/
├── transcripts/
│   ├── video-001.json
│   ├── video-002.json
│   └── ...
├── embeddings/
│   └── embeddings.bin
└── index.json                  # Video metadata + embeddings
```

## Implementation Plan

### Phase 1: Data Pipeline (Week 1)

**Goal:** Scrape and process all YouTube content

#### Tasks:
- [ ] Setup project structure
- [ ] Implement YouTube transcript scraper
- [ ] Download all video transcripts (~200 videos)
- [ ] Chunk transcripts into semantic segments
- [ ] Generate embeddings using sentence-transformers
- [ ] Build searchable index with metadata
- [ ] Store video metadata (title, URL, thumbnail, duration)

#### Deliverables:
- `data/transcripts/` - All video transcripts
- `data/embeddings/` - Vector embeddings
- `data/index.json` - Searchable index

#### Technical Details:

**Transcript Scraping:**
```typescript
// Use youtube-transcript library
import { YoutubeTranscript } from 'youtube-transcript';

async function scrapeVideo(videoId: string) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  
  // Chunk into segments (every 30 seconds or by topic)
  const segments = chunkTranscript(transcript);
  
  return {
    videoId,
    title: await getVideoTitle(videoId),
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    segments
  };
}
```

**Embedding Generation:**
```typescript
// Use @xenova/transformers for local embeddings
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function generateEmbedding(text: string) {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

### Phase 2: Backend API (Week 2)

**Goal:** Build Node.js backend with Gemini integration

#### Tasks:
- [ ] Setup Express server with TypeScript
- [ ] Implement Gemini API integration
- [ ] Create vector search service
- [ ] Setup Redis caching
- [ ] Build chat endpoint
- [ ] Implement response caching logic
- [ ] Add video metadata endpoints
- [ ] Setup error handling and logging

#### API Endpoints:

```typescript
POST /api/chat
Body: {
  context: {
    trick: string;
    featureSize: string;
    preTrick: string;
    edgeTransfers: string;
    issues: string;
    spotLanding: boolean;
    consistency: string;
    control: boolean;
  };
  message: string;
  sessionId: string;
}
Response: {
  response: string;
  videos: Array<{
    videoId: string;
    title: string;
    thumbnail: string;
    timestamp: number;
    quote: string;
  }>;
  cached: boolean;
}

GET /api/videos/:videoId
Response: {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  url: string;
}
```

#### Gemini Integration:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateCoachingResponse(
  userContext: UserContext,
  relevantSegments: VideoSegment[]
) {
  const prompt = `
You are a snowboarding coach with the teaching style of Snowboarding Explained.

Student's Situation:
- Trick: ${userContext.trick}
- Feature Size: ${userContext.featureSize}
- Pre-trick Status: ${userContext.preTrick}
- Edge Transfers: ${userContext.edgeTransfers}
- Issues: ${userContext.issues}
- Can Spot Landing: ${userContext.spotLanding}
- Consistency: ${userContext.consistency}
- Control: ${userContext.control}

Relevant Teaching Content:
${relevantSegments.map(s => `
From "${s.videoTitle}" (${s.timestamp}):
"${s.text}"
`).join('\n')}

Provide coaching advice using the exact words and teaching style from the content above.
Be encouraging, specific, and reference the videos naturally.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

#### Caching Strategy:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedResponse(context: UserContext): Promise<string | null> {
  const cacheKey = generateCacheKey(context);
  return await redis.get(cacheKey);
}

async function cacheResponse(context: UserContext, response: string) {
  const cacheKey = generateCacheKey(context);
  await redis.setex(cacheKey, 86400, response); // 24 hour TTL
}

function generateCacheKey(context: UserContext): string {
  // Normalize context to create consistent cache keys
  return `coaching:${context.trick}:${context.featureSize}:${context.issues}`;
}
```

### Phase 3: Mobile App UI (Week 3)

**Goal:** Build React Native app with ChatGPT-style interface

#### Tasks:
- [ ] Setup Expo project with TypeScript
- [ ] Install dependencies (NativeWind, React Navigation, etc.)
- [ ] Create navigation structure
- [ ] Build ChatScreen with message bubbles
- [ ] Implement QuestionFlowScreen
- [ ] Create VideoThumbnail component
- [ ] Add video playback functionality
- [ ] Implement local caching
- [ ] Add loading states and animations
- [ ] Style to match ChatGPT mobile app

#### Screen Designs:

**HomeScreen:**
```
┌─────────────────────────────┐
│  🏂 Snowboarding Coach      │
│                             │
│  [Start New Session]        │
│                             │
│  Recent Sessions:           │
│  • Backside 180 - 2h ago    │
│  • Carving Tips - 1d ago    │
│                             │
└─────────────────────────────┘
```

**QuestionFlowScreen:**
```
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  What trick do you want     │
│  to do?                     │
│                             │
│  [Backside 180]             │
│  [Frontside 180]            │
│  [360]                      │
│  [Other...]                 │
│                             │
│  Progress: ●●●○○○○○         │
└─────────────────────────────┘
```

**ChatScreen:**
```
┌─────────────────────────────┐
│  ← Sessions    Backside 180 │
│                             │
│  ┌─────────────────────┐   │
│  │ Let's work on your  │   │
│  │ edge transfers...   │   │
│  └─────────────────────┘   │
│                             │
│  ┌───────────────────────┐ │
│  │ [Video Thumbnail]     │ │
│  │ Edge Control Basics   │ │
│  │ 3:45 • Tap to watch   │ │
│  └───────────────────────┘ │
│                             │
│  ┌─────────────────────┐   │
│  │ How do I practice   │   │
│  │ this?               │   │
│  └─────────────────────┘   │
│                             │
│  [Type a message...]        │
└─────────────────────────────┘
```

#### Key Components:

**ChatMessage.tsx:**
```typescript
import tw from 'twrnc';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  videos?: VideoReference[];
  timestamp: Date;
}

export function ChatMessage({ message, isUser, videos, timestamp }: ChatMessageProps) {
  return (
    <View style={tw`mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View style={tw`max-w-[80%] rounded-2xl p-4 ${
        isUser ? 'bg-blue-500' : 'bg-gray-200'
      }`}>
        <Text style={tw`${isUser ? 'text-white' : 'text-black'}`}>
          {message}
        </Text>
      </View>
      
      {videos && videos.map(video => (
        <VideoThumbnail key={video.videoId} video={video} />
      ))}
      
      <Text style={tw`text-xs text-gray-500 mt-1`}>
        {formatTime(timestamp)}
      </Text>
    </View>
  );
}
```

**VideoThumbnail.tsx:**
```typescript
import tw from 'twrnc';

interface VideoThumbnailProps {
  video: {
    videoId: string;
    title: string;
    thumbnail: string;
    timestamp: number;
    quote: string;
  };
}

export function VideoThumbnail({ video }: VideoThumbnailProps) {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity
      style={tw`mt-2 bg-white rounded-lg overflow-hidden shadow-md`}
      onPress={() => navigation.navigate('VideoPlayer', { 
        videoId: video.videoId,
        startTime: video.timestamp 
      })}
    >
      <Image
        source={{ uri: video.thumbnail }}
        style={tw`w-full h-32`}
      />
      <View style={tw`p-3`}>
        <Text style={tw`font-semibold`}>{video.title}</Text>
        <Text style={tw`text-sm text-gray-600 mt-1`}>
          {formatTimestamp(video.timestamp)} • Tap to watch
        </Text>
        <Text style={tw`text-xs text-gray-500 mt-2 italic`}>
          "{video.quote.substring(0, 100)}..."
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

### Phase 4: Integration & Testing (Week 4)

**Goal:** Connect all pieces and optimize

#### Tasks:
- [ ] Connect mobile app to backend API
- [ ] Implement local vector search in app
- [ ] Add offline support for transcripts
- [ ] Test caching effectiveness
- [ ] Optimize API response times
- [ ] Add error handling
- [ ] Implement retry logic
- [ ] Test on real devices
- [ ] Measure and optimize costs
- [ ] Add analytics

#### Performance Targets:
- Question flow: Instant (local)
- Vector search: <100ms (local)
- API response: <2s (with caching)
- Cache hit rate: >80%
- Cost per session: <$0.0001

## Data Models

### UserContext
```typescript
interface UserContext {
  trick: string;
  featureSize: 'small' | 'medium' | 'large' | 'xl';
  preTrick: 'yes' | 'no' | 'sometimes';
  edgeTransfers: 'good' | 'okay' | 'struggling';
  issues: string;
  spotLanding: boolean;
  consistency: 'always' | 'usually' | 'sometimes' | 'rarely';
  control: boolean;
}
```

### VideoSegment
```typescript
interface VideoSegment {
  videoId: string;
  videoTitle: string;
  segmentId: string;
  text: string;
  timestamp: number; // seconds
  duration: number;
  embedding: number[];
  topics: string[]; // e.g., ['carving', 'edge-control']
}
```

### ChatSession
```typescript
interface ChatSession {
  sessionId: string;
  userId: string;
  context: UserContext;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    videos?: VideoReference[];
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Environment Variables

```env
# Backend
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development

# Mobile App
API_URL=http://localhost:3000
YOUTUBE_API_KEY=your_youtube_api_key (optional)
```

## Dependencies

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@google/generative-ai": "^0.1.3",
    "ioredis": "^5.3.2",
    "youtube-transcript": "^1.0.6",
    "@xenova/transformers": "^2.6.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "tsx": "^4.7.0"
  }
}
```

### Mobile App
```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "nativewind": "^2.0.11",
    "twrnc": "^3.6.4",
    "expo-video": "~1.2.0",
    "axios": "^1.6.2",
    "@react-native-async-storage/async-storage": "1.21.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.0"
  }
}
```

## Success Metrics

- **Cost per user:** <$0.01/month
- **Response time:** <2 seconds
- **Cache hit rate:** >80%
- **User satisfaction:** Natural coaching feel
- **Accuracy:** Responses use actual video content
- **Engagement:** Users complete question flow

## Future Enhancements

- Voice input/output for hands-free use
- Progress tracking across sessions
- Personalized learning paths
- Community features (share sessions)
- Offline mode with pre-cached responses
- Video bookmarking
- Custom trick lists
