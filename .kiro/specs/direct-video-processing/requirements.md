# Direct Video Processing Requirements (Option 3)

## Introduction

This feature implements video-level PHALP processing by spawning `track.py` directly from the Node.js backend using subprocess, eliminating the Flask wrapper entirely. This is the simplest, fastest approach for MVP.

**Key Insight:** Skip Flask entirely. Node.js backend handles everything:
1. Saves video to disk
2. Spawns `track.py` subprocess directly
3. Parses `.pkl` output
4. Saves to MongoDB

**Benefits:**
- Simpler architecture (no Flask layer)
- Faster (no HTTP overhead)
- Less memory (no Flask process)
- Perfect for MVP (single video at a time)

**Trade-offs:**
- Less modular (harder to scale to multiple machines later)
- Node.js must handle Python subprocess management
- Can refactor to Flask later if needed

## Glossary

- **PHALP**: Probabilistic Human Appearance, Location, and Pose tracker
- **track.py**: 4D-Humans entry point that runs PHALP with HMR2 model
- **HMR2**: Human Mesh Recovery 2.0 - 3D mesh recovery model
- **Subprocess**: Node.js spawned Python process running track.py
- **Tracklet**: Continuous track of a person across multiple frames
- **Ghost_Detection**: PHALP's predicted pose when detection fails
- **SMPL**: Skinned Multi-Person Linear model - 6890 mesh vertices
- **Pickle_Output**: Binary serialized Python object (.pkl file)
- **Frame_Extraction**: Converting PHALP output to per-frame JSON
- **Mesh_Data**: 3D vertices, faces, and camera parameters per frame

## Requirements

### Requirement 1: Direct Subprocess Spawning

**User Story:** As a backend developer, I want to spawn `track.py` directly from Node.js, so that I can process videos without Flask overhead.

#### Acceptance Criteria

1. WHEN a video is ready for processing, THE Backend SHALL spawn a subprocess: `python track.py video.source=/path/to/video.mp4`
2. WHEN the subprocess is spawned, THE Backend SHALL set working directory to `/home/ben/pose-service/4D-Humans`
3. WHEN track.py is running, THE Backend SHALL capture stdout/stderr output
4. WHEN track.py completes, THE Backend SHALL check the exit code
5. IF exit code is 0, THEN THE Backend SHALL proceed to parse output
6. IF exit code is non-zero, THEN THE Backend SHALL return error with stderr message
7. IF subprocess times out (>180 seconds), THEN THE Backend SHALL terminate it and return timeout error

### Requirement 2: Pickle Output Parsing

**User Story:** As a backend developer, I want to parse PHALP's `.pkl` output into JSON, so that I can store it in MongoDB.

#### Acceptance Criteria

1. WHEN track.py completes successfully, THE Backend SHALL locate the output `.pkl` file
2. WHEN the `.pkl` file is found, THE Backend SHALL load it using Python subprocess (pickle module)
3. WHEN parsing the pickle, THE Backend SHALL extract for each frame:
   - Frame number and timestamp
   - SMPL parameters (betas, body_pose, global_orient)
   - 3D keypoints (45 joints)
   - 2D keypoints (projected from 3D)
   - Camera translation [tx, ty, tz]
   - Bounding box [x0, y0, w, h]
   - Track ID for each person
   - Detection confidence score
4. WHEN a frame contains a ghost detection, THE response SHALL include `tracking_confidence` < 1.0
5. WHEN a frame contains a direct detection, THE response SHALL include `tracking_confidence` = 1.0
6. WHEN computing mesh vertices, THE system SHALL use SMPL parameters to generate 6890 vertices
7. WHEN parsing completes, THE Backend SHALL return valid JSON (all numpy arrays converted to lists)

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

**User Story:** As a backend developer, I want to integrate video processing into the upload flow, so that videos are automatically processed.

#### Acceptance Criteria

1. WHEN a video is uploaded via `/api/finalize-upload`, THE Backend SHALL save the video file to disk
2. WHEN the video is saved, THE Backend SHALL spawn track.py subprocess
3. WHEN track.py completes, THE Backend SHALL parse the `.pkl` output
4. WHEN parsing completes, THE Backend SHALL store all frames in MongoDB
5. WHEN storing completes, THE Backend SHALL return success response with video_id
6. IF any step fails, THE Backend SHALL log error and return error response

### Requirement 6: Temporal Coherence

**User Story:** As a user, I want smooth, temporally coherent pose data, so that the 3D mesh visualization doesn't jitter.

#### Acceptance Criteria

1. WHEN PHALP tracks across frames, THE system SHALL maintain smooth motion trajectories
2. WHEN a person is temporarily occluded, THE PHALP_Tracker SHALL predict their pose (ghost detection)
3. WHEN poses are returned, THE system SHALL include track ID and tracking confidence
4. WHEN the mesh is rendered, THE system SHALL show smooth motion without jitter
5. WHEN multiple people are in the video, THE PHALP_Tracker SHALL maintain separate tracklets

### Requirement 7: Performance

**User Story:** As a DevOps engineer, I want video processing to complete in reasonable time, so that users don't wait excessively.

#### Acceptance Criteria

1. WHEN processing a 140-frame video, THE system SHALL complete in under 2 minutes with GPU
2. WHEN the first video is processed, THE system SHALL have models pre-loaded (no download delay)
3. WHEN processing completes, THE system SHALL return results without requiring additional HTTP calls
4. WHEN the GPU is available, THE system SHALL utilize CUDA for acceleration
5. WHEN processing, THE system SHALL NOT block other backend operations (use async/await)

### Requirement 8: Error Handling

**User Story:** As a system architect, I want robust error handling, so that failures don't crash the backend.

#### Acceptance Criteria

1. IF video file is invalid, THEN THE Backend SHALL return HTTP 400 with error details
2. IF subprocess times out, THEN THE Backend SHALL terminate it and return HTTP 500
3. IF subprocess crashes, THEN THE Backend SHALL NOT crash the backend itself
4. IF `.pkl` file is not found, THEN THE Backend SHALL return HTTP 500 with error
5. IF `.pkl` parsing fails, THEN THE Backend SHALL return HTTP 500 with error
6. IF MongoDB storage fails, THEN THE Backend SHALL return HTTP 500 with error
7. WHEN an error occurs, THE Backend SHALL log full error details for debugging

## Architecture Comparison

### Current Architecture (Frame-by-Frame via Flask)

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

### New Architecture (Direct Subprocess - Option 3)

```
Node.js Backend
├─ Receive video upload
├─ Save video file to disk
├─ Spawn subprocess: python track.py video.source=/path/to/video.mp4
├─ Wait for subprocess completion
├─ Parse .pkl output to JSON
├─ Store frames in MongoDB
└─ Return success response

track.py subprocess (4D-Humans)
├─ Initialize HMR2_4dhuman (extends PHALP)
├─ Call phalp_tracker.track() on entire video
├─ PHALP internally:
│  ├─ Extracts frames from video
│  ├─ Runs ViTDet detection per frame
│  ├─ Runs HMR2 on detected persons
│  ├─ Maintains tracklets with appearance/location/pose features
│  ├─ Predicts poses when detection fails (ghost detection)
│  └─ Applies temporal smoothing
└─ Output: results.pkl with all frame poses

Result: 140/140 frames (0% loss), smooth motion, temporal coherence
```

## Performance Breakdown

For a 140-frame video:

| Phase | Time | Notes |
|-------|------|-------|
| Subprocess spawn | 2-3s | Python startup + imports |
| track.py execution | 60-120s | GPU batched processing (bottleneck) |
| .pkl parsing | 1-2s | Load and convert to JSON |
| Frame breakdown | 50-100ms | Extract per-frame data |
| MongoDB storage | 1-2s | Batch insert frames |
| **Total** | **~65-127s** | Dominated by GPU processing |

**Concurrent capacity:** 1 video at a time (MVP - no queuing needed)

**Frame transformation cost:** Negligible (~0.01ms per frame)

## Success Criteria

1. Subprocess spawning implemented and functional
2. `.pkl` output parsed to JSON format
3. 100% frame coverage achieved (0 frames lost)
4. Temporal coherence verified (smooth motion in rendered mesh)
5. Output format compatible with MongoDB schema
6. Backend integration complete (finalize-upload uses direct processing)
7. Error handling robust (no backend crashes)
8. Multi-person tracking produces consistent track IDs
9. Processing time under 2 minutes for 140-frame video with GPU
10. All frames stored in MongoDB and queryable by frontend

