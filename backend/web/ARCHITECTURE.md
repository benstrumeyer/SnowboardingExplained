# Pose Overlay Viewer - Web Service Architecture

## Overview

The Pose Overlay Viewer is a web-based 3D mesh visualization system for analyzing snowboarding form. It enables side-by-side comparison of rider and reference videos with interactive 3D mesh overlays.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  - VideoUploadModal: Video upload UI                        │
│  - PoseOverlayViewer: Main 3D visualization component       │
│  - MeshViewer: Three.js 3D rendering                        │
│  - PlaybackControls: Frame-by-frame playback                │
│  - MeshControls: Rotation & visibility controls             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│                  Backend API (Express.js)                   │
│  - POST /api/upload-video-with-pose: Video upload           │
│  - GET /api/mesh-data/{videoId}: Mesh data retrieval        │
│  - GET /api/job-status/{videoId}: Processing status         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│              Pose Service (Python Flask)                    │
│  - POST /pose/hybrid: 4D-Humans mesh extraction             │
│  - Processes video frames → 3D mesh data                    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Video Upload
```
User selects video
    ↓
VideoUploadModal uploads to /api/upload-video-with-pose
    ↓
Backend generates simple videoId: v_{timestamp}_{counter}
    ↓
Backend extracts frames from video
    ↓
Backend sends frames to Pose Service for mesh extraction
    ↓
Backend stores mesh data in meshDataStore[videoId]
    ↓
Backend returns videoId to frontend
```

### 2. Mesh Data Retrieval
```
Frontend receives videoId
    ↓
Frontend polls /api/mesh-data/{videoId}
    ↓
Backend looks up meshDataStore[videoId]
    ↓
Backend returns mesh frames (vertices, faces, keypoints)
    ↓
Frontend renders mesh in Three.js viewer
```

## Key Components

### Frontend

**VideoUploadModal.tsx**
- Handles video file selection and upload
- Polls `/api/job-status/{videoId}` for completion
- Calls `onVideoLoaded(videoId, role)` when ready

**PoseOverlayViewer.tsx**
- Main component managing rider and reference meshes
- Loads mesh data via `fetchRiderMesh()` and `fetchReferenceMesh()`
- Handles playback synchronization between meshes
- Provides rotation and visibility controls

**MeshViewer.tsx**
- Three.js scene rendering
- Renders mesh frames with vertices and faces
- Supports side-by-side and overlay modes

**meshDataService.ts**
- Polls `/api/mesh-data/{videoId}` with retry logic
- Prevents duplicate loads with `loadingVideos` Set
- Falls back to mock data if polling exhausted

### Backend

**server.ts** - Express.js API server
- `POST /api/upload-video-with-pose`: Receives video, extracts frames, sends to pose service, stores mesh data
- `GET /api/mesh-data/{videoId}`: Returns mesh data from meshDataStore
- `GET /api/job-status/{videoId}`: Returns job processing status

**meshDataStore** - In-memory storage
- Map<videoId, MeshSequence>
- Stores mesh frames with vertices, faces, keypoints
- Simple key format: `v_{timestamp}_{counter}`

### Pose Service

**app.py** - Python Flask service
- `POST /pose/hybrid`: Accepts base64 image, returns 4D-Humans mesh data
- Processes frames sequentially
- Returns mesh vertices, faces, keypoints, joint angles

## ID Scheme

Simple, collision-resistant video IDs:
```
Format: v_{timestamp}_{counter}
Example: v_1734867890123_1

- v: Prefix indicating video
- timestamp: Unix milliseconds when upload started
- counter: Incremental counter to prevent collisions
```

## Mesh Data Format

```typescript
interface MeshSequence {
  frames: MeshFrame[];
}

interface MeshFrame {
  frameNumber: number;
  timestamp: number;
  vertices: number[][];      // 3D vertex positions
  faces: number[][];          // Triangle face indices
  keypoints: Keypoint[];      // 24 SMPL skeleton joints
  has3d: boolean;             // Whether 3D data is available
  jointAngles3d?: Record<string, number>;  // Joint angles in degrees
  cameraTranslation?: number[];  // Camera position
}
```

## Polling Architecture

The system uses polling to bypass ngrok's 30-second timeout:

1. **Upload Phase**: Frontend uploads video, gets videoId immediately
2. **Processing Phase**: Frontend polls `/api/job-status/{videoId}` every 1 second
3. **Retrieval Phase**: Once complete, frontend polls `/api/mesh-data/{videoId}` until data arrives
4. **Rendering Phase**: Three.js renders mesh frames with playback controls

## Performance Considerations

- **Frame Limit**: Currently processes first 60 frames per video
- **Mesh Storage**: In-memory storage (suitable for MVP, consider persistence for production)
- **Polling Interval**: 1 second between status checks
- **Retry Logic**: 120 retries × 1 second = 2 minute timeout for mesh data retrieval

## Future Enhancements

- Persistent mesh data storage (database)
- Batch frame processing for faster extraction
- WebSocket support for real-time updates
- Mesh data caching and compression
- Support for multiple video formats
- Advanced form analysis features
