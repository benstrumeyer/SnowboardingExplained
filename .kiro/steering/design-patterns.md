# Design Patterns

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Video Processing Pipeline

```
Video Upload → Extract Frames → 4D-Humans Pose → PHALP Tracking → Mesh Render → JSON Response
```

## Data Structures

### Upload Request
```typescript
{
  video: File;
  max_frames?: number;  // Optional: limit frames for testing
}
```

### Pose Response
```typescript
{
  jobId: string;
  status: 'processing' | 'complete' | 'error';
  result: {
    pose_timeline: Frame[];
    video_duration: number;
    fps: number;
  };
}
```

### Frame
```typescript
{
  frameNumber: number;
  timestamp: number;
  keypoints: Keypoint[];
  joints3D: number[][];
  meshData: {
    vertices: number[][];
    faces: number[][];
  };
  tracked: boolean;  // PHALP tracked this frame
}
```

## API Patterns

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/video/upload` | POST | Upload video, get jobId |
| `/api/video/job_status/:jobId` | GET | Check processing status |
| `/api/video/frame/:jobId/:frameIndex` | GET | Get frame with mesh data |

## Key Design Decisions

1. **Full Video Processing** - Process entire video at once (enables PHALP temporal tracking)
2. **PHALP Temporal Tracking** - Ensures motion consistency across frames
3. **Native FPS Playback** - Render at original video FPS (60FPS interpolation deferred)
4. **Mesh-Based Rendering** - 3D mesh overlays instead of skeleton lines
5. **Async Processing** - Video processing happens asynchronously

## Frontend Rendering

- Receive pose timeline from backend
- Create 3D mesh from keypoints
- Animate through frames at native FPS
- Use PHALP tracking data for smooth motion

## Error Handling

- Backend: Try-catch with error logging
- Pose Service: Validate video format, handle missing frames
- Frontend: Retry logic, fallback UI states
