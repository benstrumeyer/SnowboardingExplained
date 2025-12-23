# Pose Service Integration Fix

## Problem
The `/api/upload-video-with-pose` endpoint was corrupted with duplicate code and had a fundamental architectural mismatch:
- **Backend was sending**: Video files as multipart form-data to the pose service
- **Pose service expects**: Base64-encoded images via JSON POST requests

This caused the pose service to fail because it couldn't process video files directly.

## Solution
Rewrote the endpoint to follow the correct flow:

1. **Extract frames** from video using `FrameExtractionService`
2. **Convert frames to base64** using the frame extraction service
3. **Send base64 images** to pose service via `detectPoseHybridBatch()` 
4. **Extract mesh data** from pose results and store in jobStore

## Key Changes

### Before (Broken)
```typescript
// Tried to send video file as multipart form-data
const formData = new FormData();
const videoBuffer = fs.readFileSync(videoPath);
const blob = new Blob([videoBuffer], { type: 'video/quicktime' });
formData.append('video', blob, path.basename(videoPath));

await axios.post(`${POSE_SERVICE_URL}/process_video_async`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

### After (Fixed)
```typescript
// Extract frames and convert to base64
const extractionResult = await FrameExtractionService.extractFrames(videoPath, videoId, 4);
const framesBase64 = extractionResult.frames.map(frame => ({
  imageBase64: FrameExtractionService.getFrameAsBase64(frame.imagePath),
  frameNumber: frame.frameNumber,
}));

// Send base64 images to pose service
const poseResults = await detectPoseHybridBatch(framesBase64, false);
```

## Pose Service Endpoints

The pose service expects:
- **POST `/pose/hybrid`** - Single frame pose detection
  - Input: `{ image_base64: string, frame_number: number, visualize: boolean }`
  - Output: `HybridPoseFrame` with 3D joints, mesh vertices, and faces

- **Batch processing** - Use `detectPoseHybridBatch()` which calls `/pose/hybrid` sequentially

## Testing
To verify the fix works:
1. Start the pose service: `cd backend/pose-service && python app.py`
2. Upload a video to `/api/upload-video-with-pose`
3. Poll `/api/mesh-data/{videoId}` to check processing status
4. Verify mesh data is returned with vertices and faces

## Files Modified
- `SnowboardingExplained/backend/api/upload-video-with-pose.ts` - Fixed endpoint implementation
