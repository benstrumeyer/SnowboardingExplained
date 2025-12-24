# Frontend Caching Strategy

Browser-based frame data caching with LRU eviction.

**Features:**
- In-memory cache (Map)
- LRU eviction (default 100 frames)
- Preloads next 10 frames
- Validates frame correspondence

**Configuration:**
- Cache size: 100 frames
- Preload count: 10 frames
- API base URL: http://localhost:3001

See backend/web/src/services/frameDataService.ts for implementation.
