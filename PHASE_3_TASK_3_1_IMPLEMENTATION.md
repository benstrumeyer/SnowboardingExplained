# Phase 3, Task 3.1: Modify finalize-upload Endpoint - Implementation Summary

## Status: COMPLETED ✅

### Objective
Update the `/api/finalize-upload` endpoint to use Flask wrapper `/pose/video` endpoint for video-level processing instead of frame-by-frame processing.

### Implementation Details

#### 1. Flask Wrapper Integration
- **Location**: `SnowboardingExplained/backend/src/server.ts` (line 404+)
- **Change**: Added call to Flask wrapper `/pose/video` endpoint
- **Configuration**: Uses `process.env.POSE_SERVICE_URL` (defaults to `http://localhost:5000`)
- **Timeout**: 5 minutes (300,000ms) for video processing

#### 2. Flask Response Parsing
The endpoint now:
1. Sends video path to Flask wrapper: `POST /pose/video` with `{video_path: "/path/to/video.mp4"}`
2. Receives JSON response with all frames
3. Converts Flask response format to internal mesh sequence format:
   ```typescript
   {
     frameNumber: frame.frame_number,
     timestamp: frame.timestamp,
     keypoints: persons[0].keypoints_3d,
     has3d: true,
     mesh_vertices_data: persons[0].mesh_vertices,
     mesh_faces_data: persons[0].mesh_faces,
     cameraTranslation: persons[0].camera?.translation
   }
   ```

#### 3. Fallback to Frame-by-Frame Processing
If Flask wrapper fails (timeout, error, etc.):
1. Catches the error and logs warning
2. Falls back to frame extraction using `FrameExtractionService`
3. Processes frames through process pool (if available) or sequentially
4. Uses existing `/pose/hybrid` endpoint for individual frames
5. Logs fallback event for debugging

#### 4. MongoDB Storage
After pose extraction (either from Flask or fallback):
1. Connects to MongoDB
2. Saves mesh data using `meshDataService.saveMeshData()`
3. Stores all frames with video metadata
4. Returns success response to frontend

### Code Changes

#### Key Variables Added
```typescript
let meshSequence: any[] = [];
let fps = 30; // Default FPS
let videoDuration = 0;
```

#### Flask Call
```typescript
const flaskWrapperUrl = process.env.POSE_SERVICE_URL || 'http://localhost:5000';
const poseVideoUrl = `${flaskWrapperUrl}/pose/video`;

const poseResponse = await axios.post(poseVideoUrl, {
  video_path: videoPath
}, {
  timeout: 300000 // 5 minute timeout
});
```

#### Response Conversion
```typescript
meshSequence = flaskData.frames.map((frame: any) => {
  const persons = frame.persons || [];
  const keypoints = persons.length > 0 ? persons[0].keypoints_3d || [] : [];
  
  return {
    frameNumber: frame.frame_number || 0,
    timestamp: frame.timestamp || 0,
    keypoints: keypoints,
    has3d: true,
    jointAngles3d: {},
    mesh_vertices_data: persons.length > 0 ? persons[0].mesh_vertices || [] : [],
    mesh_faces_data: persons.length > 0 ? persons[0].mesh_faces || [] : [],
    cameraTranslation: persons.length > 0 ? persons[0].camera?.translation || null : null
  };
});
```

### Acceptance Criteria Status

- ✅ `finalize-upload` endpoint saves video to disk
- ✅ Endpoint calls `/pose/video` with video file path
- ✅ Endpoint receives JSON response with all frames
- ✅ Endpoint stores response in MongoDB
- ✅ Endpoint returns success response to frontend
- ✅ Fallback to frame-by-frame processing implemented
- ✅ Error handling with logging

### Testing

To test this implementation:

```bash
# 1. Start Flask wrapper
python SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py

# 2. Upload video via frontend or API
curl -X POST http://localhost:3001/api/finalize-upload \
  -H "Content-Type: application/json" \
  -d '{
    "role": "rider",
    "sessionId": "test-session",
    "filename": "test.mp4",
    "filesize": 1000000
  }'

# 3. Verify:
# - Flask wrapper receives request
# - Video is processed
# - MongoDB contains frame data
# - Frontend receives success response
```

### Next Steps

- **Task 3.2**: Implement MongoDB per-frame storage (already partially done in meshDataService)
- **Task 3.3**: Verify fallback logic works correctly
- **Task 4.1**: Update Flask wrapper configuration
- **Task 4.2**: Update backend configuration
- **Task 4.3**: Update documentation

### Notes

- The implementation maintains backward compatibility with existing frame-by-frame processing
- Fallback is automatic if Flask wrapper is unavailable
- All errors are logged for debugging
- MongoDB connection is established before saving
- Frame data is properly formatted for Three.js rendering
