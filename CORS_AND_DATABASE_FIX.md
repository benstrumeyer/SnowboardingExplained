# CORS and Database Name Fix - Complete Solution

## Issues Fixed

### Issue 1: Database Name Mismatch
**Problem**: Backend was hardcoded to use `snowboarding` database, but connection string specified `snowboarding-explained`

**Solution**: Modified `meshDataService.ts` to extract database name from MongoDB connection string

**File**: `SnowboardingExplained/backend/src/services/meshDataService.ts`

```typescript
// Extract database name from connection string
let dbName = 'snowboarding'; // default fallback
try {
  const url = new URL(this.mongoUrl);
  const pathParts = url.pathname.split('/').filter(p => p);
  if (pathParts.length > 0) {
    dbName = pathParts[0];
    console.log(`[MESH-SERVICE] Using database from connection string: ${dbName}`);
  }
} catch (err) {
  console.log(`[MESH-SERVICE] Could not parse database name from URL, using default: ${dbName}`);
}

this.db = this.client.db(dbName);
```

### Issue 2: CORS Blocking Cache-Control Headers
**Problem**: Frontend was sending `cache-control` headers in axios client, but backend CORS configuration didn't allow them

**Error**:
```
Access to XMLHttpRequest at 'http://localhost:3001/api/mesh-data/...' has been blocked by CORS policy: 
Request header field cache-control is not allowed by Access-Control-Allow-Headers in preflight response.
```

**Solution 1**: Removed cache-control headers from axios client (not needed - backend handles it)

**File**: `SnowboardingExplained/backend/web/src/services/meshDataService.ts`

```typescript
// BEFORE - Caused CORS issues
const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// AFTER - Clean, no custom headers
const client = axios.create({
  baseURL: API_URL,
  timeout: 30000
});
```

**Solution 2**: Updated backend CORS headers to allow cache-control headers (for future use)

**File**: `SnowboardingExplained/backend/src/server.ts`

```typescript
// Added cache-control headers to CORS allow list
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires');
```

## Cache-Busting Strategy (Still Active)

The backend still sends aggressive cache-busting headers on responses:

```typescript
res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
res.setHeader('ETag', `"${videoId}-${Date.now()}"`);
```

And the frontend still uses query parameters for cache-busting:

```typescript
const url = `/api/mesh-data/${videoId}?t=${Date.now()}&r=${requestId}`;
```

## Files Modified

1. `SnowboardingExplained/backend/src/services/meshDataService.ts`
   - Extract database name from connection string
   - Remove cache-control headers from axios client

2. `SnowboardingExplained/backend/src/server.ts`
   - Add cache-control headers to CORS allow list

## Testing the Fix

1. **Restart the backend** - Changes require restart
2. **Check backend logs** - Should see:
   ```
   [MESH-SERVICE] Using database from connection string: snowboarding-explained
   ```
3. **Upload a video** - Should save to correct database
4. **Check browser console** - Should NOT see CORS errors
5. **Upload another video** - Right side should show new mesh, not old one

## Expected Behavior After Fix

✅ Different videos show different meshes on right side
✅ No CORS errors in browser console
✅ Mesh data saved to correct MongoDB database
✅ Cache-busting still works (query params + response headers)
✅ Switching between videos updates the mesh correctly

## Why This Happened

1. **Database mismatch**: Connection string and code used different database names
2. **CORS headers**: Frontend was sending headers that backend didn't allow
3. **Combination effect**: Both issues together made it appear like caching was broken

## Root Cause Summary

The mesh caching issue was actually **two separate bugs**:
1. Wrong database being queried (database name mismatch)
2. CORS blocking the requests (header not allowed)

Together, these made it impossible for the frontend to get mesh data, so it fell back to mock data, making it appear like the same mesh was always loading.
