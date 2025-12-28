# Pose Video Endpoint - Ready for Use

## Status: ✅ READY

The system is already configured to use the `/pose/video` endpoint for video-level processing with PHALP.

## Flow

When a user clicks "Upload Rider" and uploads a video:

1. **Frontend** (`VideoUploadModal.tsx`):
   - User selects video file
   - Video is uploaded in 5MB chunks
   - Chunks are sent to `/api/upload-chunk`

2. **Backend** (`server.ts` - `/api/finalize-upload`):
   - Chunks are assembled into final video file
   - **PHASE 3**: Calls Flask wrapper `/pose/video` endpoint with video path
   - Flask processes entire video with PHALP temporal tracking
   - Response is converted to mesh sequence format
   - Mesh data is stored in MongoDB

3. **Flask Wrapper** (`flask_wrapper_minimal_safe.py` - `/pose/video`):
   - Receives video path
   - Spawns `track.py` subprocess to run PHALP on entire video
   - Returns frame-by-frame pose data with temporal tracking
   - Handles GPU memory management and queuing

## Key Code Locations

### Frontend
- `SnowboardingExplained/backend/web/src/components/VideoUploadModal.tsx` - Upload UI

### Backend
- `SnowboardingExplained/backend/src/server.ts` (lines 404-723) - `/api/finalize-upload` endpoint
  - Line 475: Calls Flask `/pose/video` endpoint
  - Line 480-510: Converts Flask response to mesh sequence format
  - Line 512-600: Falls back to frame-by-frame if Flask fails

### Flask Wrapper
- `SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py` (lines 818-1074)
  - `/pose/video` endpoint - accepts video path
  - `process_video_subprocess()` - spawns track.py
  - Handles GPU queuing and memory management

## What's Already Implemented

✅ Video upload with chunking (5MB chunks)
✅ Chunk assembly in finalize-upload
✅ Flask `/pose/video` endpoint call
✅ Response parsing and conversion to mesh format
✅ MongoDB storage of mesh data
✅ Fallback to frame-by-frame if Flask fails
✅ GPU memory clearing (CUDA OOM fix)
✅ Lazy model loading on first request

## To Use

1. Ensure Flask wrapper is running:
   ```bash
   wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_minimal_safe.py"
   ```

2. Ensure `POSE_SERVICE_URL` environment variable is set:
   ```bash
   export POSE_SERVICE_URL=http://localhost:5000
   ```

3. Upload video through UI - it will automatically use `/pose/video` endpoint

## Notes

- The system intelligently falls back to frame-by-frame processing if Flask fails
- GPU memory is managed with strategic `torch.cuda.empty_cache()` calls
- Models load lazily on first request to avoid long startup times
- PHALP provides temporal tracking across the entire video for better pose consistency
