# Mesh Data Flow Verification

## Complete Data Flow (After Fix)

### 1. Pose Service → Backend
```
Pose Service Output:
{
  keypoints: [...],
  mesh_vertices_data: [[x, y, z], ...],  ← 6,890 vertices
  mesh_faces_data: [[i, j, k], ...],     ← 13,776 faces
  has3d: true,
  jointAngles3d: {...},
  cameraTranslation: [...]
}
```

### 2. Backend Frame Transformation
```typescript
// In /api/upload-video-with-pose and /api/finalize-upload
meshSequence.push({
  frameNumber: frame.frameNumber,
  timestamp: frame.timestamp,
  keypoints: frame.keypoints,
  skeleton: frame.skeleton || {},
  has3d: frame.has3d || false,
  jointAngles3d: frame.jointAngles3d || {},
  mesh_vertices_data: frame.mesh_vertices_data || [],  ← TOP LEVEL
  mesh_faces_data: frame.mesh_faces_data || [],        ← TOP LEVEL
  cameraTranslation: frame.cameraTranslation || null
})
```

### 3. Frame Quality Analyzer
```
Input: Raw frames with mesh_vertices_data and mesh_faces_data
Process:
  1. Analyze frame quality (confidence, off-screen, outliers)
  2. Remove low-quality frames
  3. Interpolate outliers
  4. Create frame index mapping
Output: Filtered frames with all properties intact
```

### 4. MongoDB Storage
```
mesh_frames collection:
{
  videoId: "v_...",
  frameNumber: 0,
  timestamp: 0.033,
  keypoints: [...],
  skeleton: {},
  has3d: true,
  jointAngles3d: {...},
  mesh_vertices_data: [[x, y, z], ...],  ← STORED AT TOP LEVEL
  mesh_faces_data: [[i, j, k], ...],     ← STORED AT TOP LEVEL
  cameraTranslation: [...],
  interpolated: false,
  createdAt: Date
}
```

### 5. Backend Retrieval & Transformation
```typescript
// In /api/mesh-data/:videoId
const dbFrame = await framesCollection.findOne({ videoId });

// Transform to SyncedFrame
return {
  frameIndex: dbFrame.frameNumber,
  timestamp: dbFrame.timestamp,
  meshData: {
    keypoints: transformedKeypoints,
    skeleton: dbFrame.skeleton || [],
    vertices: dbFrame.mesh_vertices_data || [],  ← MAPPED FROM TOP LEVEL
    faces: dbFrame.mesh_faces_data || []         ← MAPPED FROM TOP LEVEL
  }
}
```

### 6. Frontend Reception
```typescript
// In MeshViewer.tsx
const frame: SyncedFrame = {
  frameIndex: 0,
  timestamp: 0.033,
  meshData: {
    keypoints: [...],
    skeleton: [],
    vertices: [[x, y, z], ...],  ← 6,890 vertices
    faces: [[i, j, k], ...]      ← 13,776 faces
  }
}
```

### 7. Mesh Rendering
```typescript
// In createMeshFromFrame()
const vertices = frame.meshData.vertices;  // 6,890 vertices
const faces = frame.meshData.faces;        // 13,776 faces

// Create Three.js geometry
geometry.setAttribute('position', new THREE.BufferAttribute(flatVertices, 3));
geometry.setIndex(new THREE.BufferAttribute(flatFaces, 1));
geometry.computeVertexNormals();

// Render as human-like mesh
```

## Verification Checklist

### ✅ Backend Saves Correctly
- [ ] Frames have `mesh_vertices_data` at top level
- [ ] Frames have `mesh_faces_data` at top level
- [ ] Frame quality analyzer receives frames with mesh data
- [ ] Filtered frames stored in MongoDB with mesh data intact

### ✅ MongoDB Storage
- [ ] `db.mesh_frames.findOne({})` shows `mesh_vertices_data` array
- [ ] `db.mesh_frames.findOne({})` shows `mesh_faces_data` array
- [ ] Arrays are not empty (should have 6,890 and 13,776 items)

### ✅ Backend Retrieval
- [ ] `/api/mesh-data/:videoId` returns frames
- [ ] Each frame has `meshData.vertices` array
- [ ] Each frame has `meshData.faces` array
- [ ] Arrays are not empty

### ✅ Frontend Rendering
- [ ] Browser console shows purple logs
- [ ] Logs show `verticesCount: 6890`
- [ ] Logs show `facesCount: 13776`
- [ ] Mesh renders as human-like shape

## Testing Commands

### Check MongoDB Data
```bash
mongo -u admin -p password
db.mesh_frames.findOne({}, { mesh_vertices_data: 1, mesh_faces_data: 1 })
# Should show arrays with data, not empty
```

### Check Backend API
```bash
curl http://localhost:3001/api/mesh-data/v_1766829967266_2 | jq '.data.frames[0].meshData'
# Should show vertices and faces arrays with data
```

### Check Browser Console
```javascript
// In browser console (F12)
// Look for purple logs with mesh data info
// Should show verticesCount: 6890 and facesCount: 13776
```

## Success Indicators

✅ **Mesh Rendering Working** when:
1. Browser console shows 6,890 vertices and 13,776 faces
2. Mesh appears as human-like shape
3. Proper proportions visible (head, arms, legs, torso)
4. Smooth surface with proper lighting

✅ **Frame Quality Filtering Working** when:
1. MongoDB shows `qualityStats` in metadata
2. `removedCount` > 0 (some frames removed)
3. `interpolatedCount` > 0 (some frames interpolated)
4. `processedCount` < `originalCount` (filtering applied)

## Common Issues & Solutions

### Issue: Empty Vertices/Faces Arrays
**Cause**: Old data in MongoDB or frames not being saved correctly
**Solution**: 
1. Clear MongoDB: `db.mesh_frames.deleteMany({})`
2. Re-upload video
3. Check backend logs for errors

### Issue: Mesh Shows Random Points
**Cause**: Still using old data or pose service returning dummy data
**Solution**:
1. Verify pose service: `curl http://localhost:5000/health`
2. Check mesh data in MongoDB
3. Clear old data and re-upload

### Issue: Frame Quality Filtering Not Applied
**Cause**: Frames not passing through analyzer
**Solution**:
1. Check backend logs for filtering errors
2. Verify `FrameQualityAnalyzer` is being called
3. Check `frameQualityConfig.ts` settings
