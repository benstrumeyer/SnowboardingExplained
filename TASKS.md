# MVP Development Tasks

## Goal: Working chatbot you can talk to about snowboarding

Priority: Get data → Build API → Simple chat UI → Test it works

---

## Phase 1: Data Pipeline (Days 1-2)

### Task 1.1: Setup Data Pipeline Project
- [ ] Create `data-pipeline/` folder
- [ ] Initialize Node.js project (`npm init`)
- [ ] Install dependencies:
  - `youtube-transcript` - Get video transcripts
  - `@google/generative-ai` - Generate embeddings
  - `@pinecone-database/pinecone` - Vector database
  - `dotenv` - Environment variables
- [ ] Create `.env` file with API keys

**Files to create:**
- `data-pipeline/package.json`
- `data-pipeline/.env`
- `data-pipeline/tsconfig.json`

---

### Task 1.2: Scrape YouTube Channel
- [ ] Create script to get all video IDs from channel
- [ ] Download transcripts for each video
- [ ] Save raw transcripts to `data/transcripts/`
- [ ] Save video metadata (title, URL, thumbnail, duration)

**Script:** `data-pipeline/scripts/1-scrape-transcripts.ts`

**Output:**
```
data/
├── transcripts/
│   ├── video-001.json
│   ├── video-002.json
│   └── ...
└── metadata.json
```

**Test:** Run script, verify ~200 video transcripts downloaded

---

### Task 1.3: Chunk Transcripts
- [ ] Split transcripts into 30-second segments
- [ ] Keep timestamp and video metadata with each chunk
- [ ] Filter out intro/outro/sponsor segments (optional)
- [ ] Save chunked data

**Script:** `data-pipeline/scripts/2-chunk-transcripts.ts`

**Output:**
```
data/
└── chunks/
    └── all-chunks.json
```

**Test:** Verify chunks have text, timestamp, videoId, videoTitle

---

### Task 1.4: Generate Embeddings
- [ ] Use Gemini `text-embedding-004` model
- [ ] Generate embedding for each chunk
- [ ] Save embeddings with metadata

**Script:** `data-pipeline/scripts/3-generate-embeddings.ts`

**Output:**
```
data/
└── embeddings/
    └── embeddings.json
```

**Test:** Verify each chunk has 768-dimensional embedding

---

### Task 1.5: Upload to Pinecone
- [ ] Create Pinecone index (dimension: 768)
- [ ] Batch upload all embeddings
- [ ] Verify upload successful

**Script:** `data-pipeline/scripts/4-upload-pinecone.ts`

**Test:** Query Pinecone, verify results returned

---

## Phase 2: Backend API (Days 3-4)

### Task 2.1: Setup Vercel Project
- [ ] Create `backend/` folder
- [ ] Initialize with `npm init`
- [ ] Install dependencies:
  - `@google/generative-ai`
  - `@pinecone-database/pinecone`
  - `@vercel/kv`
  - `@vercel/node`
- [ ] Create `vercel.json` config
- [ ] Setup environment variables in Vercel

**Files:**
- `backend/package.json`
- `backend/vercel.json`
- `backend/tsconfig.json`

---

### Task 2.2: Create Pinecone Service
- [ ] Create `lib/pinecone.ts`
- [ ] Implement `searchVideoSegments(query, topK)`
- [ ] Test search returns relevant results

**Test:** Search for "backside 180", verify relevant videos returned

---

### Task 2.3: Create Gemini Service
- [ ] Create `lib/gemini.ts`
- [ ] Implement `generateEmbedding(text)`
- [ ] Implement `generateCoachingResponse(context, segments)`
- [ ] Test response generation

**Test:** Generate response, verify it uses coach's style

---

### Task 2.4: Create Cache Service
- [ ] Create `lib/cache.ts`
- [ ] Implement `getCachedResponse(context)`
- [ ] Implement `cacheResponse(context, response)`
- [ ] Setup Vercel KV

**Test:** Cache and retrieve a response

---

### Task 2.5: Create Chat API Endpoint
- [ ] Create `api/chat.ts`
- [ ] Handle POST requests
- [ ] Implement flow:
  1. Check cache
  2. Generate query embedding
  3. Search Pinecone
  4. Generate response with Gemini
  5. Cache response
  6. Return with video references

**Test:** 
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "trick": "backside 180",
      "featureSize": "medium",
      "issues": "not getting enough rotation"
    },
    "sessionId": "test-123"
  }'
```

---

### Task 2.6: Deploy to Vercel
- [ ] Run `vercel deploy`
- [ ] Test production endpoint
- [ ] Verify caching works

**Test:** Make same request twice, verify second is cached

---

## Phase 3: Conversational Chat UI (Days 5-6)

### Task 3.1: Create Basic React Native App
- [x] Run `npx create-expo-app mobile`
- [x] Install dependencies:
  - `twrnc`
  - `axios`
  - `@react-native-async-storage/async-storage`
- [x] Setup TypeScript
- [x] Test app runs on device/simulator

---

### Task 3.2: Create Conversational Chat Screen
- [ ] Create single `ChatScreen.tsx` with SMS-style interface
- [ ] Implement chat message bubbles (user on right, coach on left)
- [ ] Add text input at bottom
- [ ] Show typing indicator when coach is "thinking"
- [ ] Store conversation history in state

**Key Change:** No separate question flow screen. Everything happens in chat.

---

### Task 3.3: Implement Context Collection Logic
- [ ] Create `useContextCollection` hook to track what info we have
- [ ] Define required fields: `trick`, optional: `featureSize`, `issues`, etc.
- [ ] Coach asks follow-up questions until context is complete
- [ ] Use local logic (no API calls) for follow-up questions

**Example Flow:**
```
Coach: "Hey! What trick are you working on?"
User: "backside 180"
Coach: "Nice! What size feature? (small/medium/large)"
User: "medium"
Coach: "Got it. What's giving you trouble?"
User: "not getting enough rotation"
[NOW make single API call with full context]
Coach: [Real AI response with video references]
```

---

### Task 3.4: Build Question Logic System
- [ ] Create predefined follow-up questions for each missing field
- [ ] Parse user responses to extract context (simple keyword matching)
- [ ] Track which fields are filled vs missing
- [ ] Only call API when we have minimum required context (trick name). But don't call api immediately if they have more information

**Files:**
- `mobile/src/hooks/useContextCollection.ts`
- `mobile/src/utils/parseUserResponse.ts`

---

### Task 3.5: Connect to API (Single Call)
- [x] Create `services/api.ts`
- [ ] Only call API when context is complete
- [ ] Show ellipsis when api call. Make it look like the coach is thinking of what to say. 
- [ ] Display AI response with video references
- [ ] Handle errors gracefully

**Test:** Complete conversation, verify only ONE API call is made

---

### Task 3.6: Add Video References in Chat
- [ ] Display video thumbnails inline in coach's response
- [ ] Make thumbnails tappable
- [ ] Open YouTube app/browser at correct timestamp
- [ ] Show video title and timestamp below thumbnail

**Test:** Tap video, verify YouTube opens at correct timestamp

---

### Task 3.7: Polish Conversational Flow
- [ ] Add natural delays between coach messages (simulate typing)
- [ ] Allow user to provide all info at once ("I want to learn backside 180 on medium features")
- [ ] Parse multi-part responses intelligently
- [ ] Add "Start Over" button to reset conversation

---

## Phase 4: MVP Testing & Polish (Day 7)

### Task 4.1: End-to-End Testing
- [ ] Test full flow: Questions → API → Response
- [ ] Test with different tricks
- [ ] Verify video references are relevant
- [ ] Check response quality
- [ ] Test caching works

---

### Task 4.2: Basic Error Handling
- [ ] Handle API errors gracefully
- [ ] Show error messages to user
- [ ] Add retry button
- [ ] Handle no internet connection

---

### Task 4.3: Save Chat History
- [ ] Save completed chats to AsyncStorage
- [ ] Create simple home screen with chat list
- [ ] Allow opening previous chats
- [ ] Add "New Chat" button

---

### Task 4.4: Polish UI
- [ ] Add loading animations
- [ ] Improve styling with twrnc
- [ ] Add coach avatar/icon
- [ ] Make it look like ChatGPT mobile

---

## MVP Complete! 🎉

**What you'll have:**
- Working data pipeline (all videos scraped and indexed)
- Vercel API that generates coaching responses
- Conversational SMS-style chat interface
- Context collected through natural conversation
- Single optimized API call per coaching session
- Video references with timestamps
- Chat history saved locally

**What's NOT in MVP:**
- Fancy UI components or animations
- Voice input
- Offline mode
- Advanced caching strategies
- Analytics
- User accounts
- Multi-language support

---

## Post-MVP Enhancements (Later)

### Polish Question Flow
- [ ] Build reusable components (BinaryChoice, SkillLevelSelector, etc.)
- [ ] Add skip logic
- [ ] Add animations
- [ ] Add progress indicator

### Advanced Features
- [ ] Voice input/output
- [ ] Offline mode with cached responses
- [ ] Session tracking and progress
- [ ] Share chats with friends
- [ ] Bookmark favorite videos

---

## Time Estimate

**Phase 1 (Data):** 2 days
**Phase 2 (API):** 2 days  
**Phase 3 (Mobile):** 2 days
**Phase 4 (Testing):** 1 day

**Total MVP:** ~7 days

---

## Success Criteria

✅ Can ask about any trick and get relevant coaching  
✅ Response uses coach's actual words from videos  
✅ Video references are accurate and helpful  
✅ Response time < 3 seconds  
✅ Caching reduces API costs by 80%+  
✅ App doesn't crash  
✅ Can save and view chat history  

---

## Ready to Start?

**First task:** Task 1.1 - Setup Data Pipeline Project

Run:
```bash
cd SnowboardingExplained
mkdir data-pipeline
cd data-pipeline
npm init -y
npm install youtube-transcript @google/generative-ai @pinecone-database/pinecone dotenv
```

Let's go! 🚀
