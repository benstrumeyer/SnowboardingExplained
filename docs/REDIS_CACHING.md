# Redis Caching Strategy

In-memory caching with LRU eviction and TTL expiration.

**Configuration:**
- Host: localhost
- Port: 6379
- Max Memory: 256MB
- Policy: allkeys-lru
- TTL: 1 hour per frame

**Features:**
- Preloads next 10 frames
- Tracks cache statistics
- Automatic TTL expiration
- LRU eviction prevents overflow

See backend/src/services/redisCacheService.ts for implementation.
