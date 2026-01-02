# Direct Video Processing Design (Option 3)

## Overview

This design implements video-level PHALP processing by spawning `track.py` directly from the Node.js backend using subprocess. No Flask wrapper needed. Simple, fast, perfect for MVP.

**Key Insight:** Node.js handles everything - video saving, subprocess spawning, pickle parsing, and MongoDB storage. All in one place.

## Architecture

### High-Level Flow

```
User uploads video
    ↓
Backend: /api/finalize-upload
    ├─ Assemble chunks into video file
    ├─ Save to disk: /tmp/videos/{videoId}.mp4
    └─ Spawn subprocess
    ↓
Subprocess: python track.py video.source=/tmp/videos/{videoId}.mp4
    ├─ Loads models (2-3s)
    ├─ Processes video (60-120s)
    └─ Outputs results.pkl
    ↓
Backend: Parse .pkl output
    ├─ Load pickle file
    ├─ Extract frames to JSON
    ├─ Compute mesh vertices
    └─ Convert numpy arrays to lists
    ↓
Backend: Store in MongoDB
    ├─ Create frames collection
    ├─ For each frame:
    │  ├─ Create document with video_id, frame_number
    │  ├─ Store vertices, faces, camera params
    │  └─ Insert into MongoDB
    └─ Create indexes
    ↓
Frontend: Query and render
    ├─ GET /api/frames?video_id={videoId}
    ├─ Load frames from MongoDB
    ├─ Create Three.js BufferGeometry
    └─ Render 3D mesh
```

### Components

#### 1. Video Processing Service (Node.js)

**File:** `backend/src/services/videoProcessingService.ts`

**Responsibilities:**
- Spawn `track.py` subprocess
- Monitor subprocess completion
- Capture stdout/stderr
- Handle timeouts and errors
- Return exit code and output

**Interface:**
```typescript
interface VideoProcessingResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  pklPath?: string;
  error?: string;
}

async function processVideoWithTrackPy(
  videoPath: string,
  timeout: number = 180000
): Promise<VideoProcessingResult>
```

#### 2. Pickle Parser Service (Node.js)

**File:** `backend/src/services/pickleParserService.ts`

**Responsibilities:**
- Load `.pkl` file using Python subprocess
- Parse pickle data to JSON
- Extract frame data
- Compute mesh vertices from SMPL params
- Convert numpy arrays to lists

**Interface:**
```typescript
interface FrameData {
  frameNumber: number;
  timestamp: number;
  persons: PersonData[];
}

interface PersonData {
  trackId: number;
  confidence: number;
  trackingConfidence: number;
  smpl: {
    betas: number[];
    bodyPose: number[][];
    globalOrient: number[][];
  };
  keypoints3d: number[][];
  keypoints2d: number[][];
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focalLength: number;
  };
  bbox: [number, number, number, number];
  meshVertices: number[][];
  meshFaces: number[][];
}

async function parsePickleToFrames(
  pklPath: string
): Promise<FrameData[]>
```

#### 3. MongoDB Frame Storage Service (Node.js)

**File:** `backend/src/services/frameStorageService.ts`

**Responsibilities:**
- Create frames collection
- Store frames as separate documents
- Create indexes
- Query frames by video_id and frame_number

**Interface:**
```typescript
interface FrameDocument {
  _id: ObjectId;
  videoId: string;
  frameNumber: number;
  timestamp: number;
  persons: PersonData[];
  createdAt: Date;
  updatedAt: Date;
}

async function storeFrames(
  videoId: string,
  frames: FrameData[]
): Promise<void>

async function getFrame(
  videoId: string,
  frameNumber: number
): Promise<FrameDocument | null>

async function getAllFrames(
  videoId: string
): Promise<FrameDocument[]>
```

#### 4. Backend Integration (Node.js)

**File:** `backend/src/server.ts` - `/api/finalize-upload` endpoint

**Flow:**
```typescript
app.post('/api/finalize-upload', async (req, res) => {
  // 1. Assemble chunks into video file
  const videoPath = await assembleChunks(sessionId, filesize);
  
  // 2. Spawn track.py subprocess
  const result = await processVideoWithTrackPy(videoPath);
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  // 3. Parse .pkl output
  const frames = await parsePickleToFrames(result.pklPath);
  
  // 4. Store in MongoDB
  const videoId = generateVideoId();
  await storeFrames(videoId, frames);
  
  // 5. Return success
  res.json({
    success: true,
    videoId,
    frameCount: frames.length,
    message: 'Video processed successfully'
  });
});
```

## Data Models

### MongoDB Frame Document

```javascript
{
  _id: ObjectId,
  videoId: "v_1704067200000_1",
  frameNumber: 0,
  timestamp: 0.0,
  persons: [
    {
      trackId: 0,
      confidence: 1.0,
      trackingConfidence: 1.0,
      smpl: {
        betas: [0.1, 0.2, ...],           // 10 values
        bodyPose: [[0, 0, 0], ...],       // 23 joints × 3 values
        globalOrient: [[0, 0, 0]]         // 1 joint × 3 values
      },
      keypoints3d: [[x, y, z], ...],      // 45 joints
      keypoints2d: [[x, y], ...],         // 45 joints
      camera: {
        tx: 0.0,
        ty: 0.0,
        tz: 5.0,
        focalLength: 5000.0
      },
      bbox: [x0, y0, w, h],
      meshVertices: [[x, y, z], ...],     // 6890 vertices
      meshFaces: [[v1, v2, v3], ...]      // 13776 faces
    }
  ],
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
}
```

### MongoDB Indexes

```javascript
// Primary query: get single frame
db.frames.createIndex({ videoId: 1, frameNumber: 1 })

// List all frames for video
db.frames.createIndex({ videoId: 1 })

// TTL: auto-delete after 30 days
db.frames.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
)
```

### Size Breakdown

| Component | Size |
|-----------|------|
| SMPL params | 500 B |
| Keypoints (45×3D + 45×2D) | 1.5 KB |
| Mesh vertices (6890×3) | 165 KB |
| Mesh faces (13776×3) | 165 KB |
| Camera + bbox + metadata | 200 B |
| **Per-frame total** | **~332 KB** |
| **140-frame video** | **~46.5 MB** |
| **Per-document (MongoDB)** | **~332 KB** ✓ |

## Error Handling

### Subprocess Errors

| Error | Cause | Response |
|-------|-------|----------|
| Video not found | Invalid path | 400 Bad Request |
| Subprocess timeout | GPU too slow | 500 + "Processing timeout" |
| Subprocess crash | track.py error | 500 + stderr output |
| Exit code non-zero | track.py failed | 500 + stderr output |

### Parsing Errors

| Error | Cause | Response |
|-------|-------|----------|
| .pkl not found | track.py didn't output | 500 + "Pickle file not found" |
| .pkl parse error | Corrupted pickle | 500 + "Failed to parse pickle" |
| Invalid frame data | Missing fields | 500 + "Invalid frame structure" |

### Storage Errors

| Error | Cause | Response |
|-------|-------|----------|
| MongoDB connection | DB unavailable | 500 + "Database connection failed" |
| Insert failed | Duplicate key | 500 + "Frame storage failed" |
| Index creation | Permission denied | 500 + "Index creation failed" |

## Testing Strategy

### Unit Tests

1. **Subprocess spawning**
   - Test subprocess starts correctly
   - Test subprocess timeout handling
   - Test subprocess crash handling
   - Test exit code checking

2. **Pickle parsing**
   - Test .pkl loading
   - Test frame extraction
   - Test SMPL parameter parsing
   - Test keypoint extraction
   - Test mesh vertex computation
   - Test numpy array conversion

3. **MongoDB storage**
   - Test frame document creation
   - Test index creation
   - Test query by video_id + frame_number
   - Test query all frames for video

4. **Error handling**
   - Test invalid video path
   - Test missing .pkl file
   - Test corrupted pickle
   - Test subprocess timeout
   - Test MongoDB connection failure

### Property-Based Tests

**Property 1: Frame coverage**
- For any video with N frames, output SHALL contain exactly N frames
- **Validates: Requirement 3.1**

**Property 2: Track ID consistency**
- For any person track, track_id SHALL be consistent across all frames they appear in
- **Validates: Requirement 6.3**

**Property 3: Mesh vertex count**
- For any frame with persons, each person SHALL have exactly 6890 mesh vertices
- **Validates: Requirement 3.3**

**Property 4: Mesh face count**
- For any frame with persons, each person SHALL have exactly 13776 mesh faces
- **Validates: Requirement 3.3**

**Property 5: Keypoint count**
- For any frame with persons, each person SHALL have exactly 45 3D keypoints and 45 2D keypoints
- **Validates: Requirement 3.3**

**Property 6: Temporal smoothness**
- For any two consecutive frames with same person, pose change SHALL be smooth (no sudden jumps)
- **Validates: Requirement 6.1**

## Performance Considerations

### Bottlenecks

1. **GPU processing** (60-120s) - Dominant bottleneck
   - Cannot parallelize (single GPU)
   - Mitigation: Process one video at a time (MVP)

2. **Subprocess startup** (2-3s)
   - Python interpreter startup
   - Model loading
   - Mitigation: Pre-warm models on backend startup

3. **Pickle parsing** (1-2s)
   - Loading large pickle file
   - Iterating through frames
   - Mitigation: Optimize with streaming if needed

4. **MongoDB storage** (1-2s)
   - Batch insert frames
   - Index creation
   - Mitigation: Use bulk operations

### Optimization Opportunities

1. **Async subprocess** - Use `child_process.spawn()` with async/await
2. **Streaming parsing** - Parse pickle incrementally (not all at once)
3. **Batch MongoDB inserts** - Use `insertMany()` for all frames
4. **Caching** - Cache results by video hash (if same video uploaded twice)
5. **Pre-warming** - Load models on backend startup (not per-request)

## Deployment

### Prerequisites

- 4D-Humans installed at `/home/ben/pose-service/4D-Humans`
- track.py executable and working
- GPU with 8-10GB VRAM
- Python environment with all dependencies
- Node.js with child_process module

### Configuration

Backend needs to know:
- Path to track.py: `/home/ben/pose-service/4D-Humans/track.py`
- Working directory: `/home/ben/pose-service/4D-Humans`
- Timeout: 180 seconds (configurable)
- Video storage path: `/tmp/videos/` (configurable)
- MongoDB connection string (from env)

### Environment Variables

```bash
TRACK_PY_PATH=/home/ben/pose-service/4D-Humans/track.py
TRACK_PY_WORKING_DIR=/home/ben/pose-service/4D-Humans
TRACK_PY_TIMEOUT=180000
VIDEO_STORAGE_PATH=/tmp/videos
MONGODB_URI=mongodb://localhost:27017
```

## Monitoring

Track:
- Subprocess spawn success/failure
- Processing time per video
- Error rates
- MongoDB storage success/failure
- Frame count per video

## Backward Compatibility

**Keep existing endpoints:**
- `/api/pose/hybrid` - Frame-by-frame processing (for debugging)
- `/api/finalize-upload` - Modified to use direct processing

**Feature flag (optional):**
```typescript
const USE_DIRECT_PROCESSING = true;  // Toggle between approaches
```

If `false`, fall back to frame-by-frame processing.

