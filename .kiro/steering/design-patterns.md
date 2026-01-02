# Design Patterns

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Video Processing Pipeline

```
Video Upload → Extract Frames → 4D-Humans Pose → PHALP Tracking → Mesh Render → Save Videos → JSON Response
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
    frames: Frame[];
    originalVideo: {
      filename: string;
      size: number;
    };
    meshOverlayVideo: {
      filename: string;
      size: number;
    };
    metadata: {
      fps: number;
      duration: number;
      resolution: [width, height];
      frameCount: number;
    };
  };
}
```

### Frame
```typescript
{
  frameNumber: number;
  timestamp: number;
  vertices: number[][];      // 6890 3D points
  faces: number[][];         // 13776 triangle indices
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focal_length: number;
  };
  personId: number;
  tracked: boolean;          // PHALP tracked this frame
  confidence: number;
}
```

### Side-by-Side View Data
```typescript
{
  jobId: string;
  originalVideo: Binary;     // Original uploaded video
  meshOverlayVideo: Binary;  // track.py output with mesh overlay
  frames: Frame[];           // Mesh data for Three.js
  metadata: {
    fps: number;
    duration: number;
    resolution: [width, height];
    frameCount: number;
  };
}
```

## API Patterns

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pose/video` | POST | Upload video, get jobId |
| `/api/pose/job_status/:jobId` | GET | Check processing status |
| `/api/video/:jobId` | GET | Get video document with metadata |
| `/api/video/:jobId/original/stream` | GET | Stream original video |
| `/api/video/:jobId/overlay/stream` | GET | Stream mesh overlay video |
| `/api/video/:jobId/frame/:frameNumber` | GET | Get specific frame as image |

## Key Design Decisions

1. **Full Video Processing** - Process entire video at once (enables PHALP temporal tracking)
2. **PHALP Temporal Tracking** - Ensures motion consistency across frames
3. **Native FPS Playback** - Render at original video FPS
4. **Mesh-Based Rendering** - 3D mesh overlays in Three.js
5. **Async Processing** - Video processing happens asynchronously
6. **Side-by-Side View** - Left: video toggle (original/overlay), Right: Three.js mesh
7. **Frame Sync** - Both video and 3D mesh stay in perfect sync
8. **Video Storage** - Both videos saved to MongoDB with metadata

## Frontend Rendering

### Side-by-Side View Layout
```
┌─────────────────────────────────────────────────────┐
│ Left Panel (Video)      │ Right Panel (3D Mesh)     │
│ ┌───────────────────┐   │ ┌───────────────────────┐ │
│ │ [Original/Overlay]│   │ │ Three.js Canvas       │ │
│ │ Toggle Button     │   │ │ (Synced Mesh)         │ │
│ │                   │   │ │                       │ │
│ │ Video Player      │   │ │ 3D Mesh Visualization│ │
│ │ (Frame-by-frame)  │   │ │ (Real-time)           │ │
│ └───────────────────┘   │ └───────────────────────┘ │
│ Shared Timeline / Scrubber (both videos + mesh)     │
│ [◄ Prev] [Play/Pause] [Next ►] [Frame: 0/300]      │
└─────────────────────────────────────────────────────┘
```

### Synchronization
- Load frames array with mesh data
- Create Three.js BufferGeometry from vertices/faces
- Apply camera parameters for correct viewpoint
- Animate both video and mesh at same frame rate
- Scrubber updates both video and mesh simultaneously

## Error Handling

- Backend: Try-catch with error logging
- Pose Service: Validate video format, handle missing frames
- Frontend: Retry logic, fallback UI states
- Video Sync: Fallback to frame-by-frame if streaming fails
