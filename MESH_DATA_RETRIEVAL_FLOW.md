# Mesh Data Retrieval Flow - Complete Trace

## Overview
This document traces where mesh data comes from and how it flows through the system.

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                   │
│  1. User uploads video via VideoUploadModal                      │
│     └─> POST /api/upload-video-with-pose                        │
│                                                                   │
│  2. Frontend calls fetchRiderMesh() or fetchReferenceMesh()      │
│     └─> GET /api/mesh-data/{videoId}                            │
│                                                                   │
│  3. PoseOverlayViewer receives MeshSequence                      │
│     └─> Renders mesh in MeshViewer component                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express/Node.js)                     │
│                                                                   │
│  UPLOAD PHASE:                                                   │
│  ─────────────                                                   │
│  POST /api/upload-video-with-pose                               │
│    1. Extract frames from video                                 │
│    2. Run pose detection on each frame (Python service)         │
│    3. Connect to MongoDB                                        │
│    4. Save mesh data to MongoDB                                 │
│       └─> mesh_data collection (metadata)                       │
│       └─> mesh_frames collection (frame data)                   │
│                                                                   │
│  RETRIEVAL PHASE:                                                │
│  ────────────────                                                │
│  GET /api/mesh-data/{videoId}                                   │
│    1. Connect to MongoDB                                        │
│    2. Call meshDataService.getMeshData(videoId)                 │
│       └─> Query mesh_data collection for metadata               │
│       └─> Query mesh_frames collection for all frames           │
│    3. Transform data to MeshSequence format                      │
│    4. Return to frontend                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MONGODB DATABASE                            │
│                                                                   │
│  Database: snowboarding-explained                               │
│                                                                   │
│  Collections:                                                    │
│  ────────────                                                    │
│  1. mesh_data                                                    │
│     └─ Stores metadata for each video                           │
│     └─ Fields: videoId, videoUrl, fps, videoDuration,          │
│               frameCount, totalFrames, role, createdAt, etc.    │
│     └─ Index: unique on videoId                                 │
│                                                                   │
│  2. mesh_frames                                                  │
│     └─ Stores individual frame data                             │
│     └─ Fields: videoId, frameNumber, timestamp, keypoints,      │
│               skeleton, has3d, jointAngles3d, etc.              │
│     └─ Index: unique on (videoId, frameNumber)                  │
│     └─ Index: on videoId for fast lookups                       │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Steps

### 1. UPLOAD PHASE - Where Mesh Data Originates

**File: `SnowboardingExplained/backend/src/server.ts` (line ~478)**

```typescript
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  // Step 1: Extract frames from video
  const frameResult = await FrameExtractionService.extractFrames(newVideoPath, videoId);
  
  // Step 2: Run pose detection on each frame
  for (let i = 0; i < frameResult.frameCount; i++) {
    const imageBase64 = FrameExtractionService.getFrameAsBase64(frame.imagePath);
    const poseResult = await detectPoseHybrid(imageBase64, i);  // Python service
    
    meshSequence.push({
      frameNumber: i,
      timestamp: frame.timestamp,
      keypoints: poseResult.keypoints,
      mesh_vertices_data: poseResult.mesh_vertices_data,
      mesh_faces_data: poseResult.mesh_faces_data,
      // ... other pose data
    });
  }
  
  // Step 3: Connect to MongoDB
  await meshDataService.connect();
  
  // Step 4: Save to MongoDB
  await meshDataService.saveMeshData({
    videoId,
    videoUrl: `${req.protocol}://${req.get('host')}/videos/${videoId}`,
    fps: meshData.fps,
    videoDuration: meshData.videoDuration,
    frameCount: meshData.frameCount,
    totalFrames: meshData.frameCount,
    frames: meshData.frames,
    role: role as 'rider' | 'coach'
  });
});
```

### 2. STORAGE PHASE - Where Data is Saved

**File: `SnowboardingExplained/backend/src/services/meshDataService.ts` (line ~117)**

```typescript
async saveMeshData(meshData: Omit<MeshData, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  // Save metadata to mesh_data collection
  const metadataDoc: MeshData = {
    ...meshData,
    frames: [], // Don't store frames in metadata
    frameCount: frames.length,
    totalFrames: frames.length,
    createdAt: now,
    updatedAt: now
  };
  
  await this.collection.updateOne(
    { videoId: meshData.videoId },
    { $set: metadataDoc },
    { upsert: true }
  );
  
  // Save frames to mesh_frames collection
  if (frames.length > 0) {
    const frameDocuments = frames.map((frame: any, index: number) => ({
      videoId: meshData.videoId,
      frameNumber: frame.frameNumber ?? index,
      timestamp: frame.timestamp ?? 0,
      keypoints: frame.keypoints || [],
      skeleton: frame.skeleton || {},
      // ... other frame data
    }));
    
    await this.framesCollection.insertMany(frameDocuments, { ordered: false });
  }
}
```

### 3. RETRIEVAL PHASE - Where Data is Retrieved

**File: `SnowboardingExplained/backend/src/server.ts` (line ~756)**

```typescript
app.get('/api/mesh-data/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  
  // Connect to MongoDB
  await meshDataService.connect();
  
  // Get mesh data from MongoDB
  const meshData = await meshDataService.getMeshData(videoId);
  
  // Transform to MeshSequence format
  const meshSequence = {
    videoId: meshData.videoId,
    videoUrl: meshData.videoUrl,
    fps: meshData.fps,
    videoDuration: meshData.videoDuration,
    totalFrames: meshData.totalFrames || meshData.frameCount,
    frames: (meshData.frames || []).map((frame: any, idx: number) => ({
      frameIndex: frame.frameNumber || 0,
      timestamp: frame.timestamp || 0,
      meshData: {
        keypoints: frame.keypoints || [],
        skeleton: frame.skeleton || [],
        vertices: frame.skeleton?.vertices || [],
        faces: frame.skeleton?.faces || []
      }
    })),
    metadata: {
      uploadedAt: meshData.createdAt || new Date(),
      processingTime: 0,
      extractionMethod: 'mediapipe'
    }
  };
  
  res.json({ success: true, data: meshSequence });
});
```

**File: `SnowboardingExplained/backend/src/services/meshDataService.ts` (line ~260)**

```typescript
async getMeshData(videoId: string): Promise<MeshData | null> {
  // Query metadata from mesh_data collection
  const data = await this.collection.findOne({ videoId });
  
  if (!data) return null;
  
  // Query frames from mesh_frames collection
  const frames = await this.framesCollection
    .find({ videoId })
    .sort({ frameNumber: 1 })
    .toArray();
  
  data.frames = frames;
  return data;
}
```

### 4. FRONTEND PHASE - Where Data is Used

**File: `SnowboardingExplained/backend/web/src/services/meshDataService.ts`**

```typescript
async function fetchMeshDataWithPolling(videoId: string): Promise<MeshSequence> {
  // Poll the backend until mesh data is ready
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const url = `/api/mesh-data/${videoId}?t=${Date.now()}&r=${requestId}`;
      const response = await client.get<any>(url);
      
      const meshData = response.data.data || response.data;
      
      // Validate and return
      if (!meshData.frames || !Array.isArray(meshData.frames)) {
        throw new Error('Invalid mesh data structure: missing frames array');
      }
      
      return meshData as MeshSequence;
    } catch (err) {
      // Retry on error
    }
  }
}
```

**File: `SnowboardingExplained/backend/web/src/components/PoseOverlayViewer.tsx`**

```typescript
// Load rider mesh into left screen
useEffect(() => {
  if (!riderVideoId) return;
  
  fetchRiderMesh(riderVideoId)
    .then((mesh) => {
      setLeftScreen(prev => ({ ...prev, mesh }));
      
      // Capture first frame rotation for consistent orientation
      const firstFrame = mesh.frames[0];
      if (firstFrame) {
        const firstRotation = calculateOrientationFromKeypoints(firstFrame);
        setFirstFrameRiderRotation(firstRotation);
      }
    });
}, [riderVideoId]);
```

## Data Structure

### MeshSequence (Frontend Format)
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

### SyncedFrame
```typescript
{
  frameIndex: number;
  timestamp: number;
  videoFrameData: {
    offset: number;
  };
  meshData: {
    keypoints: Array<{name: string; x: number; y: number; z?: number}>;
    skeleton: any;
    vertices: number[][];
    faces: number[][];
  };
}
```

## Key Points

1. **Source**: Mesh data originates from the Python pose detection service (4D-Humans/HMR2)
2. **Storage**: Data is persisted in MongoDB in two collections:
   - `mesh_data`: Metadata about the video
   - `mesh_frames`: Individual frame data with keypoints and mesh
3. **Retrieval**: Backend queries MongoDB and transforms data to MeshSequence format
4. **Frontend**: React components fetch via `/api/mesh-data/{videoId}` and render using Three.js
5. **Caching**: Frontend uses in-memory cache to avoid re-fetching the same video

## Critical Fix Applied
The upload endpoint was missing `await meshDataService.connect()` before calling `saveMeshData()`, which prevented data from being saved to MongoDB. This has been fixed.
