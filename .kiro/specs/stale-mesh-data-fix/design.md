# Stale Mesh Data Fix - Design Document

## Overview

This design addresses the stale mesh data issue where uploading a second video displays the first video's mesh overlay. The solution implements a three-layer verification system that ensures old data is completely removed before new data is saved, and validates data integrity at every step.

## Architecture

### High-Level Flow

```
Upload Video 2
    ↓
Extract Frames & Mesh Data
    ↓
Connect to MongoDB
    ↓
DELETE old frames for videoId (Layer 1: Deletion Verification)
    ↓
VERIFY 0 frames remain
    ↓
INSERT new frames (Layer 2: Insertion Verification)
    ↓
VERIFY all frames inserted with correct videoId
    ↓
Return success to frontend
    ↓
Frontend fetches mesh data
    ↓
Backend RETRIEVES frames (Layer 3: Retrieval Verification)
    ↓
VERIFY all frames have correct videoId
    ↓
Return mesh data to frontend
    ↓
Frontend displays new video's mesh
```

## Components and Interfaces

### Backend Components

#### 1. MeshDataService (meshDataService.ts)
Handles all MongoDB operations for mesh data persistence and retrieval.

**Key Methods:**
- `connect()` - Establishes MongoDB connection with authentication
- `saveMeshData(meshData)` - Saves mesh data with three-layer verification
- `getMeshData(videoId)` - Retrieves mesh data with integrity verification
- `deleteMeshData(videoId)` - Deletes mesh data for a specific video

**Verification Layers:**
- Layer 1: Deletion verification before insertion
- Layer 2: Insertion verification after save
- Layer 3: Retrieval verification when fetching

#### 2. Upload Endpoint (/api/upload-video-with-pose)
Handles video upload, frame extraction, and mesh data persistence.

**Flow:**
1. Receive video file
2. Extract frames from video
3. Extract pose/mesh data for each frame
4. Call meshDataService.saveMeshData() with verification
5. Return videoId and frame count to frontend

### Frontend Components

#### 1. PoseOverlayViewer (PoseOverlayViewer.tsx)
Displays mesh overlay on video playback.

**Key Logic:**
- Fetch mesh data when video changes
- Update mesh display when videoId changes
- Ensure mesh corresponds to current video

#### 2. VideoUploadModal (VideoUploadModal.tsx)
Handles video upload and triggers mesh data refresh.

**Key Logic:**
- Upload video to backend
- Wait for upload completion
- Trigger mesh data refresh
- Update UI with new mesh

## Data Models

### MeshData Document (MongoDB)
```typescript
{
  _id: ObjectId,
  videoId: string,           // Unique video identifier
  videoUrl: string,          // URL to video file
  role: 'rider' | 'coach',   // Video role
  fps: number,               // Frames per second
  videoDuration: number,     // Duration in seconds
  frameCount: number,        // Total frames
  totalFrames: number,       // Total frames (duplicate for compatibility)
  frames: [],                // Empty array (frames stored separately)
  metadata: {
    uploadedAt: Date,
    processingTime: number,
    extractionMethod: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

### MeshFrame Document (MongoDB)
```typescript
{
  _id: ObjectId,
  videoId: string,           // Must match parent video
  frameNumber: number,       // Frame index
  timestamp: number,         // Frame timestamp
  keypoints: Array,          // 2D/3D keypoint data
  skeleton: Object,          // Skeleton structure
  has3d: boolean,            // Whether 3D data available
  jointAngles3d: Object,     // 3D joint angles
  mesh_vertices_data: Array, // Mesh vertices
  mesh_faces_data: Array,    // Mesh faces
  cameraTranslation: Array,  // Camera translation
  createdAt: Date
}
```

### Indexes
- `mesh_data`: Unique index on `videoId`
- `mesh_frames`: Unique index on `(videoId, frameNumber)`
- `mesh_frames`: Index on `videoId` for fast queries

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Old Data Deletion
**For any** video upload with a new videoId, all frames from the previous videoId must be deleted before new frames are inserted.

**Validates: Requirements 1.1, 1.2**

### Property 2: Deletion Verification
**For any** deletion operation, the system must verify that zero frames remain for the deleted videoId before proceeding with insertion.

**Validates: Requirements 1.2**

### Property 3: Insertion Verification
**For any** frame insertion, the system must verify that all inserted frames are present in the database with the correct videoId.

**Validates: Requirements 1.3, 1.4**

### Property 4: VideoId Integrity on Retrieval
**For any** mesh data retrieval request with videoId X, all returned frames must have videoId equal to X.

**Validates: Requirements 2.1, 2.2**

### Property 5: Keypoint Data Presence
**For any** frame retrieved from the database, the keypoints array must not be empty.

**Validates: Requirements 2.3**

### Property 6: Mesh Display Consistency
**For any** video switch operation, the displayed mesh must correspond to the newly selected videoId (not the previous videoId).

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 7: Frame Count Accuracy
**For any** mesh data save operation, the number of frames saved must equal the number of frames in the input data.

**Validates: Requirements 1.4, 4.4**

## Error Handling

### Deletion Verification Failure
- **Trigger**: Frames remain after deletion
- **Action**: Log error, throw exception, prevent upload
- **Message**: "Failed to delete old frames for {videoId}: {count} frames still exist"

### Insertion Verification Failure
- **Trigger**: Fewer frames saved than expected
- **Action**: Log warning, continue (data partially saved)
- **Message**: "Expected {expected} frames but found {actual}"

### VideoId Mismatch on Retrieval
- **Trigger**: Retrieved frames have wrong videoId
- **Action**: Log error, throw exception, return error to frontend
- **Message**: "Data integrity error: Retrieved frames with wrong videoId"

### Empty Keypoints
- **Trigger**: Frame has no keypoint data
- **Action**: Log warning, continue (frame may be valid)
- **Message**: "{count} frames have empty keypoints"

## Testing Strategy

### Unit Tests
- Test deletion logic removes all frames for a videoId
- Test insertion logic saves all frames with correct videoId
- Test retrieval logic returns only frames for requested videoId
- Test error handling for each verification layer

### Property-Based Tests
- **Property 1**: Generate random videoIds, verify old data deleted
- **Property 2**: Generate random frame counts, verify deletion count is zero
- **Property 3**: Generate random frames, verify all inserted with correct videoId
- **Property 4**: Generate random queries, verify all results have correct videoId
- **Property 5**: Generate random frames, verify keypoints not empty
- **Property 6**: Generate random video switches, verify mesh updates
- **Property 7**: Generate random frame counts, verify count accuracy

### Test Framework
- Use Jest for unit tests
- Use fast-check for property-based tests
- Minimum 100 iterations per property test
- Tag each test with property number and requirement reference

## Implementation Notes

### MongoDB Connection (Docker)
- **Backend**: Connects to MongoDB Docker container via `mongodb://admin:password@mongo:27017/meshes?authSource=admin`
- **MongoDB Compass**: Connect to `mongodb://admin:password@localhost:27017/meshes?authSource=admin` (Docker port mapping)
- Database: `meshes`
- Collections: `mesh_data`, `mesh_frames`
- Authentication: Enabled with admin user
- Docker Setup: MongoDB runs in container, exposed on localhost:27017

### Logging
- Use color-coded console logs for visibility
- Log at each verification layer
- Include videoId, frame count, and operation type
- Log errors with full context for debugging

### Performance Considerations
- Batch insert frames for efficiency
- Use indexes for fast queries
- Verify deletion before insertion (prevents duplicate data)
- Cache connection to avoid reconnection overhead

### Backward Compatibility
- Support both old and new frame formats
- Handle missing optional fields gracefully
- Maintain existing API contracts
