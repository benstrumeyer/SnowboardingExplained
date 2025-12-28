# PHALP Video-Level Processing Requirements

## Introduction

This feature replaces the current frame-by-frame HTTP pose extraction with PHALP's video-level processing by calling `track.py` as a subprocess. The current implementation sends individual frames via HTTP, which:

1. **Doesn't use PHALP** - PHALP is installed but never called
2. **Loses temporal context** - Each frame processed independently
3. **Results in frame loss** - ~36% of frames lost when HMR2 fails
4. **Produces jittery motion** - No temporal smoothing

PHALP's `track()` method processes entire videos at once:
- Maintains tracklets (continuous person tracks) across frames
- Predicts poses when detection fails (ghost detection)
- Applies temporal smoothing for smooth motion
- Achieves 100% frame coverage

**Architecture Change:**
- **Current:** Node.js extracts frames → HTTP POST each frame → Flask runs HMR2 per-frame
- **New:** Node.js saves video → HTTP POST video path → Flask spawns `track.py` subprocess → parses .pkl output → returns JSON

## Glossary

- **PHALP**: Probabilistic Human Appearance, Location, and Pose tracker - processes entire videos for temporal tracking
- **track.py**: 4D-Humans entry point that runs PHALP with HMR2 model
- **HMR2**: Human Mesh Recovery 2.0 - 3D mesh recovery model outputting SMPL parameters and keypoints
- **Subprocess**: Spawned Python process running track.py independently from Flask
- **Tracklet**: Continuous track of a person across multiple frames maintained by PHALP
- **Ghost_Detection**: PHALP's predicted pose when detection fails on a frame
- **SMPL**: Skinned Multi-Person Linear model - parametric body model with 6890 mesh vertices
- **Flask_Wrapper**: Python HTTP server on WSL that spawns track.py subprocesses
- **Output_Parsing**: Converting PHALP's .pkl output to JSON format for MongoDB storage
- **Frame_Breakdown**: Extracting per-frame pose data from PHALP output for Three.js rendering

## Requirements

### Requirement 1: Video-Level Endpoint

**User Story:** As a backend developer, I want a new endpoint that accepts a video file path and processes it with PHALP, so that I get temporally coherent pose data for all frames.

#### Acceptance Criteria

1. WHEN a POST request arrives at `/pose/video`, THE Flask_Wrapper SHALL accept a JSON body containing `video_path`
2. WHEN the video path is valid, THE Flask_Wrapper SHALL spawn a subprocess running `track.py` with the video path
3. WHEN track.py completes, THE Flask_Wrapper SHALL parse the output .pkl file
4. WHEN parsing completes, THE Flask_Wrapper SHALL return a JSON response containing pose data for ALL frames
5. WHEN the video contains N frames, THE response SHALL contain exactly N frame results (0% frame loss)
6. IF the video path is invalid, THEN THE Flask_Wrapper SHALL return HTTP 400 with error details
7. IF track.py subprocess fails, THEN THE Flask_Wrapper SHALL return HTTP 500 with error details

### Requirement 2: Subprocess Management

**User Story:** As a system architect, I want the Flask wrapper to safely spawn and manage track.py subprocesses, so that multiple videos can be queued without crashing Flask.

#### Acceptance Criteria

1. WHEN a video processing request arrives, THE Flask_Wrapper SHALL spawn track.py as a separate subprocess
2. WHEN track.py is running, THE Flask_Wrapper SHALL monitor the subprocess for completion
3. WHEN the subprocess completes, THE Flask_Wrapper SHALL capture the exit code and output
4. IF the subprocess times out (>180 seconds), THEN THE Flask_Wrapper SHALL terminate it and return error
5. IF the subprocess crashes, THEN THE Flask_Wrapper SHALL NOT crash Flask itself
6. WHEN multiple requests arrive, THE Flask_Wrapper SHALL queue them and process sequentially (GPU bottleneck)
7. WHEN a request is queued, THE Backend SHALL receive a 202 Accepted response with a job ID

### Requirement 3: Output Parsing

**User Story:** As a backend developer, I want the Flask wrapper to parse PHALP's .pkl output into JSON, so that I can store it in MongoDB without additional transformation.

#### Acceptance Criteria

1. WHEN track.py completes, THE Flask_Wrapper SHALL load the output .pkl file
2. WHEN parsing the .pkl, THE system SHALL extract for each frame:
   - Frame number and timestamp
   - SMPL parameters (betas, body_pose, global_orient)
   - 3D keypoints (45 joints)
   - 2D keypoints (projected from 3D)
   - Camera translation [tx, ty, tz]
   - Bounding box [x0, y0, w, h]
   - Track ID for each person
   - Detection confidence score
3. WHEN a frame contains a ghost detection (predicted pose), THE response SHALL include `tracking_confidence` < 1.0
4. WHEN a frame contains a direct detection, THE response SHALL include `tracking_confidence` = 1.0
5. WHEN computing mesh vertices, THE system SHALL use SMPL parameters to generate 6890 vertices
6. WHEN the response is ready, THE Flask_Wrapper SHALL return valid JSON (not pickle)

### Requirement 4: Frame-by-Frame Breakdown

**User Story:** As a frontend developer, I want pose data broken down frame-by-frame, so that I can render each frame in Three.js without additional processing.

#### Acceptance Criteria

1. WHEN the JSON response is received, THE Backend SHALL iterate through each frame
2. FOR each frame, THE Backend SHALL extract keypoints, mesh vertices, and camera parameters
3. FOR each frame, THE Backend SHALL store in MongoDB with frame number as key
4. WHEN storing, THE Backend SHALL maintain track IDs for multi-person videos
5. WHEN rendering, THE Frontend SHALL be able to query pose data by frame number
6. WHEN rendering, THE Frontend SHALL have all data needed for Three.js mesh rendering (no additional API calls)

### Requirement 5: Backend Integration

**User Story:** As a backend developer, I want to modify the video upload flow to use the new video-level endpoint, so that I get better pose results.

#### Acceptance Criteria

1. WHEN a video is uploaded via `/api/finalize-upload`, THE Backend SHALL save the video file to disk
2. WHEN the video is saved, THE Backend SHALL call the new `/pose/video` endpoint with the video file path
3. WHEN the pose response is received, THE Backend SHALL store all frame data in MongoDB
4. WHEN storing frames, THE Backend SHALL NOT extract frames to images (track.py handles this)
5. WHEN the video-level endpoint is unavailable, THE Backend SHALL fall back to the existing frame-by-frame processing

### Requirement 6: Temporal Coherence

**User Story:** As a user, I want smooth, temporally coherent pose data, so that the 3D mesh visualization doesn't jitter.

#### Acceptance Criteria

1. WHEN PHALP tracks across frames, THE system SHALL maintain smooth motion trajectories
2. WHEN a person is temporarily occluded, THE PHALP_Tracker SHALL predict their pose (ghost detection)
3. WHEN poses are returned, THE system SHALL include track ID and tracking confidence for temporal consistency
4. WHEN the mesh is rendered, THE system SHALL show smooth motion without jitter between consecutive frames
5. WHEN multiple people are in the video, THE PHALP_Tracker SHALL maintain separate tracklets for each person

### Requirement 7: Performance

**User Story:** As a DevOps engineer, I want video processing to complete in reasonable time, so that users don't wait excessively.

#### Acceptance Criteria

1. WHEN processing a 140-frame video, THE system SHALL complete in under 2 minutes with GPU
2. WHEN the first video is processed, THE system SHALL have models pre-loaded (no download delay)
3. WHEN processing completes, THE system SHALL return results without requiring additional HTTP calls
4. WHEN the GPU is available, THE system SHALL utilize CUDA for acceleration
5. WHEN multiple videos are queued, THE system SHALL process them sequentially (GPU memory limited)

### Requirement 8: Backward Compatibility

**User Story:** As a system architect, I want to maintain the existing frame-by-frame endpoint for debugging, so that we have a fallback.

#### Acceptance Criteria

1. WHEN the Flask_Wrapper starts, THE system SHALL expose both `/pose/hybrid` (frame-level) and `/pose/video` (video-level) endpoints
2. WHEN `/pose/hybrid` is called, THE system SHALL process the single frame as before
3. WHEN the video-level endpoint fails, THE Backend SHALL be able to fall back to frame-by-frame processing
4. WHEN debugging, THE developer SHALL be able to use either endpoint independently

## Architecture Comparison

### Current Architecture (Frame-by-Frame)

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
   (PHALP is initialized but track() is NEVER called!)

Result: 90/140 frames (36% loss), jittery motion, no temporal coherence
```

### New Architecture (Video-Level with Subprocess)

```
Node.js Backend
├─ Receive video upload
├─ Save video file to disk
└─ HTTP POST to Flask /pose/video with video_path

Flask Wrapper
├─ Receive video file path
├─ Spawn subprocess: python track.py video.source=/path/to/video.mp4
├─ Monitor subprocess until completion
├─ Load output .pkl file
├─ Parse .pkl to JSON format
└─ Return all frame poses in single response

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
| **Total** | **~65-127s** | Dominated by GPU processing |

**Concurrent capacity:** 1-2 videos (GPU memory limited to ~8-10GB)

**Frame transformation cost:** Negligible (~0.01ms per frame)

## Success Criteria

1. `/pose/video` endpoint implemented and functional
2. Flask wrapper successfully spawns track.py subprocess
3. .pkl output parsed to JSON format
4. 100% frame coverage achieved (0 frames lost)
5. Temporal coherence verified (smooth motion in rendered mesh)
6. Output format compatible with existing MongoDB schema
7. Backend integration complete (finalize-upload uses video-level endpoint)
8. Fallback to frame-by-frame processing works when needed
9. Multi-person tracking produces consistent track IDs
10. Processing time under 2 minutes for 140-frame video with GPU
