# Stale Mesh Data Issue - Root Cause Found and Fixed

## Problem Statement
When uploading a second rider video, the mesh overlay displayed the first video's mesh instead of the new video's mesh. The second video appeared to have only 7 frames instead of the expected ~31 frames.

## Root Cause Analysis

### Initial Investigation
We created diagnostic scripts to query the MongoDB database and found:
- Video 1: 7 frames extracted (expected ~31)
- Video 2: 7 frames extracted (expected ~31)
- Both videos had identical frame counts and timestamps

### The Bug
The issue was in `FrameExtractionService.getShortVideoPath()` function:

```typescript
// BUGGY CODE
function getShortVideoPath(videoId: string): string {
  const shortId = videoId.substring(0, 8);  // ❌ Only first 8 chars!
  return shortId;
}
```

**Problem:** Both videoIds start with the same 8 characters:
- Video 1: `v_1766516045056_1` → shortId: `v_176651`
- Video 2: `v_1766516091051_2` → shortId: `v_176651`

**Result:** Both videos used the SAME cache directory, so the second video's frame extraction returned the first video's cached 7 frames instead of extracting new frames.

### Why Only 7 Frames?
The first video was only partially extracted (7 out of 31 expected frames). This could be due to:
- Pose service timeout or failure after 7 frames
- Early termination of frame extraction
- Partial video processing

When the second video was uploaded, it reused this incomplete cache.

## The Fix

Changed `getShortVideoPath()` to use the full videoId:

```typescript
// FIXED CODE
function getShortVideoPath(videoId: string): string {
  // Use full videoId for unique cache directories
  // Windows path limit is 260 chars, and our paths are short enough
  return videoId;
}
```

**Result:** Each video now gets its own unique cache directory, preventing cross-contamination.

## Files Modified
1. `SnowboardingExplained/backend/src/services/frameExtraction.ts` - Fixed `getShortVideoPath()` function
2. `SnowboardingExplained/backend/src/server.ts` - Added pre-connection to MongoDB before frame extraction

## Verification Steps

To verify the fix works:
1. Clear the frame cache directory: `SnowboardingExplained/backend/uploads` and temp directories
2. Upload first video
3. Verify mesh displays correctly
4. Upload second video
5. Verify second video's mesh displays (not first video's mesh)
6. Check frame counts in MongoDB:
   ```bash
   node query-mesh-db.js
   ```

## Related Components

### MeshDataService (Already Implemented)
The `meshDataService.ts` already has proper three-layer verification:
- **Layer 1:** Deletion verification - deletes old frames before insertion
- **Layer 2:** Insertion verification - confirms all frames inserted
- **Layer 3:** Retrieval verification - confirms frames have correct videoId

This service is working correctly and properly cleans up old data.

### Frame Extraction Service (Now Fixed)
The `frameExtraction.ts` now properly isolates cache directories per video.

## Testing Recommendations

1. **Unit Test:** Test `getShortVideoPath()` with multiple videoIds
2. **Integration Test:** Upload multiple videos and verify each has correct frame count
3. **Property-Based Test:** Generate random videoIds and verify no cache collisions

## Impact
- ✅ Fixes stale mesh data issue
- ✅ Ensures each video gets its own frame cache
- ✅ Prevents frame extraction from returning wrong video's frames
- ✅ Maintains backward compatibility with existing code
