# Direct Video Processing Requirements (Option 3)

## Introduction

This feature implements a two-stage video processing workflow:
1. **Stage 1 (Manual):** User runs `track.py` directly in WSL terminal to generate output files in a temp directory
2. **Stage 2 (Automated):** User clicks "Process" button in web UI, backend parses pkl and stores to MongoDB

**Key Insight:** Separate concerns - let track.py run reliably in terminal, backend only handles parsing and storage.

**Workflow:**
1. User places original video file in temp directory (e.g., `/tmp/video_processing/`)
2. User runs track.py command manually in WSL terminal: `python track.py video.source=/tmp/video_processing/video.mp4 video.output_dir=/tmp/video_processing/ ...`
3. track.py generates in same directory: `output.mp4` (mesh overlay video) and `results.pkl` (pose data)
4. Directory now contains: `video.mp4` (original), `output.mp4` (overlay), `results.pkl` (pose data)
5. User clicks "Process" button in web UI, specifies directory path
6. Backend reads all 3 files from directory, parses pkl, extracts mesh data, stores to MongoDB
7. Frontend retrieves data from MongoDB and renders in Three.js
8. Temp directory can be cleaned up by user (MongoDB holds all final data)

**Benefits:**
- No subprocess complexity in backend
- track.py runs reliably in terminal (proven working)
- Backend only handles parsing and storage (simpler, more robust)
- No upload modal needed
- Clean separation of concerns
- MongoDB handles all final data storage
- Temp directory keeps WSL clean (user manages cleanup)

**Trade-offs:**
- Manual track.py execution step (acceptable for MVP)
- Requires temp directory management by user
- User must specify directory path via web UI

## Glossary

- **PHALP**: Probabilistic Human Appearance, Location, and Pose tracker
- **track.py**: 4D-Humans entry point that runs PHALP with HMR2 model
- **HMR2**: Human Mesh Recovery 2.0 - 3D mesh recovery model
- **Temp_Directory**: WSL directory containing original video, output video, and pkl file
- **Tracklet**: Continuous track of a person across multiple frames
- **Ghost_Detection**: PHALP's predicted pose when detection fails
- **SMPL**: Skinned Multi-Person Linear model - 6890 mesh vertices
- **Pickle_Output**: Binary serialized Python object (.pkl file) containing pose data
- **Frame_Extraction**: Converting PHALP output to per-frame JSON
- **Mesh_Data**: 3D vertices, faces, and camera parameters per frame

## Requirements

### Requirement 1: Directory-Based Processing Endpoint

**User Story:** As a frontend user, I want to click a "Process" button, so that the backend automatically processes track.py output from the tmp folder.

#### Acceptance Criteria

1. WHEN the user clicks "Process" button, THE Frontend SHALL POST to `/api/video/process-directory`
2. WHEN the backend receives the request, THE Backend SHALL look for files in `/tmp/video_processing/` directory
3. WHEN the directory is accessed, THE Backend SHALL search for `.pkl` file in that directory
4. IF `.pkl` file is not found, THEN THE Backend SHALL return HTTP 400 with error message
5. IF `.pkl` file is found, THEN THE Backend SHALL proceed to parse it
6. WHEN parsing completes, THE Backend SHALL store all frames in MongoDB
7. WHEN storage completes, THE Backend SHALL return success response with video_id
8. WHEN processing completes, THE Backend SHALL NOT delete the tmp directory (user manages cleanup)

### Requirement 2: Pickle File Parsing

**User Story:** As a backend developer, I want to parse PHALP's `.pkl` output into frame data, so that I can store it in MongoDB.

#### Acceptance Criteria

1. WHEN the `.pkl` file is found in the directory, THE Backend SHALL load it using Python's pickle module
2. WHEN parsing the pickle, THE Backend SHALL extract for each frame:
   - Frame number and timestamp
   - SMPL parameters (betas, body_pose, global_orient)
   - 3D keypoints (45 joints)
   - 2D keypoints (projected from 3D)
   - Camera translation [tx, ty, tz]
   - Bounding box [x0, y0, w, h]
   - Track ID for each person
   - Detection confidence score
3. WHEN a frame contains a ghost detection, THE response SHALL include `tracking_confidence` < 1.0
4. WHEN a frame contains a direct detection, THE response SHALL include `tracking_confidence` = 1.0
5. WHEN computing mesh vertices, THE system SHALL use SMPL parameters to generate 6890 vertices
6. WHEN parsing completes, THE Backend SHALL return valid JSON (all numpy arrays converted to lists)
7. WHEN the pkl file is parsed, THE Backend SHALL also read the original video file to extract metadata (fps, duration, resolution)

### Requirement 3: Frame-by-Frame Breakdown

**User Story:** As a frontend developer, I want pose data broken down frame-by-frame, so that I can render each frame in Three.js.

#### Acceptance Criteria

1. WHEN the parsed JSON is received, THE Backend SHALL iterate through each frame
2. FOR each frame, THE Backend SHALL extract keypoints, mesh vertices, and camera parameters
3. FOR each frame, THE Backend SHALL create a frame object with:
   - frameNumber, timestamp
   - vertices (6890 3D points)
   - faces (13776 triangle indices)
   - camera (tx, ty, tz, focal_length)
   - personId, tracked, confidence
4. WHEN storing frames, THE Backend SHALL maintain track IDs for multi-person videos
5. WHEN rendering, THE Frontend SHALL be able to query pose data by frame number
6. WHEN rendering, THE Frontend SHALL have all data needed for Three.js (no additional API calls)

### Requirement 4: MongoDB Storage

**User Story:** As a backend developer, I want to store frame data in MongoDB, so that the frontend can retrieve and render it.

#### Acceptance Criteria

1. WHEN frames are extracted, THE Backend SHALL create a MongoDB collection: `frames`
2. FOR each frame, THE Backend SHALL store as a separate document with:
   - video_id, frame_number, timestamp
   - persons array (with vertices, faces, camera, etc.)
   - created_at, updated_at timestamps
3. WHEN storing, THE Backend SHALL create indexes:
   - `{video_id: 1, frame_number: 1}` (primary query)
   - `{video_id: 1}` (list all frames)
   - `{created_at: 1}` with TTL 30 days
4. WHEN querying, THE Frontend SHALL be able to get single frame by video_id + frame_number
5. WHEN querying, THE Frontend SHALL be able to get all frames for a video

### Requirement 5: Backend Integration

**User Story:** As a backend developer, I want to integrate pkl parsing into the process endpoint, so that videos are processed when the user clicks "Process".

#### Acceptance Criteria

1. WHEN the user clicks "Process" button, THE Frontend SHALL POST to `/api/video/process-directory`
2. WHEN the backend receives the request, THE Backend SHALL access `/tmp/video_processing/` directory
3. WHEN the directory is accessed, THE Backend SHALL search for `.pkl` file
4. WHEN the `.pkl` file is found, THE Backend SHALL parse it to extract frame data
5. WHEN parsing completes, THE Backend SHALL store all frames in MongoDB
6. WHEN storing completes, THE Backend SHALL return success response with video_id
7. IF any step fails, THE Backend SHALL log error and return error response
8. WHEN processing completes, THE Backend SHALL NOT delete the tmp directory (user manages cleanup)

### Requirement 6: Temporal Coherence

**User Story:** As a user, I want smooth, temporally coherent pose data, so that the 3D mesh visualization doesn't jitter.

#### Acceptance Criteria

1. WHEN PHALP tracks across frames, THE system SHALL maintain smooth motion trajectories
2. WHEN a person is temporarily occluded, THE PHALP_Tracker SHALL predict their pose (ghost detection)
3. WHEN poses are returned, THE system SHALL include track ID and tracking confidence
4. WHEN the mesh is rendered, THE system SHALL show smooth motion without jitter
5. WHEN multiple people are in the video, THE PHALP_Tracker SHALL maintain separate tracklets

### Requirement 7: Performance

**User Story:** As a DevOps engineer, I want pkl parsing and MongoDB storage to complete quickly, so that the user sees results immediately after clicking "Process".

#### Acceptance Criteria

1. WHEN the user clicks "Process", THE Backend SHALL parse pkl and store frames in under 5 seconds
2. WHEN parsing completes, THE Backend SHALL return results without requiring additional HTTP calls
3. WHEN the GPU is available, THE system SHALL utilize CUDA for acceleration (during manual track.py execution)
4. WHEN processing, THE Backend SHALL NOT block other backend operations (use async/await)
5. WHEN storing frames, THE Backend SHALL use batch insert for performance

### Requirement 8: Error Handling

**User Story:** As a system architect, I want robust error handling, so that failures don't crash the backend.

#### Acceptance Criteria

1. IF directory path is invalid, THEN THE Backend SHALL return HTTP 400 with error details
2. IF `.pkl` file is not found in directory, THEN THE Backend SHALL return HTTP 400 with error message
3. IF `.pkl` parsing fails, THEN THE Backend SHALL return HTTP 500 with error details
4. IF original video file is not found, THEN THE Backend SHALL return HTTP 400 with error message
5. IF MongoDB storage fails, THEN THE Backend SHALL return HTTP 500 with error details
6. WHEN an error occurs, THE Backend SHALL log full error details for debugging
7. IF any step fails, THE Backend SHALL NOT crash the backend itself

## Architecture Comparison

### Old Architecture (Frame-by-Frame via Flask)

```
Node.js Backend
├─ Receive video upload
├─ Extract ALL frames to images (FFmpeg)
└─ For each frame:
   ├─ Convert to base64
   ├─ HTTP POST to Flask /pose/hybrid
   └─ Wait for response

Flask Wrapper
├─ Receive single frame as base64
├─ Run ViTDet detection
├─ Run HMR2 on detected person crop
└─ Return pose data

Result: 90/140 frames (36% loss), jittery motion
```

### New Architecture (Directory-Based Processing - Option 3)

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

Node.js Backend
├─ Receive POST to /api/video/process-directory
├─ Access /tmp/video_processing/ directory
├─ Read .pkl file from directory
├─ Parse pkl to extract frame data
├─ Read original video for metadata (fps, duration, resolution)
├─ Store all frames in MongoDB
└─ Return success response with video_id

MongoDB
├─ Store frames collection with mesh data
├─ Store video metadata
└─ Frontend queries for rendering

Result: 140/140 frames (0% loss), smooth motion, temporal coherence
```

## Performance Breakdown

For a 140-frame video:

| Phase | Time | Notes |
|-------|------|-------|
| Manual track.py execution | 60-120s | GPU batched processing (user runs in terminal) |
| .pkl parsing | 1-2s | Load and convert to JSON |
| Frame breakdown | 50-100ms | Extract per-frame data |
| MongoDB storage | 1-2s | Batch insert frames |
| **Backend Processing** | **~3-5s** | After user clicks "Process" |
| **Total (user perspective)** | **~65-127s** | Dominated by manual track.py execution |

**Concurrent capacity:** 1 video at a time (MVP - no queuing needed)

**Frame transformation cost:** Negligible (~0.01ms per frame)

## Success Criteria

1. Directory validation implemented and functional
2. `.pkl` file detection and parsing working
3. 100% frame coverage achieved (0 frames lost)
4. Temporal coherence verified (smooth motion in rendered mesh)
5. Output format compatible with MongoDB schema
6. Backend endpoint `/api/video/process-directory` complete
7. Error handling robust (no backend crashes)
8. Multi-person tracking produces consistent track IDs
9. Backend processing time under 5 seconds for 140-frame video
10. All frames stored in MongoDB and queryable by frontend
11. Temp directory remains intact after processing (user manages cleanup)

