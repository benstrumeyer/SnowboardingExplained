# 4D-Humans with PHALP Integration Requirements

## Introduction

This feature integrates 4D-Humans (HMR2) with PHALP temporal tracking into the existing pose service architecture. The goal is to achieve 100% frame coverage (140/140 frames) instead of the current 90/140 (36% loss) by adding temporal tracking that predicts poses when HMR2 detection fails.

**Key Difference from Current Implementation:**
- **Current:** HMR2 only (per-frame detection) → 90/140 frames (36% loss)
- **New:** HMR2 + PHALP (temporal tracking) → 140/140 frames (0% loss)

The integration preserves all existing optimizations:
- Process pool with concurrency limits
- HTTP wrapper for external service
- Queue management for excess requests
- Graceful shutdown
- Monitoring and diagnostics

## Glossary

- **HMR2**: Per-frame 3D pose detector (detects ~64% of frames in snowboarding videos)
- **PHALP**: Probabilistic Human Appearance, Location, and Pose tracker (predicts poses when HMR2 fails)
- **Tracklet**: Continuous track of a person across frames maintained by PHALP
- **Motion Model**: Learned velocity, acceleration, and pose patterns used for prediction
- **Frame Loss**: Frames where HMR2 fails to detect a person (currently ~36% in snowboarding videos)
- **Temporal Tracking**: Using information from previous frames to predict current frame
- **4D-Humans**: Complete system combining HMR2 + PHALP for robust pose detection
- **Flask Wrapper**: HTTP server on WSL that wraps 4D-Humans and exposes `/pose/hybrid` endpoint
- **WSL Service**: Python service running on Windows Subsystem for Linux

## Requirements

### Requirement 1: Clone 4D-Humans on WSL

**User Story:** As a DevOps engineer, I want to clone the 4D-Humans repository on WSL, so that I have access to the complete 4D-Humans + PHALP codebase.

#### Acceptance Criteria

1. WHEN the setup begins, THE system SHALL clone 4D-Humans from GitHub to `/home/ben/pose-service/4D-Humans`
2. WHEN cloning completes, THE system SHALL verify the repository structure (hmr2/, phalp/, track.py, etc.)
3. WHEN the repository is cloned, THE system SHALL contain the complete 4D-Humans codebase with all modules
4. WHERE the clone fails, THE system SHALL provide clear error messages and recovery instructions
5. WHEN the repository is ready, THE system SHALL be ready for dependency installation

### Requirement 2: Install 4D-Humans Dependencies

**User Story:** As a DevOps engineer, I want to install all 4D-Humans dependencies including PHALP, so that the system has everything needed for temporal tracking.

#### Acceptance Criteria

1. WHEN dependencies are installed, THE system SHALL install PyTorch with CUDA support
2. WHEN dependencies are installed, THE system SHALL install 4D-Humans requirements (from requirements.txt)
3. WHEN dependencies are installed, THE system SHALL install PHALP from GitHub
4. WHEN PHALP is installed, THE system SHALL verify the installation by importing PHALP modules
5. WHEN all dependencies are installed, THE system SHALL be ready to download models
6. WHERE installation fails, THE system SHALL provide clear error messages and recovery instructions

### Requirement 3: Download and Cache 4D-Humans Models

**User Story:** As a DevOps engineer, I want to pre-download and cache 4D-Humans models, so that the first request doesn't have to wait for model downloads.

#### Acceptance Criteria

1. WHEN models are downloaded, THE system SHALL download HMR2 model (~500MB) to cache
2. WHEN models are downloaded, THE system SHALL download ViTPose model (~100MB) to cache
3. WHEN models are cached, THE system SHALL store them in `/home/ben/pose-service/4D-Humans/.models/`
4. WHEN models are cached, THE system SHALL verify model integrity (checksums or file sizes)
5. WHEN models are ready, THE system SHALL be ready for Flask wrapper creation
6. WHERE downloads fail, THE system SHALL provide clear error messages and recovery instructions

### Requirement 4: Create Flask HTTP Wrapper

**User Story:** As a backend developer, I want a Flask HTTP wrapper that exposes 4D-Humans + PHALP via HTTP, so that my Node.js backend can call it without spawning processes.

#### Acceptance Criteria

1. WHEN the Flask wrapper starts, THE system SHALL load HMR2 model into memory
2. WHEN the Flask wrapper starts, THE system SHALL load PHALP tracker into memory
3. WHEN a POST request arrives at `/pose/hybrid`, THE system SHALL accept frame data as base64 JSON
4. WHEN a frame is processed, THE system SHALL run HMR2 detection on the frame
5. WHEN HMR2 detection completes, THE system SHALL pass the result to PHALP for temporal tracking
6. WHEN PHALP tracking completes, THE system SHALL return pose data including:
   - Keypoints (2D and 3D)
   - Joint angles
   - Mesh vertices and faces
   - Camera translation
   - Tracking confidence
7. WHEN a request completes, THE system SHALL return HTTP 200 with pose data as JSON
8. WHEN an error occurs, THE system SHALL return HTTP 500 with error details
9. WHEN the `/health` endpoint is called, THE system SHALL return model loading status

### Requirement 5: Preserve Existing Process Pool Architecture

**User Story:** As a system architect, I want the new 4D-Humans service to work with the existing process pool, so that I don't have to rewrite the pool management code.

#### Acceptance Criteria

1. WHEN the Flask wrapper is running, THE system SHALL accept HTTP requests from the existing HTTP wrapper
2. WHEN the HTTP wrapper calls `/pose/hybrid`, THE system SHALL process the request and return results
3. WHEN the process pool queues requests, THE system SHALL handle them in FIFO order
4. WHEN the process pool limits concurrency, THE system SHALL respect the `maxConcurrentProcesses` setting
5. WHEN the pool is at capacity, THE system SHALL queue excess requests without errors
6. WHEN a request completes, THE system SHALL process the next queued request
7. WHEN the pool shuts down, THE system SHALL gracefully close the Flask connection

### Requirement 6: Achieve 100% Frame Coverage

**User Story:** As a product manager, I want the system to process all 140 frames from a video, so that users see complete pose data without gaps.

#### Acceptance Criteria

1. WHEN a 140-frame video is uploaded, THE system SHALL process all 140 frames
2. WHEN HMR2 fails on a frame, THE system SHALL use PHALP to predict the pose
3. WHEN PHALP predicts a pose, THE system SHALL include a `trackingConfidence` score
4. WHEN all frames are processed, THE system SHALL return 140 pose results (0 frames lost)
5. WHEN frames are stored in the database, THE system SHALL store all 140 frames
6. WHERE frame loss occurs, THE system SHALL log which frames were lost and why

### Requirement 7: Maintain Temporal Coherence

**User Story:** As a user, I want smooth, temporally coherent pose data, so that the 3D visualization doesn't jitter or jump between frames.

#### Acceptance Criteria

1. WHEN PHALP tracks across frames, THE system SHALL maintain smooth motion trajectories
2. WHEN a pose is predicted, THE system SHALL use motion models to ensure smooth transitions
3. WHEN poses are returned, THE system SHALL include temporal consistency information
4. WHEN the mesh is rendered, THE system SHALL show smooth motion without jitter
5. WHERE temporal coherence is broken, THE system SHALL log the issue and confidence scores

### Requirement 8: Backward Compatibility

**User Story:** As a backend developer, I want the new service to be a drop-in replacement, so that I don't have to change any backend code.

#### Acceptance Criteria

1. WHEN the Flask wrapper is running, THE system SHALL accept the same HTTP request format as before
2. WHEN a request is processed, THE system SHALL return the same JSON response format as before
3. WHEN the backend calls `/pose/hybrid`, THE system SHALL work without any code changes
4. WHEN the process pool calls the HTTP wrapper, THE system SHALL work without any code changes
5. WHERE the response format differs, THE system SHALL map fields to maintain compatibility

### Requirement 9: Performance Optimization

**User Story:** As a DevOps engineer, I want the service to process frames efficiently, so that videos are processed in reasonable time.

#### Acceptance Criteria

1. WHEN a frame is processed, THE system SHALL complete in <500ms (with GPU)
2. WHEN the first frame is processed, THE system SHALL load models from cache (not download)
3. WHEN multiple frames are queued, THE system SHALL process them sequentially without memory issues
4. WHEN the GPU is used, THE system SHALL achieve ~100-250ms per frame
5. WHEN the CPU is used, THE system SHALL achieve ~2-5 seconds per frame
6. WHERE performance degrades, THE system SHALL log GPU/CPU usage and memory

### Requirement 10: Monitoring and Diagnostics

**User Story:** As an operations engineer, I want to monitor the Flask service health, so that I can detect issues early.

#### Acceptance Criteria

1. WHEN the `/health` endpoint is called, THE system SHALL return model loading status
2. WHEN the service is running, THE system SHALL log frame processing times
3. WHEN PHALP makes predictions, THE system SHALL log confidence scores
4. WHEN errors occur, THE system SHALL log detailed error information
5. WHERE diagnostics are enabled, THE system SHALL provide detailed logging

## Testing Strategy

### Unit Tests
- Flask endpoint accepts valid requests
- Flask endpoint rejects invalid requests
- HMR2 detection works on sample frames
- PHALP tracking works on frame sequences
- Response format matches expected JSON schema

### Integration Tests
- End-to-end: Flask wrapper processes frames and returns pose data
- Process pool: HTTP wrapper queues and processes requests
- Temporal tracking: PHALP predicts poses when HMR2 fails
- Frame coverage: All 140 frames are processed (0 frames lost)
- Backward compatibility: Response format matches existing format

### Acceptance Tests
- Upload 140-frame video and verify all frames are processed
- Verify frame coverage is 100% (140/140)
- Verify temporal coherence (smooth motion)
- Verify performance (frames processed in <500ms with GPU)
- Verify backward compatibility (no backend code changes needed)

## Success Criteria

1. 4D-Humans is cloned on WSL at `/home/ben/pose-service/4D-Humans`
2. All dependencies including PHALP are installed
3. Models are downloaded and cached
4. Flask wrapper exposes `/pose/hybrid` endpoint
5. Flask wrapper loads HMR2 and PHALP models
6. Flask wrapper processes frames and returns pose data
7. Process pool works with Flask wrapper (no code changes)
8. 140-frame video results in 140 pose results (0 frames lost)
9. Temporal coherence is maintained (smooth motion)
10. Performance is acceptable (<500ms per frame with GPU)
11. Backward compatibility is maintained (same response format)
12. Monitoring and diagnostics work

## Difference from Current Implementation

### Current State (HMR2 Only)

```
Video: 140 frames
├─ Frame 0 → HMR2 → Detected ✓
├─ Frame 1 → HMR2 → Detected ✓
├─ Frame 2 → HMR2 → Failed ✗ (LOST)
├─ Frame 3 → HMR2 → Detected ✓
└─ ... (50 frames lost total)

Result: 90 frames extracted, 50 frames lost (36% loss)
```

### New State (HMR2 + PHALP)

```
Video: 140 frames
├─ Frame 0 → HMR2 → Detected ✓ → PHALP Tracklet
├─ Frame 1 → HMR2 → Detected ✓ → PHALP Tracklet
├─ Frame 2 → HMR2 → Failed ✗ → PHALP Predicts ✓
├─ Frame 3 → HMR2 → Detected ✓ → PHALP Tracklet
└─ ... (all 140 frames have pose data)

Result: 140 frames extracted, 0 frames lost (0% loss)
```

### Architecture Preservation

**What Stays the Same:**
- Process pool with concurrency limits
- HTTP wrapper for external service
- Queue management for excess requests
- Graceful shutdown
- Monitoring and diagnostics
- Response format (backward compatible)

**What Changes:**
- Flask wrapper now uses 4D-Humans + PHALP instead of just HMR2
- Frame coverage increases from 90/140 to 140/140
- Temporal coherence improves (smooth motion)
- Tracking confidence scores are included

## Implementation Notes

1. **No Backend Changes Required**: The Flask wrapper is a drop-in replacement. The backend code doesn't need to change.

2. **Process Pool Compatibility**: The existing `ProcessPoolManager` and `PoseServiceHttpWrapper` work with the new Flask wrapper without modification.

3. **Temporal Tracking**: PHALP maintains tracklets across frames, so it needs to process frames sequentially (not in parallel). The process pool handles this by processing one request at a time.

4. **Model Caching**: Models are cached on first download, so subsequent requests are fast (~250ms per frame with GPU).

5. **Backward Compatibility**: The response format is the same, so the backend doesn't need to change.

6. **Performance**: With GPU, expect ~100-250ms per frame. With CPU, expect ~2-5 seconds per frame.

