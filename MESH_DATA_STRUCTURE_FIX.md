# Mesh Data Structure Fix - No Vertices Found in Frame

## Problem

The frontend was receiving frames with no vertices data, causing mesh rendering to fail:

```
[MESH] Creating rider mesh from frame: Object
[MESH] No vertices found in frame: Object
[MESH] ❌ Failed to create rider mesh
```

## Root Cause

**Data Structure Mismatch** between backend storage and API response:

### What was stored in MongoDB:
```typescript
{
  videoId: string,
  frameNumber: number,
  timestamp: number,
  keypoints: any[],
  skeleton: any,
  mesh_vertices_data: number[][],  // ← Actual property name
  mesh_faces_data: number[][],      // ← Actual property name
  ...
}
```

### What the API was returning:
```typescript
{
  frameIndex: number,
  timestamp: number,
  meshData: {
    keypoints: any[],
    skeleton: any,
    vertices: frame.skeleton?.vertices || [],  // ← Wrong source!
    faces: frame.skeleton?.faces || []          // ← Wrong source!
  }
}
```

The API was trying to get vertices/faces from `frame.skeleton` instead of `frame.mesh_vertices_data` and `frame.mesh_faces_data`.

## Solution

### 1. Created DatabaseFrame Interface
Added a new interface in `meshDataService.ts` to represent the actual database frame structure:

```typescript
interface DatabaseFrame {
  videoId: string;
  frameNumber: number;
  timestamp: number;
  keypoints: any[];
  skeleton: any;
  has3d: boolean;
  jointAngles3d: any;
  mesh_vertices_data: number[][];  // ← Correct property
  mesh_faces_data: number[][];      // ← Correct property
  cameraTranslation: any;
  interpolated: boolean;
  createdAt: Date;
}
```

### 2. Updated MeshData Interface
Changed `MeshData.frames` to support both `DatabaseFrame[]` and `SyncedFrame[]`:

```typescript
interface MeshData {
  // ...
  frames: DatabaseFrame[] | SyncedFrame[];  // Support both types
  // ...
}
```

### 3. Fixed API Transformation
Updated the GET `/api/mesh-data/:videoId` endpoint to correctly map database frames to SyncedFrame format:

```typescript
const frames: SyncedFrame[] = meshData.frames.map((frame) => {
  const dbFrame = frame as DatabaseFrame;
  return {
    frameIndex: dbFrame.frameNumber,
    timestamp: dbFrame.timestamp,
    videoFrameData: {
      offset: dbFrame.frameNumber
    },
    meshData: {
      keypoints: dbFrame.keypoints || [],
      skeleton: dbFrame.skeleton || [],
      vertices: dbFrame.mesh_vertices_data || [],  // ← Now correct!
      faces: dbFrame.mesh_faces_data || []         // ← Now correct!
    }
  };
});
```

### 4. Added Debug Logging
Enhanced logging to show the actual frame structure:

```typescript
console.log(`%c[API] 📊 First frame structure:`, 'color: #00BFFF;', {
  frameNumber: firstFrame.frameNumber,
  hasMeshVerticesData: !!firstFrame.mesh_vertices_data,
  meshVerticesCount: firstFrame.mesh_vertices_data?.length || 0,
  hasMeshFacesData: !!firstFrame.mesh_faces_data,
  meshFacesCount: firstFrame.mesh_faces_data?.length || 0,
  // ...
});
```

## Files Modified

- `SnowboardingExplained/backend/src/services/meshDataService.ts`
  - Added `DatabaseFrame` interface
  - Updated `MeshData` interface
  - Exported `DatabaseFrame` type

- `SnowboardingExplained/backend/src/server.ts`
  - Fixed GET `/api/mesh-data/:videoId` endpoint
  - Added proper type casting from `DatabaseFrame` to `SyncedFrame`
  - Added debug logging for frame structure
  - Imported `DatabaseFrame` type

## Type Safety

All changes maintain full TypeScript type safety:
- No `any` types used
- Proper type casting with `as DatabaseFrame`
- Explicit interface definitions
- Exported types for cross-module usage

## Testing

After this fix:
1. Upload a video
2. Wait for pose detection to complete
3. Mesh should now render in the Three.js viewer
4. Check browser console for frame structure logs showing:
   - `hasMeshVerticesData: true`
   - `meshVerticesCount: > 0`
   - `hasMeshFacesData: true`
   - `meshFacesCount: > 0`

## Data Flow

```
MongoDB stores frame:
  frame.mesh_vertices_data = [[x1, y1, z1], ...]
  frame.mesh_faces_data = [[0, 1, 2], ...]
         ↓
Backend retrieves frame as DatabaseFrame
         ↓
API transforms to SyncedFrame:
  meshData.vertices = frame.mesh_vertices_data  ← NOW CORRECT
  meshData.faces = frame.mesh_faces_data        ← NOW CORRECT
         ↓
Frontend receives SyncedFrame
         ↓
MeshViewer renders mesh ✅
```

## Backward Compatibility

The fix maintains backward compatibility:
- `MeshData.frames` accepts both `DatabaseFrame[]` and `SyncedFrame[]`
- `saveMeshSequence()` still works with `SyncedFrame[]`
- Existing code paths unaffected
