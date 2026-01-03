# Video Processing Pipeline Spec

## Current Problem

When users upload videos through the web modal:
1. Backend sends to pose service
2. Pose service runs track.py with PHALP (full-video processing for temporal smoothing)
3. **Issue**: No logs visible, frontend stuck on "processing", no mesh data returned to frontend, nothing saved to MongoDB

When track.py runs in isolation:
- Works correctly, produces output video with PHALP mesh overlay
- Generates pickle files with pose/mesh data

## Root Cause Analysis

**Two separate flows exist:**

### Flow 1: video_processor.py (Frame-by-frame)
- Processes video frame-by-frame
- Calls `detect_pose_with_visualization()` for each frame
- Extracts mesh vertices/faces from HMR2 results
- Returns `pose_timeline` array with mesh data
- Backend saves to MongoDB
- **Problem**: No temporal smoothing (PHALP), jerky motion

### Flow 2: track_wrapper.py (Full-video with PHALP)
- Runs track.py as subprocess on entire video
- track.py uses PHALP for temporal tracking/smoothing
- Outputs pickle files with PHALP results
- **Problem**: Doesn't extract mesh data, doesn't return frames array, backend can't save to MongoDB

## What We Need

**Keep Flow 2 (PHALP temporal smoothing) but add:**
1. Extract mesh vertices/faces from PHALP pickle output
2. Convert to `frames` array format (same as video_processor.py)
3. Return to backend in format it expects
4. Backend saves to MongoDB
5. Frontend loads and renders in Three.js

## Data Flow (Target)

```
Video Upload
    ↓
Backend: /api/pose/video
    ↓
Pose Service: /process_video_async
    ↓
track_wrapper.py:
  - Run track.py on full video (PHALP temporal smoothing)
  - Extract mesh from PHALP output pickle
  - Build frames array with vertices/faces
  - Return {frames: [...], fps, duration, etc}
    ↓
Backend: processVideoInBackground()
  - Poll for job completion
  - Extract frames array from result
  - Save to MongoDB via meshDataService
    ↓
Frontend: Load from MongoDB
  - Get frames array with mesh data
  - Render in Three.js
```

## PHALP Output Structure

### What is a .pkl file?
A `.pkl` file is a Python pickle - binary serialization of Python objects. It's like a compressed snapshot of data structures.

### What track.py outputs
When track.py runs with PHALP, it:
1. Processes the **entire video** (not frame-by-frame)
2. Detects and tracks people across frames (temporal tracking)
3. Estimates 3D pose for each person in each frame
4. Generates SMPL mesh (3D body model) for each person
5. Outputs a pickle file with all this data

### Pickle file structure
Location: `{output_dir}/*.pkl` (exact filename varies)

Contents: Dictionary with frame keys
- **Keys**: Frame names (e.g., `"frame_0000"`, `"frame_0001"`, etc.)
- **Values**: Tracklet data (one entry per person per frame)

### Per-frame tracklet data
For each frame, contains:
- `vertices`: 3D mesh vertices (6890 points for SMPL body model) - **numpy array**
- `faces`: Face indices (how vertices connect to form triangles) - **numpy array**
- `smpl`: SMPL parameters (body shape, pose, rotation)
- `camera`: Camera parameters (translation, rotation)
- `track_id`: Which person this is (for tracking across frames)
- Other metadata (confidence, tracking info, etc.)

### Key insight
The pickle file contains **exactly what we need**: 3D mesh vertices and faces for every person in every frame. We just need to extract and convert it to our frame format.

## 2D to 3D Mesh Transformation

### Overview

The 2D→3D transformation process converts 3D mesh data (vertices and faces) from PHALP output into a format that can be rendered in Three.js on the frontend. This involves:

1. **Extracting mesh data** from PHALP pickle files (vertices, faces, camera parameters)
2. **Converting to JSON format** (numpy arrays → lists)
3. **Passing to frontend** via the frames array
4. **Rendering in Three.js** using the camera parameters and mesh geometry

### What Already Exists

#### 1. **mesh_renderer.py** - SMPL Mesh Rendering
- **Class**: `SMPLMeshRenderer`
- **Functions**: `render_mesh_on_image()`, `render_mesh_overlay()`, `render_mesh_rgba()`
- **Purpose**: Renders 3D mesh with proper camera projection using pyrender
- **Key transformations**:
  - 180° rotation around X-axis (OpenGL convention)
  - Flips X component of camera translation
  - Uses intrinsic camera parameters (focal length, principal point)
  - Applies Raymond lighting

#### 2. **hybrid_pose_detector.py** - Camera Parameter Conversion
- **Function**: `cam_crop_to_full()`
- **Purpose**: Converts camera parameters from crop space to full image space
- **Formula**: `tz = 2 * focal_length / (box_size * scale)`
- **Returns**: `[tx, ty, tz]` camera translation in full image space

#### 3. **video_processor.py** - Full Video Processing
- **Class**: `VideoMeshProcessor`
- **Function**: `process_video()`
- **Purpose**: Processes video frame-by-frame, extracts mesh, returns frames array

### Key Transformations

#### Camera Parameters
PHALP provides camera parameters in the format:
- `tx, ty, tz`: Camera translation (position in 3D space)
- `focal_length`: Intrinsic camera parameter (typically 5000)

These are used to:
1. Position the camera in 3D space
2. Project 3D vertices onto 2D image plane
3. Render the mesh from the correct viewpoint

#### Mesh Geometry
PHALP provides:
- **Vertices**: 6890 3D points (SMPL body model)
- **Faces**: 13776 triangles (how vertices connect)

These define the 3D body mesh that gets rendered.

#### Coordinate Systems
- **SMPL space**: 3D coordinates from SMPL model
- **Camera space**: Relative to camera position
- **Image space**: 2D projection onto image plane
- **Three.js space**: WebGL coordinate system

### Implementation Steps

#### Step 1: Verify PHALP Pickle Structure
- Run track.py on test video
- Inspect pickle file to understand exact structure
- Identify keys for vertices, faces, camera parameters
- Document the structure for reference

#### Step 2: Extract Mesh Data from PHALP
Update `track_wrapper.py` `_extract_mesh_from_phalp_output()`:
- Load pickle file
- For each frame:
  - Extract `vertices` (numpy array → list)
  - Extract `faces` (numpy array → list)
  - Extract camera parameters (tx, ty, tz, focal_length)
  - Extract track_id for temporal consistency
- Build frame objects with correct structure

#### Step 3: Add Camera Parameter Extraction
Update `track_wrapper.py` to extract camera parameters:
- Get camera translation from PHALP output
- Get focal length (default 5000 if not provided)
- Use `cam_crop_to_full()` logic if needed to convert coordinate spaces
- Ensure camera parameters match mesh vertices coordinate system

#### Step 4: Build Frames Array with Mesh + Camera Data
Structure returned to backend:
```python
{
  'frames': [
    {
      'frameNumber': 0,
      'timestamp': 0.0,
      'vertices': [[x, y, z], ...],      # 6890 vertices
      'faces': [[v1, v2, v3], ...],      # 13776 faces
      'camera': {
        'tx': 0.0,
        'ty': 0.0,
        'tz': 5.0,
        'focal_length': 5000.0
      },
      'personId': 0,
      'tracked': True,
      'confidence': 1.0
    },
    ...
  ],
  'fps': 30,
  'total_frames': 300,
  'video_duration': 10.0
}
```

#### Step 5: Copy Mesh Rendering Logic to Frontend
Frontend receives frames array and:
- For each frame:
  - Create Three.js BufferGeometry from vertices and faces
  - Create mesh with material
  - Apply camera parameters (position, focal length)
  - Render the frame
- Animate through frames at original FPS

#### Step 6: Test End-to-End
- Upload video through web modal
- Verify track.py runs and creates pickle
- Verify frames array extracted with mesh + camera data
- Verify backend saves to MongoDB
- Verify frontend loads and renders mesh in Three.js
- Verify motion is smooth (PHALP temporal tracking working)

### Reference Code

#### Existing Mesh Rendering (Python)
```python
from mesh_renderer import SMPLMeshRenderer

renderer = SMPLMeshRenderer(focal_length=5000.0)
rendered = renderer.render_mesh_on_image(
    image_rgb,
    vertices,      # (V, 3) numpy array
    faces,         # (F, 3) numpy array
    camera_translation,  # (3,) numpy array [tx, ty, tz]
    focal_length=5000.0
)
```

#### Expected Frontend Format
```javascript
{
  frames: [
    {
      frameNumber: 0,
      timestamp: 0.0,
      vertices: [[x, y, z], ...],
      faces: [[v1, v2, v3], ...],
      camera: {
        tx: 0.0,
        ty: 0.0,
        tz: 5.0,
        focal_length: 5000.0
      }
    }
  ],
  fps: 30,
  total_frames: 300
}
```

## Key Questions to Answer

1. **What is the exact pickle filename?**
   - Does track.py create `results.pkl`, `output.pkl`, or something else?
   - Where exactly is it saved in the output directory?

2. **What is the exact dictionary structure?**
   - Are frame keys like `"frame_0000"` or something else?
   - Are values dicts or lists?
   - What are all the keys in each frame's data?

3. **How are vertices/faces stored?**
   - Are they numpy arrays or lists?
   - What are their exact shapes? (vertices should be Nx3, faces should be Mx3)
   - Are they in world space, camera space, or normalized?
   - Do we need to transform them?

4. **How many frames are in the pickle?**
   - Does it include all video frames or only tracked frames?
   - Are there gaps or missing frames?
   - How do we handle frames with no detections?

5. **How are multiple people handled?**
   - If multiple people in frame, are they separate entries?
   - Do we need to merge them or keep separate?
   - How do we handle track_id for temporal consistency?

## Side-by-Side View Requirements

### Overview
Users need to view the original/overlay videos and 3D mesh visualization side-by-side with frame-by-frame display capability. This requires:
1. Saving the track.py output .mp4 file to MongoDB
2. Storing video metadata (fps, duration, resolution, frame count)
3. Creating a side-by-side view component with:
   - Left: Video toggle (original ↔ PHALP overlay)
   - Right: Three.js 3D mesh visualization
4. Implementing frame-by-frame navigation (next/previous frame, scrubbing)
5. Keeping both video and 3D mesh in perfect sync

### Data Model for Side-by-Side View

```typescript
interface VideoDocument {
  _id: ObjectId;
  jobId: string;
  
  // Original video
  originalVideo: {
    filename: string;
    data: Binary;           // Original uploaded video
    size: number;           // File size in bytes
    mimeType: string;       // "video/mp4"
  };
  
  // PHALP mesh overlay video
  meshOverlayVideo: {
    filename: string;
    data: Binary;           // track.py output video with mesh overlay
    size: number;           // File size in bytes
    mimeType: string;       // "video/mp4"
  };
  
  // Metadata
  metadata: {
    fps: number;            // Frames per second
    duration: number;       // Duration in seconds
    resolution: {
      width: number;
      height: number;
    };
    frameCount: number;     // Total frames in video
    processingTime: number; // Time to process in seconds
  };
  
  // Mesh data
  frames: Frame[];          // Array of frame objects with mesh data
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface Frame {
  frameNumber: number;
  timestamp: number;
  vertices: number[][];     // 6890 3D points
  faces: number[][];        // 13776 triangle indices
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focal_length: number;
  };
  personId: number;
  tracked: boolean;
  confidence: number;
}
```

### Implementation Steps

#### Step 1: Save Original Video to Persistent Location
- When video is uploaded, save to `~/videos/{jobId}_original.mp4`
- Store filename and size for later retrieval

#### Step 2: Save Output Video from track.py
- After track.py completes, output video is at `~/videos/mesh_overlay_{jobId}.mp4`
- Verify file exists and is readable
- Store filename and size

#### Step 3: Extract Video Metadata
- Use OpenCV to read video properties:
  - `fps`: frames per second
  - `duration`: total duration in seconds
  - `resolution`: width and height
  - `frameCount`: total number of frames
- Store in metadata object

#### Step 4: Save Both Videos to MongoDB
- Read original video file as binary
- Read mesh overlay video file as binary
- Create VideoDocument with both videos and metadata
- Save to MongoDB collection `videos`

#### Step 5: Create Backend Endpoint to Retrieve Videos
- `GET /api/video/:jobId` - Returns VideoDocument with metadata
- `GET /api/video/:jobId/original/stream` - Streams original video
- `GET /api/video/:jobId/overlay/stream` - Streams mesh overlay video
- `GET /api/video/:jobId/frame/:frameNumber` - Returns specific frame from either video

#### Step 6: Create Side-by-Side View Component
Frontend component displays:
```
┌─────────────────────────────────────────────────────┐
│ Left Panel (Video)      │ Right Panel (3D Mesh)     │
│ ┌───────────────────┐   │ ┌───────────────────────┐ │
│ │ [Original/Overlay]│   │ │ Three.js Canvas       │ │
│ │ Toggle Button     │   │ │ (Synced Mesh)         │ │
│ │                   │   │ │                       │ │
│ │ Video Player      │   │ │ 3D Mesh Visualization│ │
│ │ (Frame-by-frame)  │   │ │ (Real-time)           │ │
│ └───────────────────┘   │ └───────────────────────┘ │
│ Shared Timeline / Scrubber (both videos + mesh)     │
│ [◄ Prev] [Play/Pause] [Next ►] [Frame: 0/300]      │
└─────────────────────────────────────────────────────┘
```

**Left Panel:**
- Toggle button to switch between original and overlay videos
- Video player showing selected video
- Frame-by-frame navigation

**Right Panel:**
- Three.js canvas rendering 3D mesh
- Real-time mesh visualization synced with video
- Camera parameters applied for correct viewpoint

**Shared Controls:**
- Timeline/scrubber for seeking
- Play/Pause button
- Previous/Next frame buttons
- Frame counter

#### Step 7: Implement Frame-by-Frame Navigation
- **Next Frame**: Advance both video and 3D mesh by 1 frame
- **Previous Frame**: Go back 1 frame in both video and 3D mesh
- **Scrubber**: Drag to seek to specific frame (both video and mesh follow)
- **Play/Pause**: Controls both video and mesh together
- **Speed Control**: Play at different speeds (0.5x, 1x, 2x)

#### Step 8: Implement Frame Extraction and Mesh Rendering
- Extract specific frame from video file using OpenCV
- Return as JPEG or PNG for video display
- For 3D mesh: Load frame data from frames array
- Create Three.js BufferGeometry from vertices/faces
- Apply camera parameters for correct viewpoint
- Render mesh in real-time as user navigates

### Key Considerations

1. **File Size**: Videos can be large (100MB+)
   - Consider storing as file references instead of binary in MongoDB
   - Or use GridFS for large files
   - Or store on disk and reference by path

2. **Sync**: Keep video and 3D mesh perfectly in sync
   - Use frame numbers, not timestamps (more reliable)
   - Both video and mesh should display same frame number
   - Scrubbing should update both simultaneously
   - Three.js mesh updates in real-time as video plays

3. **Performance**: Loading large videos and rendering 3D
   - Stream videos instead of loading entire file
   - Use range requests for seeking
   - Cache frames locally on frontend
   - Optimize Three.js rendering for smooth playback

3. **Performance**: Loading large videos
   - Stream videos instead of loading entire file
   - Use range requests for seeking
   - Cache frames locally on frontend

4. **Metadata**: Store enough info for frontend
   - fps, duration, resolution, frame count
   - Original filename for reference
   - Processing time for analytics

## Current Implementation Status

### Already Implemented

1. **Mesh Extraction from PHALP Pickle** ✅
   - `track_wrapper.py` has `_extract_mesh_from_phalp_output()` method
   - Handles both dict and list pickle structures
   - Converts numpy arrays to JSON-serializable lists
   - Extracts vertices, faces, camera parameters, confidence, etc.

2. **Frame Building** ✅
   - `_build_frame_from_tracklet()` creates frame objects with:
     - frameNumber, timestamp, vertices, faces
     - confidence, keypoints, joints3D, personId
     - tracked flag, has3D flag, meshRendered flag

3. **Backend API** ✅
   - `POST /api/pose/video` - Upload video, returns immediately with jobId
   - `GET /api/pose/job_status/:jobId` - Poll for job completion
   - `GET /api/pose/job_logs/:jobId` - Get job logs
   - Background processing with `processVideoInBackground()`

4. **MongoDB Integration** ✅
   - `meshDataService.saveMeshData()` saves frames to MongoDB
   - Stores fps, videoDuration, frameCount, metadata
   - Includes uploadedAt, processingTime, extractionMethod

### Next Steps: Focus on Frame Extraction → MongoDB Storage

**Priority 1: Verify End-to-End Flow**
1. Upload video through backend
2. Verify track.py runs and creates pickle file
3. Verify frames extracted with mesh data
4. Verify frames saved to MongoDB
5. Verify frontend can query and display frames

**Priority 2: Debug with MCP Tools**
- Use **MongoDB MCP** to query saved frames
- Use **Chrome DevTools MCP** to inspect frontend network requests
- Use **Browser MCP** to test frontend rendering

## MCP Tools Required

### 1. MongoDB MCP
**Purpose**: Query and inspect frames saved to MongoDB

**Setup**:
```bash
# Add to ~/.kiro/settings/mcp.json or .kiro/settings/mcp.json
{
  "mcpServers": {
    "mongodb": {
      "command": "uvx",
      "args": ["mongodb-mcp@latest"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017"
      }
    }
  }
}
```

**Verification**:
- Connect to MongoDB
- List databases and collections
- Query `videos` collection to see saved frames
- Inspect frame structure

### 2. Chrome DevTools MCP
**Purpose**: Debug backend and frontend communication

**Setup**:
```bash
# Add to ~/.kiro/settings/mcp.json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "uvx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

**Verification**:
- Open browser DevTools
- Monitor network requests to `/api/pose/video`
- Monitor network requests to `/api/pose/job_status/:jobId`
- Inspect console logs

### 3. Browser MCP
**Purpose**: Test frontend rendering and interaction

**Setup**:
```bash
# Add to ~/.kiro/settings/mcp.json
{
  "mcpServers": {
    "browser": {
      "command": "uvx",
      "args": ["browser-mcp@latest"]
    }
  }
}
```

**Verification**:
- Navigate to frontend
- Upload test video
- Monitor job status polling
- Verify frames loaded from MongoDB
- Verify Three.js mesh renders

## Debugging Workflow

### Step 1: Verify Pickle Extraction
```bash
# Run test video through track.py
cd backend/pose-service
python inspect_phalp_output.py ~/videos/test_video.mp4

# Check if pickle file created
ls -la ~/videos/track_output_*/
```

### Step 2: Verify Backend Receives Frames
```bash
# Upload video and check logs
curl -X POST -F "video=@test.mp4" http://localhost:3001/api/pose/video

# Monitor backend logs
tail -f backend/logs/app.log
```

### Step 3: Verify MongoDB Storage (MongoDB MCP)
```
# Connect to MongoDB
mcp mongodb connect mongodb://localhost:27017

# Query saved frames
mcp mongodb find videos {} --limit 1

# Inspect frame structure
mcp mongodb find videos {"frames": {$exists: true}} --limit 1
```

### Step 4: Verify Frontend Receives Data (Chrome DevTools MCP)
```
# Open DevTools
mcp chrome-devtools open

# Monitor network requests
mcp chrome-devtools network-monitor

# Check console for errors
mcp chrome-devtools console-logs
```

### Step 5: Verify Three.js Rendering (Browser MCP)
```
# Navigate to frontend
mcp browser navigate http://localhost:3001

# Take screenshot
mcp browser screenshot

# Check if mesh renders
mcp browser evaluate "document.querySelector('canvas').getContext('webgl')"
```

## Success Criteria

- [ ] Pickle file is created and can be loaded
- [ ] Pickle structure is understood and documented
- [ ] Extraction code correctly reads vertices/faces
- [ ] Frames array has correct format and structure
- [ ] Video upload returns immediately with jobId
- [ ] Backend polls pose service and gets job status
- [ ] Pose service returns frames array with mesh data
- [ ] **Backend saves frames to MongoDB** ← FOCUS HERE
- [ ] **MongoDB MCP can query saved frames** ← VERIFY WITH MCP
- [ ] Frontend loads frames from MongoDB
- [ ] **Chrome DevTools MCP shows network requests** ← DEBUG WITH MCP
- [ ] Frontend renders mesh in Three.js
- [ ] **Browser MCP shows Three.js canvas rendering** ← VERIFY WITH MCP
- [ ] Motion is smooth (PHALP temporal tracking working)
- [ ] Logs show track.py processing progress
- [ ] Original video saved to persistent location
- [ ] Output video from track.py saved to persistent location
- [ ] Video metadata extracted (fps, duration, resolution, frame count)
- [ ] Both videos saved to MongoDB with metadata
- [ ] Backend endpoints return videos and metadata
- [ ] Side-by-side view displays both videos
- [ ] Frame-by-frame navigation works (next/previous/scrubber)
- [ ] Both videos stay in sync during playback
- [ ] Frame extraction endpoint works for specific frames
