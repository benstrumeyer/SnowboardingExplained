# Caching Strategy Overview

Your system uses a **multi-layer caching approach** to optimize performance across frame extraction, mesh data retrieval, and frontend playback.

## 1. Frame Extraction Cache (Filesystem)

**Location:** `backend/src/services/frameExtraction.ts`

**How it works:**
- Extracts video frames to disk at `{TEMP_DIR}/{videoId}/frame-*.png`
- Uses **full videoId** as directory name (prevents collisions)
- Stores metadata in `metadata.json` with fps, duration, frame count
- On subsequent requests, checks if frames already exist before re-extracting

**Cache Key:** `{videoId}` → Directory path

**Lookup Flow:**
```
1. Check MongoDB for cached mesh data
   ↓ (if found, return cached frames)
2. Check local filesystem for extracted frames
   ↓ (if found, return cached frames)
3. Extract frames from video (expensive operation)
   ↓
4. Save to filesystem for future requests
```

**Benefits:**
- Avoids expensive FFmpeg extraction on repeated requests
- Persists across server restarts
- Stores metadata for frame rate and duration

**Limitations:**
- Filesystem-based (slower than memory)
- Requires disk space for all extracted frames
- No automatic cleanup (manual `clearCache()` needed)

---

## 2. MongoDB Cache (Mesh Data)

**Location:** `backend/src/services/meshDataService.ts`

**How it works:**
- Stores mesh data in MongoDB collections:
  - `mesh_data` - Video metadata (fps, duration, frame count)
  - `mesh_frames` - Individual frame data (keypoints, mesh vertices)
- On upload, checks if mesh data already exists before processing
- Three-layer verification ensures data integrity:
  1. **Deletion Verification** - Confirms old frames deleted before insertion
  2. **Insertion Verification** - Confirms all new frames saved with correct videoId
  3. **Retrieval Verification** - Confirms retrieved frames have correct videoId

**Cache Key:** `videoId` → MongoDB document

**Lookup Flow:**
```
1. Query mesh_data collection for videoId
   ↓ (if found, return cached mesh data)
2. Query mesh_frames collection for all frames with videoId
   ↓ (if found, return cached frames)
3. Process video and extract mesh data (expensive)
   ↓
4. Save to MongoDB for future requests
```

**Benefits:**
- Persistent across server restarts
- Queryable (can filter by videoId, frame number, etc.)
- Supports batch operations
- Three-layer verification prevents stale data

**Limitations:**
- Network latency to MongoDB
- Requires database connection
- Manual cleanup needed for old videos

---

## 3. Redis Cache (Frame Data)

**Location:** `backend/src/services/redisCacheService.ts`

**How it works:**
- Caches individual frame data in Redis with TTL (1 hour default)
- Uses LRU (Least Recently Used) eviction policy
- Preloads next 10 frames during playback
- Tracks cache statistics (hits, misses, hit rate)

**Cache Key:** `video:{videoId}:frame:{frameIndex}` → Base64 frame data

**Lookup Flow:**
```
1. Check Redis for frame key
   ↓ (if found, return cached frame)
2. Fetch from backend API
   ↓
3. Store in Redis with TTL
```

**Configuration:**
```typescript
{
  host: 'localhost',
  port: 6379,
  maxMemory: '256mb',
  maxMemoryPolicy: 'allkeys-lru'
}
```

**Benefits:**
- In-memory (very fast)
- Automatic TTL expiration (1 hour)
- LRU eviction prevents memory overflow
- Preloading improves playback smoothness
- Cache statistics for monitoring

**Limitations:**
- In-memory only (lost on server restart)
- Requires Redis server running
- Limited by available RAM

---

## 4. Frontend Local Cache (Memory)

**Location:** `backend/web/src/services/frameDataService.ts`

**How it works:**
- Caches frame data in browser memory (Map)
- Uses LRU eviction (default 100 frames)
- Preloads next 10 frames during playback
- Validates frame correspondence (videoId + frameIndex)

**Cache Key:** `{videoId}:{frameIndex}` → FrameData object

**Lookup Flow:**
```
1. Check local Map for frame key
   ↓ (if found, return cached frame)
2. Fetch from backend API
   ↓
3. Store in local Map with LRU eviction
```

**Configuration:**
```typescript
{
  apiBaseUrl: 'http://localhost:3001',
  cacheSize: 100,        // max frames in memory
  preloadCount: 10       // frames to preload ahead
}
```

**Benefits:**
- Instant access (no network latency)
- Reduces backend requests
- Preloading improves playback smoothness
- LRU eviction prevents memory overflow

**Limitations:**
- Lost on page refresh
- Limited by browser memory
- Per-browser (not shared across tabs)

---

## Caching Layers Summary

```
┌─────────────────────────────────────────────────────────┐
│ Frontend Browser (Memory)                               │
│ - FrameDataService (LRU, 100 frames)                   │
│ - Preloads 10 frames ahead                             │
│ - Fastest access (no network)                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Backend Redis (In-Memory)                               │
│ - RedisCacheService (LRU, 256MB)                        │
│ - TTL: 1 hour                                           │
│ - Preloads 10 frames ahead                             │
│ - Fast access (network latency)                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Backend MongoDB (Persistent)                            │
│ - MeshDataService (mesh_data, mesh_frames)             │
│ - Three-layer verification                             │
│ - Survives server restart                              │
│ - Slower access (database query)                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Backend Filesystem (Persistent)                         │
│ - FrameExtractionService (extracted PNG frames)        │
│ - Metadata stored in JSON                              │
│ - Survives server restart                              │
│ - Slowest access (disk I/O)                            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Original Video File                                     │
│ - Source of truth                                       │
│ - Expensive to process (FFmpeg extraction)             │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow: Video Upload

```
1. User uploads video
   ↓
2. FrameExtractionService.extractFrames()
   - Check MongoDB cache (mesh_data)
   - Check filesystem cache (extracted frames)
   - If not cached: Extract frames with FFmpeg
   - Save to filesystem
   ↓
3. Extract pose/mesh data
   ↓
4. MeshDataService.saveMeshData()
   - Delete old frames for videoId (Layer 1)
   - Verify deletion (Layer 2)
   - Insert new frames (Layer 3)
   - Verify insertion (Layer 4)
   ↓
5. Return videoId to frontend
```

---

## Data Flow: Video Playback

```
1. Frontend requests frame
   ↓
2. FrameDataService.getFrame()
   - Check local browser cache (Map)
   - If not cached: Fetch from backend
   - Preload next 10 frames
   ↓
3. Backend receives request
   ↓
4. RedisCacheService.getFrame()
   - Check Redis cache
   - If not cached: Fetch from MongoDB or filesystem
   - Store in Redis with TTL
   ↓
5. Return frame to frontend
   ↓
6. Frontend caches frame locally
```

---

## Cache Hit Rates

**Expected Performance:**

| Layer | Hit Rate | Latency |
|-------|----------|---------|
| Frontend Memory | 80-90% | <1ms |
| Redis | 60-70% | 5-10ms |
| MongoDB | 40-50% | 50-100ms |
| Filesystem | 30-40% | 100-500ms |
| FFmpeg Extract | 0% | 1000-5000ms |

---

## Cache Invalidation

**When caches are cleared:**

1. **New video upload** - Old mesh data deleted from MongoDB
2. **Manual cleanup** - `FrameExtractionService.clearCache(videoId)`
3. **Redis TTL** - Frames expire after 1 hour
4. **Frontend refresh** - Browser cache cleared on page reload
5. **LRU eviction** - Oldest frames removed when cache full

---

## Configuration

### Redis Cache Config
```typescript
const redisConfig = {
  host: 'localhost',
  port: 6379,
  password: undefined,
  db: 0,
  maxMemory: '256mb',
  maxMemoryPolicy: 'allkeys-lru'
};
```

### Frontend Cache Config
```typescript
const frameDataConfig = {
  apiBaseUrl: 'http://localhost:3001',
  cacheSize: 100,        // frames to keep in memory
  preloadCount: 10       // frames to preload ahead
};
```

### Frame Extraction Config
```typescript
const FRAMES_PER_SECOND = 30;
const TEMP_DIR = path.join(os.tmpdir(), 'snowboard-frames');
const MAX_FRAMES = 500;  // Windows path limit protection
```

---

## Monitoring Cache Performance

**Redis Cache Stats:**
```typescript
const stats = redisCache.getStats();
console.log(`Cache hits: ${stats.hits}`);
console.log(`Cache misses: ${stats.misses}`);
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Frames cached: ${stats.totalFramesCached}`);
```

**Frontend Cache Stats:**
```typescript
const stats = frameDataService.getCacheStats();
console.log(`Cached frames: ${stats.cachedFrames}/${stats.maxSize}`);
```

---

## Best Practices

1. **Preload frames** - Always preload next 10 frames during playback
2. **Monitor hit rates** - Track Redis cache hit rate to optimize TTL
3. **Clear old data** - Manually clear filesystem cache for deleted videos
4. **Use compression** - Compress frame data for network transfer
5. **Validate correspondence** - Always verify videoId matches on retrieval
6. **Handle cache misses** - Gracefully fall back to slower layers
7. **Set appropriate TTLs** - 1 hour for Redis, 3600s for frame data
8. **Monitor memory** - Watch Redis memory usage and adjust maxMemory

