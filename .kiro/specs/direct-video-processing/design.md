# Direct Video Processing Design (Option 3)

## Overview

This design implements a two-stage video processing workflow:
1. **Stage 1 (Manual):** User runs `track.py` directly in WSL terminal to generate output files in `/tmp/video_processing/`
2. **Stage 2 (Automated):** User clicks "Process" button in web UI, backend parses pkl and stores to MongoDB

**Key Insight:** Separate concerns - let track.py run reliably in terminal, backend only handles parsing and storage.

## Architecture

### High-Level Flow

```
User Terminal (WSL)
├─ Place original video in /tmp/video_processing/
├─ Run track.py manually: python track.py video.source=/tmp/video_processing/video.mp4 video.output_dir=/tmp/video_processing/ ...
└─ track.py generates: output.mp4 (overlay) + results.pkl (pose data)

Directory Contents After track.py (/tmp/video_processing/)
├─ video.mp4 (original)
├─ output.mp4 (mesh overlay)
└─ results.pkl (pose data)

Web UI
├─ User clicks "Process" button
└─ Backend automatically processes /tmp/video_processing/

Backend: /api/video/process-directory
├─ Access /tmp/video_processing/ directory
├─ Read .pkl file
├─ Parse pkl to extract frame data
├─ Read original video for metadata (fps, duration, resolution)
├─ Store all frames in MongoDB
└─ Return success response with video_id

Frontend: Query and render
├─ GET /api/frames?video_id={videoId}
├─ Load frames from MongoDB
├─ Create Three.js BufferGeometry
└─ Render 3D mesh
```

### Components

#### 1. Directory Processing Endpoint (Node.js)

**File:** `backend/src/api/process-directory.ts`

**Responsibilities:**
- Receive POST request from frontend
- Access `/tmp/video_processing/` directory
- Validate .pkl file exists
- Trigger parsing and storage
- Return success/error response

**Interface:**
```typescript
interface ProcessDirectoryRequest {
  // No parameters - always uses /tmp/video_processing/
}

interface ProcessDirectoryResponse {
  success: boolean;
  videoId?: string;
  frameCount?: number;
  error?: string;
}

async function processDirectory(): Promise<ProcessDirectoryResponse>
```

#### 2. Pickle Parser Service (Node.js)

**File:** `backend/src/services/pickleParserService.ts`

**Responsibilities:**
- Load `.pkl` file from `/tmp/video_processing/`
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

#### 3. Video Metadata Service (Node.js)

**File:** `backend/src/services/videoMetadataService.ts`

**Responsibilities:**
- Read original video file from `/tmp/video_processing/`
- Extract metadata (fps, duration, resolution, frame count)
- Return metadata for storage with frames

**Interface:**
```typescript
interface VideoMetadata {
  fps: number;
  duration: number;
  resolution: [number, number];
  frameCount: number;
  filename: string;
  filesize: number;
}

async function extractVideoMetadata(
  videoPath: string
): Promise<VideoMetadata>
```

#### 4. MongoDB Frame Storage Service (Node.js)

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
  frames: FrameData[],
  metadata: VideoMetadata
): Promise<void>

async function getFrame(
  videoId: string,
  frameNumber: number
): Promise<FrameDocument | null>

async function getAllFrames(
  videoId: string
): Promise<FrameDocument[]>
```

#### 5. Backend Integration (Node.js)

**File:** `backend/src/server.ts` - `/api/video/process-directory` endpoint

**Flow:**
```typescript
app.post('/api/video/process-directory', async (req, res) => {
  try {
    // 1. Validate directory exists
    const dirPath = '/tmp/video_processing';
    if (!fs.existsSync(dirPath)) {
      return res.status(400).json({ error: 'Directory not found' });
    }
    
    // 2. Find .pkl file
    const pklFiles = glob.sync(`${dirPath}/**/*.pkl`);
    if (pklFiles.length === 0) {
      return res.status(400).json({ error: 'No pickle file found' });
    }
    const pklPath = pklFiles[0];
    
    // 3. Find original video file
    const videoFiles = glob.sync(`${dirPath}/*.mp4`);
    if (videoFiles.length === 0) {
      return res.status(400).json({ error: 'No video file found' });
    }
    const videoPath = videoFiles[0];
    
    // 4. Extract video metadata
    const metadata = await extractVideoMetadata(videoPath);
    
    // 5. Parse .pkl output
    const frames = await parsePickleToFrames(pklPath);
    
    // 6. Store in MongoDB
    const videoId = generateVideoId();
    await storeFrames(videoId, frames, metadata);
    
    // 7. Return success
    res.json({
      success: true,
      videoId,
      frameCount: frames.length,
      message: 'Video processed successfully'
    });
  } catch (error) {
    console.error('[PROCESS-DIRECTORY] Error:', error);
    res.status(500).json({ error: error.message });
  }
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

### Directory Access Errors

| Error | Cause | Response |
|-------|-------|----------|
| Directory not found | /tmp/video_processing/ doesn't exist | 400 Bad Request |
| .pkl not found | track.py didn't output pickle | 400 Bad Request |
| Video file not found | Original video missing | 400 Bad Request |

### Parsing Errors

| Error | Cause | Response |
|-------|-------|----------|
| .pkl parse error | Corrupted pickle | 500 + "Failed to parse pickle" |
| Invalid frame data | Missing fields | 500 + "Invalid frame structure" |
| Metadata extraction failed | Video file corrupted | 500 + "Failed to extract metadata" |

### Storage Errors

| Error | Cause | Response |
|-------|-------|----------|
| MongoDB connection | DB unavailable | 500 + "Database connection failed" |
| Insert failed | Duplicate key | 500 + "Frame storage failed" |
| Index creation | Permission denied | 500 + "Index creation failed" |

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Coverage

**For any** pkl file with N frames, the parsed output SHALL contain exactly N frames with sequential frame numbers from 0 to N-1.

**Validates: Requirements 1.4, 3.1**

### Property 2: Track ID Consistency

**For any** person appearing in multiple frames, their track_id SHALL remain constant across all frames they appear in.

**Validates: Requirements 3.4, 6.3**

### Property 3: Mesh Vertex Count

**For any** frame with persons, each person SHALL have exactly 6890 mesh vertices.

**Validates: Requirements 2.6, 3.3**

### Property 4: Mesh Face Count

**For any** frame with persons, each person SHALL have exactly 13776 mesh faces.

**Validates: Requirements 2.6, 3.3**

### Property 5: Keypoint Count

**For any** frame with persons, each person SHALL have exactly 45 3D keypoints and 45 2D keypoints.

**Validates: Requirements 2.3, 3.3**

### Property 6: Confidence Range

**For any** frame with persons, tracking_confidence SHALL be between 0.0 and 1.0 (inclusive).

**Validates: Requirements 2.4, 2.5**

### Property 7: MongoDB Round-Trip

**For any** set of frames stored in MongoDB, querying by video_id and frame_number SHALL return the exact same frame data.

**Validates: Requirements 4.4, 4.5**

## Testing Strategy

### Unit Tests

1. **Directory validation**
   - Test directory exists check
   - Test .pkl file detection
   - Test video file detection
   - Test missing directory handling
   - Test missing .pkl handling
   - Test missing video handling

2. **Pickle parsing**
   - Test .pkl loading
   - Test frame extraction
   - Test SMPL parameter parsing
   - Test keypoint extraction
   - Test mesh vertex computation
   - Test numpy array conversion

3. **Video metadata extraction**
   - Test fps extraction
   - Test duration extraction
   - Test resolution extraction
   - Test frame count extraction
   - Test corrupted video handling

4. **MongoDB storage**
   - Test frame document creation
   - Test index creation
   - Test query by video_id + frame_number
   - Test query all frames for video
   - Test TTL index functionality

5. **Error handling**
   - Test missing directory
   - Test missing .pkl file
   - Test missing video file
   - Test corrupted pickle
   - Test corrupted video
   - Test MongoDB connection failure

### Property-Based Tests

**Property 1: Frame Coverage**
- Generate random pkl files with varying frame counts
- Parse each pkl file
- Verify output frame count matches input
- **Validates: Requirements 1.4, 3.1**

**Property 2: Track ID Consistency**
- Generate random frames with multiple persons
- Store in MongoDB
- Query each frame
- Verify track IDs are consistent across frames
- **Validates: Requirements 3.4, 6.3**

**Property 3: Mesh Vertex Count**
- Generate random frames with persons
- Parse and store
- Query frames
- Verify each person has exactly 6890 vertices
- **Validates: Requirements 2.6, 3.3**

**Property 4: Mesh Face Count**
- Generate random frames with persons
- Parse and store
- Query frames
- Verify each person has exactly 13776 faces
- **Validates: Requirements 2.6, 3.3**

**Property 5: Keypoint Count**
- Generate random frames with persons
- Parse and store
- Query frames
- Verify each person has exactly 45 3D and 45 2D keypoints
- **Validates: Requirements 2.3, 3.3**

**Property 6: Confidence Range**
- Generate random frames with varying confidence values
- Parse and store
- Query frames
- Verify all confidence values are between 0.0 and 1.0
- **Validates: Requirements 2.4, 2.5**

**Property 7: MongoDB Round-Trip**
- Generate random frame data
- Store in MongoDB
- Query by video_id and frame_number
- Verify returned data matches original
- **Validates: Requirements 4.4, 4.5**

## Performance Considerations

### Bottlenecks

1. **Manual track.py execution** (60-120s) - User responsibility
   - Cannot optimize in backend
   - Mitigation: Document best practices for WSL

2. **Pickle parsing** (1-2s)
   - Loading large pickle file
   - Iterating through frames
   - Mitigation: Optimize with streaming if needed

3. **Video metadata extraction** (100-500ms)
   - Reading video file headers
   - Mitigation: Cache metadata

4. **MongoDB storage** (1-2s)
   - Batch insert frames
   - Index creation
   - Mitigation: Use bulk operations

### Optimization Opportunities

1. **Streaming parsing** - Parse pickle incrementally (not all at once)
2. **Batch MongoDB inserts** - Use `insertMany()` for all frames
3. **Caching** - Cache results by video hash (if same video processed twice)
4. **Async operations** - Use async/await for all I/O operations
5. **Connection pooling** - Reuse MongoDB connections

## Deployment

### Prerequisites

- `/tmp/video_processing/` directory exists and is writable
- Original video file placed in `/tmp/video_processing/`
- track.py executed manually to generate `.pkl` and `output.mp4`
- MongoDB running and accessible
- Node.js with fs and glob modules

### Configuration

Backend needs to know:
- Temp directory path: `/tmp/video_processing/` (hardcoded)
- MongoDB connection string (from env)

### Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=snowboarding_explained
```

## Monitoring

Track:
- Directory access success/failure
- .pkl file detection success/failure
- Parsing success/failure
- MongoDB storage success/failure
- Frame count per video
- Processing time per request

## Backward Compatibility

**Keep existing endpoints:**
- `/api/mesh-data` - Query existing mesh data
- `/api/video/:jobId` - Query video metadata

**New endpoint:**
- `/api/video/process-directory` - Process files from `/tmp/video_processing/`

