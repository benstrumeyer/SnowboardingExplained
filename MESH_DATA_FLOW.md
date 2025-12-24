# Mesh Data Flow - Complete Pipeline

## Overview
Mesh data flows through the system in this sequence:
1. **Video Upload** → 2. **Frame Extraction** → 3. **Pose Detection** → 4. **MongoDB Storage** → 5. **Frontend Retrieval**

---

## 1. Video Upload

**Endpoint:** `POST /api/upload-video-with-pose`
**File:** `SnowboardingExplained/backend/src/server.ts` (lines ~480-600)

### What Happens:
- User uploads a video file (MP4, MOV, WebM)
- Video is saved to disk: `SnowboardingExplained/backend/uploads/v_{timestamp}_{counter}.{ext}`
- A unique `videoId` is generated: `v_1766508440985_1`

```typescript
const videoId = generateVideoId(); // v_{timestamp}_{counter}
const newVideoPath = path.join(uploadDir, videoId + path.extname(req.file.originalname));
fs.renameSync(videoPath, newVideoPath);
```

---

## 2. Frame Extraction

**Service:** `FrameExtractionService.extractFrames()`
**File:** `SnowboardingExplained/backend/src/services/frameExtraction.ts`

### What Happens:
- Video is decoded frame-by-frame
- Each frame is saved as a JPEG image
- Frame metadata (timestamp, fps) is captured
- Returns: `{ frameCount, frames: [{imagePath, timestamp}], fps, videoDuration }`

```typescript
frameResult = await FrameExtractionService.extractFrames(newVideoPath, videoId);
// Result: 27 frames extracted at 30 fps
```

---

## 3. Pose Detection (Mesh Generation)

**Service:** `detectPoseHybrid()` from Python Pose Service
**File:** `SnowboardingExplained/backend/src/services/pythonPoseService.ts`

### What Happens:
- Each frame image is sent to Python pose service (running on `http://172.24.183.130:5000`)
- Python service runs 4D-Humans HMR2 model to extract:
  - **Keypoints**: 33 joint positions (pelvis, spine, shoulders, elbows, wrists, hips, knees, ankles, etc.)
  - **Mesh vertices**: 3D body mesh vertices
  - **Mesh faces**: Triangle faces connecting vertices
  - **Camera translation**: Camera position relative to body
  - **Joint angles**: 3D rotation angles for major joints

```typescript
const poseResult = await detectPoseHybrid(imageBase64, i);
// Returns: {
//   keypoints: [{name, x, y, z}, ...],
//   mesh_vertices_data: [[x,y,z], ...],
//   mesh_faces_data: [[v1,v2,v3], ...],
//   has3d: true,
//   jointAngles3d: {left_knee, right_knee, ...},
//   cameraTranslation: [x, y, z]
// }
```

### Mesh Data Structure:
```typescript
meshSequence.push({
  frameNumber: i,
  timestamp: frame.timestamp,
  keypoints: poseResult.keypoints,
  has3d: poseResult.has3d,
  jointAngles3d: poseResult.jointAngles3d,
  mesh_vertices_data: poseResult.mesh_vertices_data,
  mesh_faces_data: poseResult.mesh_faces_data,
  cameraTranslation: poseResult.cameraTranslation
});
```

---

## 4. MongoDB Storage

**Service:** `meshDataService.saveMeshData()`
**File:** `SnowboardingExplained/backend/src/services/meshDataService.ts`
**Database:** `snowboarding-explained`
**Collections:** `mesh_data` and `mesh_frames`

### Storage Strategy:
Data is split into two collections for efficiency:

#### Collection 1: `mesh_data` (Metadata)
Stores one document per video with metadata:
```json
{
  "_id": "ObjectId",
  "videoId": "v_1766508440985_1",
  "videoUrl": "http://localhost:3001/videos/v_1766508440985_1",
  "role": "rider",
  "fps": 30,
  "videoDuration": 2.76667,
  "frameCount": 27,
  "totalFrames": 27,
  "frames": [],  // Empty - frames stored separately
  "createdAt": "2025-12-23T16:48:53.677Z",
  "updatedAt": "2025-12-23T16:48:53.677Z"
}
```

#### Collection 2: `mesh_frames` (Frame Data)
Stores one document per frame:
```json
{
  "_id": "ObjectId",
  "videoId": "v_1766508440985_1",
  "frameNumber": 0,
  "timestamp": 0,
  "keypoints": [{name: "pelvis", x: 100, y: 200, z: 0}, ...],
  "skeleton": {
    "vertices": [[x1,y1,z1], [x2,y2,z2], ...],
    "faces": [[v1,v2,v3], ...],
    "has3d": true,
    "jointAngles3d": {left_knee: 45, ...},
    "cameraTranslation": [0, 0, 0]
  },
  "createdAt": "2025-12-23T16:48:53.677Z"
}
```

### Save Process:
```typescript
await meshDataService.saveMeshData({
  videoId,
  videoUrl,
  fps,
  videoDuration,
  frameCount,
  totalFrames,
  frames: meshData.frames,  // Array of frame data
  role: 'rider' | 'coach'
});
```

**What `saveMeshData()` does:**
1. Deletes old data for this videoId (ensures fresh data)
2. Saves metadata to `mesh_data` collection
3. Saves each frame to `mesh_frames` collection with indexed lookup

---

## 5. Frontend Retrieval

**Service:** `fetchReferenceMesh()` / `fetchRiderMesh()`
**File:** `SnowboardingExplained/backend/web/src/services/meshDataService.ts`

### Retrieval Process:
```typescript
// Frontend calls:
const meshData = await fetchReferenceMesh(videoId);

// Which calls backend endpoint:
GET /api/mesh-data/{videoId}

// Backend retrieves:
1. Metadata from mesh_data collection
2. All frames from mesh_frames collection (sorted by frameNumber)
3. Combines into MeshSequence structure
4. Returns to frontend
```

### Response Structure:
```typescript
{
  videoId: "v_1766508440985_1",
  videoUrl: "http://localhost:3001/videos/v_1766508440985_1",
  fps: 30,
  videoDuration: 2.76667,
  totalFrames: 27,
  frames: [
    {
      frameIndex: 0,
      timestamp: 0,
      meshData: {
        keypoints: [...],
        vertices: [...],
        faces: [...]
      }
    },
    // ... 26 more frames
  ],
  metadata: {...}
}
```

---

## Data Flow Diagram

```
Video Upload
    ↓
[FrameExtractionService]
    ↓
Frame Images (JPEG files on disk)
    ↓
[Python Pose Service - 4D-Humans HMR2]
    ↓
Pose Data (keypoints, mesh vertices, faces)
    ↓
[meshDataService.saveMeshData()]
    ↓
MongoDB Collections:
  ├─ mesh_data (metadata)
  └─ mesh_frames (frame data)
    ↓
[Frontend meshDataService.fetchReferenceMesh()]
    ↓
MeshSequence (unified structure)
    ↓
[PoseOverlayViewer]
    ↓
[MeshViewer - Three.js]
    ↓
3D Mesh Visualization
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/server.ts` | Upload endpoint, orchestrates pipeline |
| `backend/src/services/frameExtraction.ts` | Extracts frames from video |
| `backend/src/services/pythonPoseService.ts` | Calls Python pose detection service |
| `backend/src/services/meshDataService.ts` | MongoDB storage/retrieval |
| `backend/web/src/services/meshDataService.ts` | Frontend API client |
| `backend/web/src/components/PoseOverlayViewer.tsx` | Displays mesh data |
| `backend/web/src/components/MeshViewer.tsx` | Three.js 3D rendering |

---

## Current Status

✅ **Database is empty** - All collections cleared
✅ **Ready for fresh uploads** - Next upload will create new clean data
✅ **Mesh orientation fixed** - Uses first frame rotation for all frames
✅ **CORS fixed** - Backend allows cache headers
✅ **Database name fixed** - Extracts from connection string

Next upload will populate the database with fresh mesh data.
