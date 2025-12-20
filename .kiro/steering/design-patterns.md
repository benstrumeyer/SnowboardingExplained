---
inclusion: always
---

# Design Patterns & Architecture

## Video Processing Pipeline

The video analysis follows this flow:

```
Upload Video → Extract Frames → Pose Estimation → Mesh Rendering → Phase Detection → Store Results
```

### Key Components

1. **VideoUploadScreen**: User uploads video file
2. **videoAnalysisPipelineImpl**: Orchestrates processing
3. **pose-service (app.py)**: Estimates 3D pose per frame
4. **video_processor.py**: Renders mesh and extracts frame data
5. **phaseDetector**: Identifies trick phases
6. **VideoAnalysisScreen**: Displays results with frame navigation

## Data Structures

### AnalysisResult

```typescript
{
  jobId: string;
  status: 'processing' | 'complete' | 'error';
  result: {
    pose_timeline: Frame[];
    video_duration: number;
  };
}
```

### Frame (pose_timeline item)

```typescript
{
  frameNumber: number;
  timestamp: number;
  confidence: number;
  keypoints: Keypoint[];
  joints3D: number[][];
  jointAngles: Record<string, number>;
  has3D: boolean;
  meshRendered: boolean;
  imageBase64: string; // Data URI for frame image
}
```

### Keypoint

```typescript
{
  name: string;
  x: number;
  y: number;
  z: number;
  x_3d: number;
  y_3d: number;
  z_3d: number;
  confidence: number;
}
```

## API Patterns

### Video Upload Endpoint

- **POST** `/api/video/upload`
- FormData with `video` file and `max_frames` parameter
- Returns `jobId` for polling

### Job Status Endpoint

- **GET** `/api/video/job_status/:jobId`
- Returns processing status and results when complete

### Frame Extraction Endpoint

- **GET** `/api/video/frame/:jobId/:frameIndex`
- Returns frame image as data URI

## Mobile UI Patterns

### Screen Navigation

- `VideoUploadScreen` → `VideoAnalysisScreen` → `TrickAnalysisScreen`
- Frame navigation within analysis screens using `FrameNavigationControls`

### State Management

- Redux store with slices: `videoSlice`, `analysisSlice`, `phaseSlice`
- Async thunks for API calls in `thunks/`

### Component Composition

- `VideoAnalysisScreen`: Main container
- `AnalysisPanel`: Displays joint angles and frame info
- `FrameNavigationControls`: Frame-by-frame navigation
- `VideoAnalysisOverlay`: Mesh rendering on canvas

## Pose Service Architecture

### Request Flow

1. **app.py** receives video upload
2. **video_processor.py** extracts frames and processes
3. **hybrid_pose_detector.py** estimates pose per frame
4. **mesh_renderer.py** renders 3D mesh overlay
5. Results stored in job cache

### Key Functions

- `process_video_async()`: Main processing function
- `_project_vertices_to_2d()`: Projects 3D mesh to 2D screen space
- `render_mesh_on_frame()`: Draws mesh overlay on frame

## Performance Considerations

### Frame Processing

- `max_frames` parameter limits processing (default 15 for testing)
- Frames processed sequentially for stability
- Results cached in memory during processing

### Mesh Rendering

- Uses OpenGL for 3D rendering (with WSL workarounds)
- Renders to PIL Image for frame embedding
- Base64 encoded for transmission

### Mobile Rendering

- Canvas-based rendering for mesh overlay
- Horizontal flip applied for correct orientation
- Depth-based scaling for joint visualization

## Error Handling

### Backend

- Try-catch blocks in async handlers
- Error responses with status codes and messages
- Logging to `backend/logs/`

### Mobile

- Error alerts for failed uploads
- Retry logic for failed API calls
- Fallback UI states

### Pose Service

- Validation of input video format
- Graceful handling of missing frames
- Cleanup of temporary files

## Testing Patterns

### Unit Tests

- Located in `backend/pose-service/test_*.py`
- Test individual functions in isolation

### Integration Tests

- `backend/scripts/test-mvp-pipeline.ts`: End-to-end pipeline test
- Tests full flow from upload to analysis

### Manual Testing

- Use `max_frames=15` for quick testing
- Check logs for debugging
- Verify frame images in analysis screen
