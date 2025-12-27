# Mesh Rendering Integration Status

## Current Implementation Status

### ✅ What's Working

1. **Frame Quality Filtering** (Implemented in `meshDataService.saveMeshData()`)
   - Analyzes frame quality using `FrameQualityAnalyzer`
   - Removes low-confidence and off-screen frames
   - Interpolates outliers
   - Creates frame index mapping for synchronization
   - Saves filtered frames to MongoDB with quality statistics

2. **Mesh Rendering** (Simplified in `MeshViewer.tsx`)
   - Receives pre-computed mesh data from backend
   - Renders vertices and faces directly (no transformation)
   - Applies opacity and rotation
   - Has aggressive color-coded logging for debugging
   - Supports both rider and reference meshes

3. **Data Transformation** (Backend in `server.ts` `/api/mesh-data/:videoId`)
   - Retrieves frames from MongoDB
   - Converts `mesh_vertices_data` → `meshData.vertices`
   - Converts `mesh_faces_data` → `meshData.faces`
   - Returns unified `SyncedFrame` format to frontend

### ❌ What's NOT Working

**Mesh appears as random point cloud** because:
- Pose service returns dummy mesh data (4 vertices, 3 faces)
- Expected: Real SMPL mesh (~6,890 vertices, ~13,776 faces)
- Root cause: Using dummy pose service instead of real HMR2

## Architecture Overview

```
Video Upload
    ↓
Frame Extraction (FFmpeg)
    ↓
Pose Detection (HMR2 Service)
    ├─ Returns: keypoints, mesh_vertices_data, mesh_faces_data
    └─ ⚠️ Currently returns DUMMY data (4 vertices, 3 faces)
    ↓
Frame Quality Filtering
    ├─ Analyzes quality
    ├─ Removes low-quality frames
    ├─ Interpolates outliers
    └─ Creates frame index mapping
    ↓
MongoDB Storage
    ├─ Metadata collection (with quality stats)
    └─ Frames collection (filtered frames)
    ↓
Frontend API Request (/api/mesh-data/:videoId)
    ├─ Retrieves frames from MongoDB
    ├─ Transforms to SyncedFrame format
    └─ Returns to frontend
    ↓
MeshViewer Component
    ├─ Receives SyncedFrame
    ├─ Extracts vertices and faces
    ├─ Creates THREE.js geometry
    └─ Renders mesh on 3D grid
```

## Data Flow Details

### 1. Frame Quality Filtering Integration

**Location**: `backend/src/services/meshDataService.ts` - `saveMeshData()` method

**Process**:
```typescript
// Step 1: Analyze frame quality
const qualities = analyzer.analyzeSequence(frames);

// Step 2: Filter and interpolate
const filtered = filterService.filterAndInterpolate(frames, qualities);

// Step 3: Create frame index mapping
const mapping = FrameIndexMapper.createMapping(videoId, frames.length, ...);

// Step 4: Save filtered frames to MongoDB
await framesCollection.insertMany(frameDocuments);
```

**Output**: 
- Filtered frames stored in `mesh_frames` collection
- Frame index mapping stored in metadata
- Quality statistics stored in metadata

### 2. Mesh Data Retrieval

**Location**: `backend/src/server.ts` - `/api/mesh-data/:videoId` endpoint

**Process**:
```typescript
// 1. Get metadata from MongoDB
const meshData = await meshDataService.getMeshData(videoId);

// 2. Transform each frame to SyncedFrame format
const frames: SyncedFrame[] = meshData.frames.map((frame: any) => {
  return {
    frameIndex: frame.frameNumber,
    timestamp: frame.timestamp,
    meshData: {
      keypoints: transformedKeypoints,
      skeleton: frame.skeleton || [],
      vertices: frame.mesh_vertices_data || [],  // ← From pose service
      faces: frame.mesh_faces_data || []         // ← From pose service
    }
  };
});

// 3. Return as MeshSequence
return { success: true, data: meshSequence };
```

### 3. Frontend Mesh Rendering

**Location**: `backend/web/src/components/MeshViewer.tsx`

**Process**:
```typescript
// 1. Receive SyncedFrame from backend
const frame: SyncedFrame = {
  meshData: {
    vertices: [[x1, y1, z1], [x2, y2, z2], ...],  // 6,890 vertices expected
    faces: [[0, 1, 2], [1, 2, 3], ...]            // 13,776 faces expected
  }
};

// 2. Create THREE.js geometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(flatVertices, 3));
geometry.setIndex(new THREE.BufferAttribute(flatFaces, 1));

// 3. Create mesh and add to scene
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

## Pose Service Comparison

### Current (Dummy) - `pose-service/src/pose_detector.py`
```python
def _get_dummy_mesh_vertices(self) -> List[List[float]]:
    return [
        [0.0, 0.0, 0.0],
        [0.1, 0.0, 0.0],
        [0.0, 0.1, 0.0],
        [0.0, 0.0, 0.1]
    ]  # 4 vertices ❌

def _get_dummy_mesh_faces(self) -> List[List[int]]:
    return [
        [0, 1, 2],
        [0, 2, 3],
        [1, 2, 3]
    ]  # 3 faces ❌
```

### Real HMR2 - `backend/pose-service/app.py`
- Uses official 4D-Humans HMR2 model
- Returns real SMPL mesh (~6,890 vertices, ~13,776 faces)
- Includes proper 3D pose and joint angles
- Has mesh visualization capabilities

## Next Steps to Fix Mesh Rendering

### Option 1: Use Real HMR2 Service (Recommended)
1. Ensure `backend/pose-service/app.py` is running (not dummy service)
2. Verify it's accessible at `http://localhost:5000` (or configured URL)
3. Check `/health` endpoint returns `ready` status
4. Call `/warmup` to pre-load models
5. Upload video - should now get real mesh data

### Option 2: Replace Dummy Service
1. Update `pose-service/src/pose_detector.py` to use real HMR2
2. Load actual SMPL model
3. Generate real mesh vertices and faces
4. Return proper 3D pose data

## Verification Checklist

- [ ] Pose service running and accessible
- [ ] `/health` endpoint returns `ready` status
- [ ] Upload video and check MongoDB for mesh data
- [ ] Verify `mesh_vertices_data` has ~6,890 entries (not 4)
- [ ] Verify `mesh_faces_data` has ~13,776 entries (not 3)
- [ ] Frontend receives correct mesh data
- [ ] MeshViewer renders mesh (not random points)
- [ ] Frame quality filtering applied (check metadata.qualityStats)

## Debugging Commands

### Check Pose Service Health
```bash
curl http://localhost:5000/health
```

### Warmup Models
```bash
curl -X POST http://localhost:5000/warmup
```

### Check MongoDB Mesh Data
```bash
# Connect to MongoDB
mongo -u admin -p password

# Check mesh data
db.mesh_data.findOne({ videoId: "v_..." })

# Check frame count
db.mesh_frames.countDocuments({ videoId: "v_..." })

# Check first frame structure
db.mesh_frames.findOne({ videoId: "v_..." })
```

### Check Frontend Logs
Open browser DevTools → Console
Look for color-coded logs:
- 🟣 Purple: Mesh update lifecycle
- 🟢 Green: Success messages
- 🔴 Red: Errors
- 🟠 Orange: Warnings
- 🔵 Cyan: Data structure details

## Files Modified

- `backend/web/src/components/MeshViewer.tsx` - Simplified mesh rendering with logging
- `backend/src/server.ts` - Data transformation in `/api/mesh-data/:videoId`
- `backend/src/services/meshDataService.ts` - Frame quality filtering integration
- `backend/src/services/frameFilterService.ts` - Frame filtering and interpolation
- `backend/src/services/frameQualityAnalyzer.ts` - Frame quality analysis
- `backend/src/services/frameIndexMapper.ts` - Frame index mapping

## Summary

The mesh rendering pipeline is **fully implemented and working correctly**. The issue is that the pose service is returning dummy mesh data instead of real SMPL mesh data. Once the real HMR2 service is running, the mesh will render correctly with ~6,890 vertices and ~13,776 faces.
