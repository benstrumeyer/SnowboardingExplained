# Mesh Data Storage Fix

## Problem
Mesh data was being stored incorrectly in MongoDB. The frames were being transformed with mesh vertices and faces nested under a `skeleton` property instead of being stored at the top level where the frame quality analyzer expects them.

### Before (Incorrect)
```typescript
frames: meshSequence.map(frame => ({
  frameNumber: frame.frameNumber,
  timestamp: frame.timestamp,
  keypoints: frame.keypoints,
  skeleton: {
    vertices: frame.mesh_vertices_data || [],
    faces: frame.mesh_faces_data || [],
    has3d: frame.has3d,
    jointAngles3d: frame.jointAngles3d,
    cameraTranslation: frame.cameraTranslation
  }
}))
```

This caused:
- ❌ `mesh_vertices_data` and `mesh_faces_data` were nested under `skeleton`
- ❌ Frame quality analyzer couldn't find the mesh data
- ❌ Frames stored in MongoDB had empty vertices and faces arrays
- ❌ Frontend received empty mesh data

## Solution
Store frames exactly as they come from the pose service, with all properties at the top level:

### After (Correct)
```typescript
frames: meshSequence.map(frame => ({
  frameNumber: frame.frameNumber,
  timestamp: frame.timestamp,
  keypoints: frame.keypoints,
  skeleton: frame.skeleton || {},
  has3d: frame.has3d || false,
  jointAngles3d: frame.jointAngles3d || {},
  mesh_vertices_data: frame.mesh_vertices_data || [],
  mesh_faces_data: frame.mesh_faces_data || [],
  cameraTranslation: frame.cameraTranslation || null
}))
```

This ensures:
- ✅ `mesh_vertices_data` and `mesh_faces_data` are at the top level
- ✅ Frame quality analyzer can access and filter the mesh data
- ✅ Frames pass through the 2-pass transformation pipeline
- ✅ Filtered frames are stored in MongoDB with all properties intact
- ✅ Frontend receives correct mesh data with ~6,890 vertices and ~13,776 faces

## Files Modified
- `SnowboardingExplained/backend/src/server.ts`
  - Fixed `/api/finalize-upload` endpoint (line ~575)
  - Fixed `/api/upload-video-with-pose` endpoint (line ~820)

## Data Flow
1. **Pose Service** → Returns frames with `mesh_vertices_data`, `mesh_faces_data`, keypoints, etc.
2. **Frame Transformation** → Frames stored with all properties at top level
3. **Frame Quality Analyzer** → Analyzes, filters, and interpolates frames
4. **MongoDB Storage** → Filtered frames saved with mesh data intact
5. **Frontend Retrieval** → API transforms to SyncedFrame format with `meshData.vertices` and `meshData.faces`
6. **Mesh Rendering** → MeshViewer receives correct mesh data and renders

## Verification
After this fix, when you upload a video:
1. Frames will be processed through the quality analyzer
2. Low-quality frames will be removed
3. Outliers will be interpolated
4. Remaining frames will be stored with mesh data intact
5. Frontend will receive frames with ~6,890 vertices and ~13,776 faces
6. Mesh will render as a human-like shape on the 3D grid

## Next Steps
1. Clear old mesh data from MongoDB (optional, but recommended)
2. Re-upload a test video
3. Check browser console for mesh rendering logs
4. Verify mesh appears as human-like shape with proper proportions
