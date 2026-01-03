# Design: Frontend-Backend Integration

## Overview

Create a unified mesh data endpoint (`/api/mesh-data/{videoId}`) that adapts MongoDB-stored frame data into the frontend's expected `MeshSequence` format. This endpoint bridges the gap between the backend's direct video processing pipeline and the frontend's comprehensive viewer.

## Architecture

```
Frontend Request
  ↓
GET /api/mesh-data/{videoId}
  ↓
Check video metadata in MongoDB (videos collection)
  ↓
Retrieve all frames from MongoDB (frames collection)
  ↓
Transform PersonData → Keypoint objects
  ↓
Build SyncedFrame objects with mesh data
  ↓
Construct MeshSequence response
  ↓
Return to frontend
```

## Components and Interfaces

### 1. Mesh Data Adapter Service

**Purpose:** Transform MongoDB data into MeshSequence format

**Key Functions:**
- `getMeshSequence(videoId)` - Fetch and transform all frames
- `transformPersonDataToKeypoints(personData)` - Convert person data to keypoints
- `buildSyncedFrame(frame, videoMetadata)` - Create SyncedFrame from MongoDB frame
- `calculateTimestamp(frameNumber, fps)` - Calculate frame timestamp

### 2. Mesh Data Endpoint

**Route:** `GET /api/mesh-data/{videoId}`

**Response Structure:**
```typescript
{
  videoId: string;
  videoUrl: string;
  fps: number;
  videoDuration: number;
  totalFrames: number;
  frames: SyncedFrame[];
  metadata: {
    uploadedAt: Date;
    processingTime: number;
    extractionMethod: string;
  };
}
```

**Status Codes:**
- 200: Mesh data ready
- 202: Still processing (polling)
- 404: Video not found or no frames
- 500: Server error

### 3. Video Streaming Endpoints

**Routes:**
- `GET /api/mesh-data/{videoId}/video/original` - Stream original video
- `GET /api/mesh-data/{videoId}/video/overlay` - Stream PHALP overlay video

**Features:**
- HTTP range request support for seeking
- Proper Content-Type headers
- Streaming for large files

## Data Models

### MongoDB Frame Structure (Input)
```typescript
{
  videoId: string;
  frameNumber: number;
  timestamp: number;
  persons: PersonData[];
  createdAt: Date;
}

PersonData {
  personId: number;
  confidence: number;
  tracked: boolean;
  meshVertices?: number[][];
  meshVertexCount?: number;
  meshFaces?: number[][];
  meshFaceCount?: number;
  camera?: {
    tx: number;
    ty: number;
    tz: number;
    focalLength: number;
  };
}
```

### Frontend MeshSequence Structure (Output)
```typescript
{
  videoId: string;
  videoUrl: string;
  fps: number;
  videoDuration: number;
  totalFrames: number;
  frames: SyncedFrame[];
  metadata: {
    uploadedAt: Date;
    processingTime: number;
    extractionMethod: string;
  };
}

SyncedFrame {
  frameIndex: number;
  timestamp: number;
  meshData: {
    keypoints: Keypoint[];
    vertices: [number, number, number][];
    faces: number[][];
    cameraParams?: CameraParams;
  };
}

Keypoint {
  index: number;
  name: string;
  position: [number, number, number];
  confidence: number;
}

CameraParams {
  scale: number;
  tx: number;
  ty: number;
  type: string;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Ordering Invariant

*For any* MeshSequence returned from `/api/mesh-data/{videoId}`, all frames should be ordered sequentially by frameNumber with no gaps or duplicates.

**Validates: Requirements 1.6**

### Property 2: Frame Count Consistency

*For any* MeshSequence returned from `/api/mesh-data/{videoId}`, the length of the frames array should equal the totalFrames field.

**Validates: Requirements 1.1, 1.5**

### Property 3: Timestamp Monotonicity

*For any* MeshSequence returned from `/api/mesh-data/{videoId}`, timestamps should be monotonically increasing and evenly spaced based on fps.

**Validates: Requirements 1.5**

### Property 4: Mesh Data Completeness

*For any* SyncedFrame in a MeshSequence, if meshData exists, it should contain vertices, faces, and cameraParams.

**Validates: Requirements 1.5, 3.2, 3.3, 3.4**

### Property 5: Video Metadata Presence

*For any* MeshSequence returned from `/api/mesh-data/{videoId}`, all required metadata fields (videoId, videoUrl, fps, videoDuration, totalFrames) should be present and non-null.

**Validates: Requirements 1.1, 1.4**

### Property 6: Video Streaming Round-Trip

*For any* video file stored at originalVideoPath or overlayVideoPath, streaming from `/api/mesh-data/{videoId}/video/original` or `/api/mesh-data/{videoId}/video/overlay` should return the same file content.

**Validates: Requirements 2.1, 2.2**

## Error Handling

- **MongoDB Connection Failure**: Log error, return 500 with "Database connection failed"
- **Video Not Found**: Return 404 with "Video not found"
- **No Frames**: Return 404 with "No frames found for video"
- **Missing Metadata**: Return 404 with "Video metadata not found"
- **Data Transformation Error**: Log error, return 500 with "Failed to transform frame data"
- **File Not Found**: Return 404 with "Video file not found"

## Testing Strategy

### Unit Tests
- Test frame transformation (PersonData → Keypoint)
- Test timestamp calculation
- Test SyncedFrame construction
- Test MeshSequence assembly
- Test error cases (missing data, invalid videoId)

### Property-Based Tests
- Property 1: Frame ordering (generate random frame sequences, verify ordering)
- Property 2: Frame count consistency (verify array length matches totalFrames)
- Property 3: Timestamp monotonicity (verify timestamps increase evenly)
- Property 4: Mesh data completeness (verify all required fields present)
- Property 5: Video metadata presence (verify all metadata fields non-null)
- Property 6: Video streaming round-trip (stream file, verify content matches)

### Integration Tests
- Test full flow: upload video → process → retrieve mesh data
- Test video streaming with range requests
- Test error responses (404, 500)
- Test concurrent requests

