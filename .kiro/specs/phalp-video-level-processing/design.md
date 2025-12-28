# PHALP Video-Level Processing Design

## Overview

This design implements video-level PHALP processing by spawning `track.py` as a subprocess from the Flask wrapper. The approach is simple, robust, and leverages the existing 4D-Humans implementation without modification.

**Key insight:** Instead of importing and calling PHALP directly in Flask, we spawn it as a separate process. This provides isolation, simplicity, and allows concurrent request queuing.

## Architecture

### High-Level Flow

```
User uploads video
    ↓
Backend saves video to disk
    ↓
Backend POST /pose/video with video_path
    ↓
Flask receives request
    ├─ If GPU busy: queue request (202 Accepted)
    └─ If GPU free: spawn subprocess
    ↓
Subprocess: python track.py video.source=/path/to/video.mp4
    ├─ Loads models (2-3s)
    ├─ Processes video (60-120s)
    └─ Outputs results.pkl
    ↓
Flask loads .pkl file
    ↓
Flask parses .pkl to JSON
    ├─ Extract SMPL params per frame
    ├─ Compute mesh vertices
    ├─ Extract keypoints
    └─ Format for MongoDB
    ↓
Flask returns JSON response
    ↓
Backend stores in MongoDB
    ↓
Frontend queries frame data for Three.js rendering
```

### Components

#### 1. Flask Wrapper (`/pose/video` endpoint)

**Responsibilities:**
- Accept POST request with `video_path`
- Validate video file exists
- Check GPU availability (simple: check if subprocess running)
- Spawn subprocess with timeout
- Monitor subprocess completion
- Parse .pkl output
- Return JSON response

**Pseudocode:**
```python
@app.route('/pose/video', methods=['POST'])
def pose_video():
    data = request.get_json()
    video_path = data['video_path']
    
    # Validate
    if not os.path.exists(video_path):
        return {'error': 'Video not found'}, 400
    
    # Check if GPU busy (simple: check if subprocess running)
    if is_subprocess_running():
        return {'status': 'queued', 'job_id': generate_id()}, 202
    
    # Spawn subprocess
    try:
        result = subprocess.run(
            ['python', 'track.py', f'video.source={video_path}'],
            cwd='/home/ben/pose-service/4D-Humans',
            timeout=180,
            capture_output=True
        )
        
        if result.returncode != 0:
            return {'error': result.stderr.decode()}, 500
        
        # Parse output
        pkl_path = find_output_pkl(video_path)
        frame_data = parse_pkl_to_json(pkl_path)
        
        return frame_data, 200
        
    except subprocess.TimeoutExpired:
        return {'error': 'Processing timeout'}, 500
    except Exception as e:
        return {'error': str(e)}, 500
```

#### 2. Output Parser

**Input:** PHALP's `.pkl` file (pickle format)

**Output:** JSON with structure:
```json
{
  "total_frames": 140,
  "frames": [
    {
      "frame_number": 0,
      "timestamp": 0.0,
      "persons": [
        {
          "track_id": 0,
          "confidence": 1.0,
          "tracking_confidence": 1.0,
          "smpl": {
            "betas": [...],
            "body_pose": [...],
            "global_orient": [...]
          },
          "keypoints_3d": [...],
          "keypoints_2d": [...],
          "camera": {
            "tx": 0.0,
            "ty": 0.0,
            "tz": 5.0
          },
          "bbox": [x0, y0, w, h],
          "mesh_vertices": [...]
        }
      ]
    },
    ...
  ]
}
```

**Parsing logic:**
1. Load .pkl file using pickle
2. Iterate through frames
3. For each frame, extract:
   - Frame number and timestamp
   - Person detections (track_id, confidence)
   - SMPL parameters
   - 3D/2D keypoints
   - Camera parameters
   - Bounding box
4. Compute mesh vertices from SMPL params
5. Convert to JSON

#### 3. Backend Integration

**Current flow (frame-by-frame):**
```
finalize-upload
├─ Extract frames with FFmpeg
└─ For each frame:
   ├─ Convert to base64
   └─ POST /pose/hybrid
```

**New flow (video-level):**
```
finalize-upload
├─ Save video to disk
├─ POST /pose/video with video_path
├─ Receive JSON response
└─ Store all frames in MongoDB
```

**Changes needed:**
- Modify `finalize-upload` endpoint to call `/pose/video` instead of frame extraction
- Store entire JSON response in MongoDB (or break into per-frame documents)
- Add fallback to frame-by-frame if `/pose/video` fails

#### 4. Request Queuing

**Simple approach:** Use a global flag to track if subprocess is running

```python
subprocess_running = False
subprocess_lock = threading.Lock()

@app.route('/pose/video', methods=['POST'])
def pose_video():
    global subprocess_running
    
    with subprocess_lock:
        if subprocess_running:
            # Queue the request
            job_id = str(uuid.uuid4())
            request_queue.append({
                'job_id': job_id,
                'video_path': data['video_path']
            })
            return {'status': 'queued', 'job_id': job_id}, 202
        
        subprocess_running = True
    
    try:
        # Process video
        result = subprocess.run(...)
        return result, 200
    finally:
        with subprocess_lock:
            subprocess_running = False
            # Process next queued request if any
            if request_queue:
                next_request = request_queue.pop(0)
                # Recursively call pose_video for next request
```

## Data Models

### MongoDB Storage Strategy

**Problem:** Full video response (140 frames) = ~23.4 MB, exceeds MongoDB 16 MB document limit

**Solution:** Store per-frame documents (Option 1)
- Each frame stored as separate MongoDB document
- Size per frame: ~167 KB (well under 16 MB limit)
- Query by: `{video_id, frame_number}`
- Faster queries and better scalability

### Per-Frame Document Schema

```javascript
{
  _id: ObjectId,
  video_id: "uuid",
  frame_number: 0,
  timestamp: 0.0,
  persons: [
    {
      track_id: 0,
      confidence: 1.0,
      tracking_confidence: 1.0,
      smpl: {
        betas: [10 values],
        body_pose: [23, 3, 3],
        global_orient: [3, 3]
      },
      keypoints_3d: [45, 3],
      keypoints_2d: [45, 2],
      camera: {
        tx: 0.0,
        ty: 0.0,
        tz: 5.0
      },
      bbox: [x0, y0, w, h],
      mesh_vertices: [6890, 3]
    }
  ],
  created_at: ISODate,
  updated_at: ISODate
}
```

### Storage Flow

```
Flask receives /pose/video request
    ↓
Spawns track.py subprocess
    ↓
Parses .pkl output to JSON
    ↓
For each frame in JSON:
  ├─ Create MongoDB document
  ├─ Set video_id, frame_number
  ├─ Insert into frames collection
    ↓
Return response with video_id
    ↓
Frontend queries: db.frames.find({video_id: X, frame_number: Y})
```

### Indexes

Create these indexes for fast queries:

```javascript
db.frames.createIndex({ video_id: 1, frame_number: 1 })  // Primary query
db.frames.createIndex({ video_id: 1 })                    // List all frames for video
db.frames.createIndex({ created_at: 1 }, { expireAfterSeconds: 2592000 })  // TTL: 30 days
```

### Size Breakdown

| Component | Size |
|-----------|------|
| SMPL params | 500 B |
| Keypoints (45×3D + 45×2D) | 1.5 KB |
| Mesh vertices (6890×3) | 165 KB |
| Camera + bbox + metadata | 200 B |
| **Per-frame total** | **~167 KB** |
| **140-frame video** | **~23.4 MB** |
| **Per-document (MongoDB)** | **~167 KB** ✓ |

## Error Handling

### Subprocess Failures

| Error | Cause | Response |
|-------|-------|----------|
| Video not found | Invalid path | 400 Bad Request |
| Subprocess timeout | GPU too slow | 500 Internal Server Error |
| Subprocess crash | track.py error | 500 + stderr |
| .pkl not found | track.py didn't output | 500 Internal Server Error |
| .pkl parse error | Corrupted pickle | 500 Internal Server Error |

### Fallback Strategy

If `/pose/video` fails:
1. Backend catches error
2. Falls back to `/pose/hybrid` (frame-by-frame)
3. Logs warning
4. Continues processing

## Testing Strategy

### Unit Tests

1. **Subprocess spawning**
   - Test subprocess starts correctly
   - Test subprocess timeout handling
   - Test subprocess crash handling

2. **Output parsing**
   - Test .pkl loading
   - Test frame extraction
   - Test SMPL parameter parsing
   - Test keypoint extraction
   - Test mesh vertex computation

3. **JSON formatting**
   - Test JSON structure matches schema
   - Test all required fields present
   - Test JSON serializable (no numpy arrays)

4. **Error handling**
   - Test invalid video path
   - Test missing .pkl file
   - Test corrupted pickle
   - Test subprocess timeout

### Property-Based Tests

**Property 1: Frame coverage**
- For any video with N frames, output SHALL contain exactly N frames
- **Validates: Requirement 1.5**

**Property 2: Track ID consistency**
- For any person track, track_id SHALL be consistent across all frames they appear in
- **Validates: Requirement 5.5**

**Property 3: Mesh vertex count**
- For any frame with persons, each person SHALL have exactly 6890 mesh vertices
- **Validates: Requirement 3.6**

**Property 4: Keypoint count**
- For any frame with persons, each person SHALL have exactly 45 3D keypoints and 45 2D keypoints
- **Validates: Requirement 3.2**

**Property 5: Temporal smoothness**
- For any two consecutive frames with same person, pose change SHALL be smooth (no sudden jumps)
- **Validates: Requirement 5.1**

## Performance Considerations

### Bottlenecks

1. **GPU processing** (60-120s) - Dominant bottleneck
   - Cannot parallelize (single GPU)
   - Mitigation: Queue requests, process sequentially

2. **Subprocess startup** (2-3s)
   - Python interpreter startup
   - Model loading
   - Mitigation: Pre-warm models on Flask startup

3. **.pkl parsing** (1-2s)
   - Loading large pickle file
   - Iterating through frames
   - Mitigation: Optimize pickle loading (use numpy arrays)

### Optimization Opportunities

1. **Pre-load models** - Load track.py models on Flask startup (not per-request)
2. **Async subprocess** - Use asyncio for non-blocking subprocess calls
3. **Streaming output** - Stream results as frames complete (not wait for all)
4. **Caching** - Cache results by video hash (if same video uploaded twice)

## Deployment

### Prerequisites

- 4D-Humans installed at `/home/ben/pose-service/4D-Humans`
- track.py executable and working
- GPU with 8-10GB VRAM
- Python environment with all dependencies

### Configuration

Flask wrapper needs to know:
- Path to track.py: `/home/ben/pose-service/4D-Humans/track.py`
- Working directory: `/home/ben/pose-service/4D-Humans`
- Timeout: 180 seconds
- Output directory: `/tmp/phalp_output` (or configurable)

### Monitoring

Track:
- Subprocess spawn success/failure
- Processing time per video
- Queue length
- Error rates

## Backward Compatibility

**Keep `/pose/hybrid` endpoint unchanged:**
- Still accepts single frame as base64
- Still returns single frame pose
- Used for debugging and fallback

**New `/pose/video` endpoint:**
- Accepts video path
- Returns all frames
- Used for production video processing

**Backend flag:**
```python
USE_VIDEO_LEVEL_PROCESSING = True  # Toggle between endpoints
```

If `False`, use frame-by-frame processing as before.
