# Frontend Upload Refactor Complete

## Summary
Simplified the frontend video upload flow to use direct upload to `/api/pose/video` endpoint instead of the complex chunked upload + finalize flow.

## Changes Made

### 1. VideoUploadModal.tsx
**File:** `SnowboardingExplained/backend/web/src/components/VideoUploadModal.tsx`

**Changes:**
- Removed `CHUNK_SIZE` constant (5MB chunks no longer needed)
- Removed `uploadChunks()` function (chunked upload logic)
- Simplified `handleUpload()` to use direct FormData upload to `/api/pose/video`
- Updated progress text from "Uploading..." / "Finalizing upload..." to "Uploading and processing..."
- Removed sessionId generation (no longer needed)
- Removed finalize-upload call

**Before:**
- Select file → Upload chunks to `/api/upload-chunk` → Call `/api/finalize-upload` → Get videoId
- 3 API calls total

**After:**
- Select file → Upload directly to `/api/pose/video` → Get response with videoPath
- 1 API call total

### 2. pose-video.ts
**File:** `SnowboardingExplained/backend/src/api/pose-video.ts`

**Changes:**
- Removed unused imports: `path` and `fs`
- Endpoint already properly configured to:
  - Accept multipart form data with 'video' file
  - Convert Windows path to WSL path
  - Run track.py directly via WSL
  - Return status and videoPath

## Architecture Simplification

### Old Flow (Chunked Upload)
```
Frontend                Backend
  |                       |
  +--upload-chunk-1------>|
  +--upload-chunk-2------>|
  +--upload-chunk-3------>|
  +--finalize-upload----->| (assemble chunks, run track.py)
  |<-----videoId----------+
```

### New Flow (Direct Upload)
```
Frontend                Backend
  |                       |
  +--POST /api/pose/video-| (multipart form data)
  |                       | (run track.py directly)
  |<-----videoPath--------+
```

## Benefits
1. **Simpler code** - No chunking logic, no session management
2. **Fewer API calls** - 1 call instead of 3+
3. **Cleaner architecture** - Direct upload matches the pose-video endpoint design
4. **Easier debugging** - Single upload flow to trace
5. **Reduced complexity** - No chunk assembly logic needed

## Backend Endpoints Status

### Active
- `POST /api/pose/video` - Direct video upload with track.py execution ✓

### Deprecated (kept for reference)
- `POST /api/upload-chunk` - Chunked upload (no longer used by frontend)
- `POST /api/finalize-upload` - Chunk assembly (no longer used by frontend)

These endpoints can be removed in a future cleanup if needed.

## Testing
1. Frontend now sends direct upload to `/api/pose/video`
2. Multer middleware handles file upload: `app.use('/api/pose', upload.single('video'), poseVideoRouter)`
3. pose-video endpoint processes the video and returns status + videoPath
4. Frontend receives response and calls `onVideoLoaded()` callback

## No Breaking Changes
- The `/api/pose/video` endpoint was already implemented and working
- Frontend simply switched to using it instead of the chunked flow
- All other components remain unchanged
