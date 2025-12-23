# Synchronized Video & Mesh Playback Design

## Overview

This design implements frame-by-frame synchronized playback of original video, 2D mesh-overlaid video, and 3D mesh models across multiple scenes. Each scene maintains its independent frame position while all scenes advance at the same playback speed. Videos are always synced with their corresponding 3D meshes at the same frame index. The system leverages Redis for high-performance frame caching, shared mesh transposition code from React Native, and ensures zero drift between video and mesh within each scene.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Scene 1      │  │ Scene 2      │  │ Scene N      │      │
│  │ Frame: 5     │  │ Frame: 12    │  │ Frame: 8     │      │
│  │ - 3D Mesh    │  │ - 3D Mesh    │  │ - 3D Mesh    │      │
│  │ - Video      │  │ - Video      │  │ - Video      │      │
│  │ - Overlay    │  │ - Overlay    │  │ - Overlay    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ▲                  ▲                  ▲              │
│         └──────────────────┼──────────────────┘              │
│              PlaybackSync Service                           │
│         (Advances all by 1 frame/tick)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Frame API        │
                    │  /api/video/frame │
                    │  (per scene)      │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │  Redis  │          │ MongoDB  │          │ File    │
   │  Cache  │          │ Metadata │          │ Storage │
   │         │          │          │          │         │
   │ Frames  │          │ Mesh     │          │ Frames  │
   │ 0-10    │          │ Data     │          │ JPEG    │
   └─────────┘          └──────────┘          └─────────┘
```

**Key Principle:** Each scene maintains its own frame index. Global playback controls advance all scenes by the same amount per tick, but scenes can be at different frame positions. Videos are always displayed at the frame index matching the 3D mesh in that scene.

## Components and Interfaces

### 1. PlaybackSyncService (Frontend)

Manages synchronized playback speed across all scenes while maintaining independent frame positions.

```typescript
interface PlaybackSyncService {
  // Initialize playback for multiple scenes with independent frame tracking
  initializePlayback(videoIds: string[], fps: number): Promise<void>;
  
  // Advance all scenes by one frame (maintains independent positions)
  advanceFrame(): void;
  
  // Seek all scenes by the same frame offset (maintains independent positions)
  seekByOffset(frameOffset: number): Promise<void>;
  
  // Set playback speed for all scenes
  setPlaybackSpeed(speed: number): void;
  
  // Pause all scenes at their current independent frame positions
  pause(): void;
  
  // Resume all scenes from their current independent frame positions
  play(): void;
  
  // Get current frame index for a specific scene
  getSceneFrameIndex(sceneId: string): number;
  
  // Subscribe to frame changes for a specific scene
  onSceneFrameChange(sceneId: string, callback: (frameIndex: number) => void): void;
}
```

### 2. FrameDataService (Frontend)

Retrieves frame data from backend with caching.

```typescript
interface FrameData {
  frameIndex: number;
  timestamp: number;
  originalFrame: string; // base64 JPEG
  overlayFrame: string; // base64 JPEG with mesh
  meshData: {
    keypoints: Keypoint[];
    skeleton: Skeleton;
  };
}

interface FrameDataService {
  // Get frame data (checks local cache first)
  getFrame(videoId: string, frameIndex: number): Promise<FrameData>;
  
  // Preload next N frames
  preloadFrames(videoId: string, startFrame: number, count: number): Promise<void>;
  
  // Clear local cache
  clearCache(): void;
}
```

### 3. Frame API Endpoint (Backend)

Returns frame data for a specific scene at a specific frame index. Videos are always synced with their corresponding 3D mesh.

```
GET /api/video/{videoId}/frame/{frameIndex}
  Query params:
    - includeOverlay: boolean (default: true)
    - includeOriginal: boolean (default: true)
    - includeMesh: boolean (default: true)
  
  Response:
  {
    videoId: string,
    frameIndex: number,
    timestamp: number,
    originalFrame?: string,      // JPEG at frameIndex
    overlayFrame?: string,        // JPEG with mesh at frameIndex
    meshData?: {                  // 3D mesh at frameIndex
      keypoints: [],
      skeleton: {}
    }
  }
  
  Guarantee: originalFrame, overlayFrame, and meshData all correspond to frameIndex
```

### 4. Redis Cache Layer (Backend)

```
Key structure:
  video:{videoId}:frame:{frameIndex}:original -> JPEG bytes
  video:{videoId}:frame:{frameIndex}:overlay -> JPEG bytes
  video:{videoId}:frame:{frameIndex}:mesh -> JSON

TTL: 1 hour
Preload: Next 10 frames when video is loaded
```

### 5. Shared Mesh Transposition Library

Extract from React Native and make available to both platforms:

```typescript
// shared/mesh-transposition/index.ts
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Convert 2D video coordinates to 3D world space
export function transpose2DTo3D(
  point2D: Point2D,
  cameraMatrix: Matrix4,
  depthMap: Float32Array
): Point3D;

// Convert 3D world coordinates to 2D screen space
export function map3DTo2D(
  point3D: Point3D,
  cameraMatrix: Matrix4,
  viewportWidth: number,
  viewportHeight: number
): Point2D;

// Generate 2D mesh overlay on video frame
export function generateMeshOverlay(
  videoFrame: HTMLCanvasElement,
  keypoints: Keypoint[],
  skeleton: Skeleton,
  cameraMatrix: Matrix4
): HTMLCanvasElement;
```

## Data Models

### VideoSequence (MongoDB)

```typescript
{
  _id: ObjectId,
  videoId: string,
  fps: number,
  totalFrames: number,
  videoDuration: number,
  frames: [
    {
      frameIndex: number,
      timestamp: number,
      meshData: {https://trakt.tv/
        keypoints: Keypoint[],
        skeleton: Skeleton
      }
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Frame Storage (File System)

```
/uploads/
├── {videoId}/
│   ├── original/
│   │   ├── 0.jpg
│   │   ├── 1.jpg
│   │   └── ...
│   └── overlay/
│       ├── 0.jpg
│       ├── 1.jpg
│       └── ...
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Independent Frame Position Maintenance

*For any* set of scenes playing simultaneously, each scene SHALL maintain its own independent frame index while advancing at the same rate as other scenes.

**Validates: Requirements 6.1, 6.3**

### Property 2: Playback Speed Consistency

*For any* playback speed change, all scenes SHALL advance frames at the same rate proportional to the speed multiplier, while maintaining their independent frame positions.

**Validates: Requirements 6.2**

### Property 3: Frame Seek Offset Consistency

*For any* frame seek operation, all scenes SHALL advance by the same frame offset without forcing them to the same frame index.

**Validates: Requirements 6.5**

### Property 4: Video-Mesh Frame Correspondence

*For any* scene at frame index N, the displayed video frame (original or overlay) SHALL always correspond to the 3D mesh frame index N, regardless of other scenes' positions.

**Validates: Requirements 6.6, 7.1**

### Property 5: Frame Data Consistency

*For any* frame request, the returned original frame, overlay frame, and mesh data SHALL all correspond to the same frame index and timestamp.

**Validates: Requirements 2.1, 2.2, 7.1**

### Property 6: Overlay Toggle Idempotence

*For any* scene with overlay toggled on then off then on again, the displayed frame SHALL be identical to the initial overlay frame without frame index change.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 7: Redis Cache Hit Rate

*For any* frame request during playback, the frame SHALL be retrieved from Redis cache with 100% hit rate for preloaded frames.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: Mesh Transposition Equivalence

*For any* video frame and pose data, the 3D mesh generated by web transposition SHALL be identical to React Native transposition for the same input.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

## Error Handling

- **Frame Not Found**: Return 404 with fallback to previous frame
- **Cache Miss**: Load from disk and populate cache asynchronously
- **Sync Drift**: Detect and correct by resetting all scenes to current frame
- **Playback Stall**: Pause and alert user if frames cannot be loaded within timeout
- **Overlay Generation Failure**: Fall back to original frame

## Testing Strategy

### Unit Tests
- Frame data retrieval and caching
- Playback speed calculations
- Frame index synchronization logic
- Mesh transposition equivalence

### Property-Based Tests
- Playback speed synchronization across N scenes (Property 1)
- Frame data consistency (Property 2)
- Overlay toggle idempotence (Property 3)
- Playback speed consistency (Property 4)
- Frame seek atomicity (Property 5)
- Video-mesh frame correspondence (Property 6)
- Redis cache hit rate (Property 7)
- Mesh transposition equivalence (Property 8)

### Integration Tests
- Multi-scene playback with Redis cache
- Frame preloading and cache eviction
- Overlay generation pipeline
- API response compression

