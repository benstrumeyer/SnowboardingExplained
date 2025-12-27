# Mesh Rendering Verification & Integration Guide

## Quick Status Check

The mesh rendering system is **fully implemented and integrated with frame quality filtering**. The issue preventing proper mesh display is that the pose service is returning dummy mesh data instead of real SMPL mesh data.

### Current State
- ✅ Frame quality filtering: **WORKING** (integrated in `meshDataService.saveMeshData()`)
- ✅ Mesh rendering: **WORKING** (simplified in `MeshViewer.tsx`)
- ✅ Data transformation: **WORKING** (backend `/api/mesh-data/:videoId`)
- ❌ Mesh appearance: **BROKEN** (dummy mesh data from pose service)

## Step 1: Verify Pose Service Status

### Check if Pose Service is Running

```bash
# Check health endpoint
curl http://localhost:5000/health

# Expected response (if real HMR2):
{
  "status": "ready",
  "service": "pose-detection-wsl",
  "models": {
    "hmr2": "loaded",
    "vitdet": "loaded"
  },
  "ready": true
}

# Expected response (if dummy service):
{
  "status": "ok",
  "service": "pose-detection"
}
```

### Warmup Models (if using real HMR2)

```bash
curl -X POST http://localhost:5000/warmup

# This loads HMR2 and ViTDet models into memory
# Takes ~30-60 seconds on first run
# Subsequent calls are instant (models cached)
```

## Step 2: Run Diagnostic Script

```bash
cd SnowboardingExplained
node diagnose-pose-service.js
```

This script will:
1. Check pose service connectivity
2. Verify model loading status
3. Test pose detection with sample image
4. Check mesh data quality (vertices/faces count)
5. Inspect MongoDB for existing mesh data
6. Provide recommendations

### Expected Output

**If using REAL HMR2:**
```
✅ Pose service is accessible
✅ Models are READY
✅ Pose detection works
✅ REAL MESH DATA DETECTED!
   Mesh vertices: 6890
   Mesh faces: 13776
```

**If using DUMMY service:**
```
✅ Pose service is accessible
⚠️  Models are NOT ready
✅ Pose detection works
❌ DUMMY MESH DATA DETECTED!
   Mesh vertices: 4
   Mesh faces: 3
```

## Step 3: Verify Frame Quality Filtering

### Check MongoDB for Quality Statistics

```bash
# Connect to MongoDB
mongo -u admin -p password

# Check metadata with quality stats
db.mesh_data.findOne({ videoId: "v_..." }, { metadata: 1 })

# Expected output:
{
  "metadata": {
    "qualityStats": {
      "originalCount": 300,
      "processedCount": 285,
      "removedCount": 15,
      "interpolatedCount": 8,
      "removalPercentage": "5.0%",
      "interpolationPercentage": "2.7%"
    }
  }
}
```

### Verify Frame Index Mapping

```bash
# Check if frame index mapping exists
db.mesh_data.findOne({ videoId: "v_..." }, { "metadata.frameIndexMapping": 1 })

# If mapping exists, frames were filtered and mapped
# If mapping is null/undefined, no filtering was applied
```

## Step 4: Check Frontend Mesh Data

### Browser Console Debugging

1. Open browser DevTools (F12)
2. Go to Console tab
3. Upload a video and watch for logs
4. Look for purple logs with mesh data:

```
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-UPDATE] Input state: {
  riderMeshExists: true,
  referenceMeshExists: false,
  showRider: true,
  showReference: false,
  riderMeshType: "SyncedFrame"
}
[MESH-CREATE] ✅ Detected SyncedFrame format
[MESH-CREATE] SyncedFrame meshData: {
  verticesCount: 6890,    // ← Should be ~6,890 for real mesh
  facesCount: 13776,      // ← Should be ~13,776 for real mesh
  verticesType: "object",
  facesType: "object"
}
```

### Check Network Request

1. Open DevTools → Network tab
2. Filter for `/api/mesh-data/`
3. Click the request
4. Go to Response tab
5. Look for mesh data structure:

```json
{
  "success": true,
  "data": {
    "frames": [
      {
        "frameIndex": 0,
        "meshData": {
          "vertices": [
            [x1, y1, z1],
            [x2, y2, z2],
            ...
          ],
          "faces": [
            [0, 1, 2],
            [1, 2, 3],
            ...
          ]
        }
      }
    ]
  }
}
```

## Step 5: Verify Mesh Rendering

### Visual Inspection

1. Upload a video
2. Wait for processing to complete
3. Go to the mesh viewer
4. Check if mesh appears:
   - ✅ **Real mesh**: Smooth human-like shape with proper proportions
   - ❌ **Dummy mesh**: Random 4 points scattered on grid

### Check Mesh Geometry

In browser console:

```javascript
// Get the mesh from the scene
const mesh = scene.children.find(child => child.name === 'mesh-rider');

// Check geometry
console.log('Vertices:', mesh.geometry.attributes.position.count);
console.log('Faces:', mesh.geometry.index.count / 3);

// Expected for real mesh:
// Vertices: 6890
// Faces: 13776

// Expected for dummy mesh:
// Vertices: 4
// Faces: 3
```

## Step 6: Fix Issues

### Issue: Dummy Mesh Data

**Symptom**: Mesh appears as 4 random points

**Solution**:
1. Stop the dummy pose service
2. Start the real HMR2 service:
   ```bash
   wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"
   ```
3. Verify it's running:
   ```bash
   curl http://localhost:5000/health
   ```
4. Warmup models:
   ```bash
   curl -X POST http://localhost:5000/warmup
   ```
5. Delete old mesh data from MongoDB:
   ```bash
   mongo -u admin -p password
   db.mesh_data.deleteMany({})
   db.mesh_frames.deleteMany({})
   ```
6. Upload a new video
7. Check mesh renders correctly

### Issue: Frame Quality Filtering Not Applied

**Symptom**: No `qualityStats` in metadata

**Solution**:
1. Check `frameQualityConfig.ts` is properly configured
2. Verify `FrameQualityAnalyzer` is being called in `saveMeshData()`
3. Check MongoDB logs for filtering errors
4. Re-upload video to trigger filtering

### Issue: Mesh Appears But Looks Wrong

**Symptom**: Mesh renders but proportions are off

**Solution**:
1. Check if frame quality filtering removed too many frames
2. Verify keypoint confidence thresholds in `frameQualityConfig.ts`
3. Check if interpolation is creating artifacts
4. Adjust `MAX_INTERPOLATION_GAP` if needed

## Integration Architecture

### Data Flow with Frame Quality Filtering

```
1. Video Upload
   ↓
2. Frame Extraction (FFmpeg)
   ├─ Extracts frames at specified FPS
   └─ Stores as PNG files
   ↓
3. Pose Detection (HMR2 Service)
   ├─ Detects keypoints for each frame
   ├─ Generates SMPL mesh (vertices + faces)
   └─ Returns: keypoints, mesh_vertices_data, mesh_faces_data
   ↓
4. Frame Quality Filtering (meshDataService.saveMeshData)
   ├─ Analyzes frame quality
   │  ├─ Checks keypoint confidence
   │  ├─ Detects off-screen poses
   │  └─ Identifies outliers
   ├─ Removes low-quality frames
   ├─ Interpolates outliers
   └─ Creates frame index mapping
   ↓
5. MongoDB Storage
   ├─ mesh_data collection (metadata + quality stats)
   └─ mesh_frames collection (filtered frames)
   ↓
6. Frontend API Request
   ├─ GET /api/mesh-data/:videoId
   ├─ Backend retrieves frames from MongoDB
   ├─ Transforms to SyncedFrame format
   └─ Returns to frontend
   ↓
7. MeshViewer Component
   ├─ Receives SyncedFrame
   ├─ Extracts vertices and faces
   ├─ Creates THREE.js BufferGeometry
   ├─ Applies material and lighting
   └─ Renders on 3D grid
```

### Frame Quality Filtering Details

**Location**: `backend/src/services/meshDataService.ts`

**Process**:
```typescript
// 1. Analyze quality
const analyzer = new FrameQualityAnalyzer(videoDimensions, config);
const qualities = analyzer.analyzeSequence(frames);

// 2. Filter and interpolate
const filterService = new FrameFilterService(config);
const filtered = filterService.filterAndInterpolate(frames, qualities);

// 3. Create mapping
const mapping = FrameIndexMapper.createMapping(
  videoId,
  frames.length,
  filtered.removedFrames,
  filtered.interpolatedFrames
);

// 4. Save filtered frames
await framesCollection.insertMany(frameDocuments);
```

**Configuration**: `backend/src/config/frameQualityConfig.ts`

```typescript
export default {
  MIN_CONFIDENCE: 0.5,              // Minimum keypoint confidence
  BOUNDARY_THRESHOLD: 0.1,          // How close to image edge is off-screen
  OFF_SCREEN_CONFIDENCE: 0.3,       // Confidence threshold for off-screen detection
  OUTLIER_DEVIATION_THRESHOLD: 2.0, // Standard deviations for outlier detection
  TREND_WINDOW_SIZE: 5,             // Window size for trend analysis
  MAX_INTERPOLATION_GAP: 10,        // Max frames to interpolate across
  DEBUG_MODE: false                 // Enable debug logging
};
```

## Monitoring & Debugging

### Enable Debug Logging

**Backend**:
```typescript
// In frameQualityConfig.ts
export default {
  DEBUG_MODE: true  // ← Set to true
};
```

**Frontend**:
- Logs are always enabled
- Look for color-coded console messages
- Purple = mesh updates
- Green = success
- Red = errors

### Check Processing Performance

```bash
# Monitor MongoDB operations
mongo -u admin -p password
db.setProfilingLevel(1)  # Enable profiling
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

### Verify Data Integrity

```bash
# Check frame count consistency
mongo -u admin -p password

# Get metadata
const meta = db.mesh_data.findOne({ videoId: "v_..." })
console.log("Metadata frameCount:", meta.frameCount)

# Count actual frames
const count = db.mesh_frames.countDocuments({ videoId: "v_..." })
console.log("Actual frames:", count)

# Should match (or be close if filtering applied)
```

## Troubleshooting Checklist

- [ ] Pose service is running and accessible
- [ ] `/health` endpoint returns `ready` status
- [ ] Models are loaded (check `/warmup` response)
- [ ] Test pose detection returns real mesh data (not 4 vertices)
- [ ] MongoDB has mesh data for uploaded video
- [ ] Mesh data has ~6,890 vertices and ~13,776 faces
- [ ] Frame quality filtering applied (check qualityStats)
- [ ] Frontend receives correct mesh data (check Network tab)
- [ ] Browser console shows purple mesh update logs
- [ ] Mesh renders on 3D grid (not random points)
- [ ] Mesh has proper human proportions

## Next Steps

1. **Verify pose service**: Run `node diagnose-pose-service.js`
2. **Check mesh data**: Inspect MongoDB for vertex/face counts
3. **Test rendering**: Upload video and check browser console
4. **Debug if needed**: Enable debug logging and check logs
5. **Optimize if needed**: Adjust frame quality thresholds

## Support

If mesh still doesn't render correctly:

1. Check browser console for error messages (red logs)
2. Check backend logs for pose detection errors
3. Verify MongoDB has correct mesh data
4. Check pose service is returning real mesh (not dummy)
5. Ensure frame quality filtering isn't removing all frames

The system is designed to work end-to-end. If any step fails, the logs will indicate where the issue is.
