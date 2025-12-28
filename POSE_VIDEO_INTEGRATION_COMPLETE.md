# Pose Video Integration Complete

## Summary

The video upload flow has been fully integrated to automatically run track.py when videos are uploaded. The system now has two paths for video processing:

### Path 1: Chunked Upload (for large videos)
1. Frontend uploads video in 5MB chunks
2. Backend assembles chunks via `/api/finalize-upload`
3. Finalize endpoint calls Flask wrapper `/pose/video` 
4. Flask wrapper runs track.py and returns pose data
5. Pose data is stored in MongoDB

### Path 2: Direct Upload (for smaller videos)
1. Frontend uploads video directly to `/api/pose/video`
2. Backend runs track.py directly via WSL
3. Returns pose processing status

## Files Modified

### 1. Backend Server Integration
**File**: `SnowboardingExplained/backend/src/server.ts`

**Changes**:
- Added import: `import poseVideoRouter from './api/pose-video';`
- Mounted router with multer middleware: `app.use('/api/pose', upload.single('video'), poseVideoRouter);`

This allows the `/api/pose/video` endpoint to accept direct file uploads.

### 2. Pose Video Endpoint
**File**: `SnowboardingExplained/backend/src/api/pose-video.ts`

**Changes**:
- Fixed subprocess execution to use `execSync` instead of `spawn`
- Proper WSL path conversion using `wslpath` command
- Correct error handling and logging
- 10-minute timeout for track.py execution
- Returns status and video path on success

**Endpoint**: `POST /api/pose/video`
- Accepts: multipart form data with 'video' file
- Returns: `{ status: 'completed', videoPath, message }`
- Errors: Returns 400/500 with error details

### 3. Frontend Upload Modal
**File**: `SnowboardingExplained/backend/web/src/components/VideoUploadModal.tsx`

**Current Flow**:
- User selects video file
- Frontend uploads in 5MB chunks
- After all chunks uploaded, calls `/api/finalize-upload`
- Finalize endpoint handles Flask wrapper integration
- Modal closes and video is loaded

**Note**: The direct `/api/pose/video` endpoint is available as an alternative for smaller videos, but the current UI uses the chunked upload flow which is more robust for large files.

## How It Works

### Upload Flow
```
User selects video
    ↓
Frontend chunks video (5MB chunks)
    ↓
Upload chunks to /api/upload-chunk
    ↓
Call /api/finalize-upload
    ↓
Backend assembles chunks
    ↓
Backend calls Flask wrapper /pose/video
    ↓
Flask wrapper runs track.py via WSL
    ↓
track.py processes video and outputs pose data
    ↓
Backend stores pose data in MongoDB
    ↓
Frontend receives videoId and loads video
```

### Track.py Execution
```
Windows path: C:\Users\...\uploads\video-123.mp4
    ↓
Convert to WSL path: /mnt/c/Users/.../uploads/video-123.mp4
    ↓
Run: python -B 4D-Humans/track.py video.video_path=/mnt/c/... video.extract_video=False
    ↓
Output: Pose data in pickle format
```

## Key Features

✓ **Chunked uploads** - Handles large videos (up to 2GB)
✓ **Direct uploads** - Alternative endpoint for smaller videos
✓ **WSL integration** - Proper path conversion for Windows/WSL
✓ **Streaming mode** - `video.extract_video=False` prevents OOM
✓ **Error handling** - Comprehensive logging and error messages
✓ **Timeout protection** - 5-10 minute timeouts prevent hanging
✓ **Cleanup** - Temporary files cleaned up after processing

## Testing

### Test Direct Upload
```bash
curl -X POST http://localhost:3001/api/pose/video \
  -F "video=@test-video.mp4"
```

### Test Chunked Upload
1. Open web UI
2. Click upload button
3. Select video file
4. Monitor console for chunk upload progress
5. Wait for finalization and pose processing

## Troubleshooting

### "No video file provided"
- Ensure file is being sent as multipart form data
- Check that field name is 'video'

### "Failed to convert path"
- WSL may not be running
- Check WSL installation: `wsl --list --verbose`

### "Tracking failed"
- Check Flask wrapper is running on port 5000
- Check track.py logs in WSL
- Verify video file is valid

### Timeout errors
- Video may be too large or complex
- Check system resources (GPU memory, CPU)
- Increase timeout in code if needed

## Next Steps

1. **Test the complete flow** - Upload a video and verify pose data is stored
2. **Monitor logs** - Check console output for any issues
3. **Verify pose data** - Query MongoDB to confirm data structure
4. **Frontend display** - Ensure pose visualization works with returned data
