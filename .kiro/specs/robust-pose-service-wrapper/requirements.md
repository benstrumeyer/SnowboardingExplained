# Requirements Document: Robust Pose Service Wrapper

## Introduction

The current pose service implementation fails on most frames (only 9/240 frames get valid pose data), resulting in incomplete pose detection. This feature implements a robust wrapper around the Python pose service that:

1. **Spawns isolated processes** for each pose detection request to prevent state corruption
2. **Manages process lifecycle** cleanly with proper input/output/error handling
3. **Implements process pooling** with a task queue to limit concurrent processes
4. **Exposes HTTP endpoints** for frame-based and batch pose detection
5. **Provides comprehensive logging and monitoring** for debugging failures

The wrapper will be a Node.js service that manages Python process spawning, handles timeouts gracefully, and provides reliable pose detection across all video frames.

## Glossary

- **Pose Service**: Python application using MediaPipe/4D-Humans for pose detection
- **Process Pool**: A managed set of worker processes with a maximum concurrency limit
- **Task Queue**: A queue of pending pose detection requests waiting for available workers
- **Frame Batch**: A collection of video frames to be processed for pose detection
- **Pose Data**: Detected keypoints, 3D joints, and confidence scores for a frame
- **Process Wrapper**: Node.js service that spawns and manages Python processes
- **Health Check**: Verification that the pose service is operational and responsive
- **Timeout**: Maximum time allowed for a single frame's pose detection before failure

## Requirements

### Requirement 1: Process Spawning and Lifecycle Management

**User Story:** As a system architect, I want isolated Python processes spawned for each pose detection request, so that failures in one frame don't corrupt state for other frames.

#### Acceptance Criteria

1. WHEN a pose detection request arrives THEN the system SHALL spawn a new Python process with the pose service code
2. WHEN a Python process completes pose detection THEN the system SHALL capture stdout/stderr and clean up the process
3. WHEN a Python process crashes or times out THEN the system SHALL terminate it and return an error response
4. WHEN a process is spawned THEN the system SHALL pass frame data via stdin or file path, not environment variables
5. WHEN a process completes THEN the system SHALL return pose data via stdout as JSON

### Requirement 2: Process Pool and Task Queue

**User Story:** As a performance engineer, I want a process pool with configurable concurrency limits, so that the system doesn't spawn unlimited processes and exhaust resources.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL initialize a process pool with a configurable maximum worker count (default: 4)
2. WHEN a pose detection request arrives and workers are available THEN the system SHALL immediately assign it to a worker
3. WHEN all workers are busy THEN the system SHALL queue the request and process it when a worker becomes available
4. WHEN a worker completes a task THEN the system SHALL mark it as available and process the next queued request
5. WHEN the queue has pending requests THEN the system SHALL process them in FIFO order
6. WHEN the system shuts down THEN the system SHALL gracefully terminate all active workers and drain the queue

### Requirement 3: HTTP Endpoints for Pose Detection

**User Story:** As a backend developer, I want HTTP endpoints to submit frames for pose detection, so that the web application can request pose data without managing processes directly.

#### Acceptance Criteria

1. WHEN a POST request arrives at `/api/pose/detect-single` with a frame image THEN the system SHALL process it through the pool and return pose data
2. WHEN a POST request arrives at `/api/pose/detect-batch` with multiple frames THEN the system SHALL queue all frames and return pose data for each
3. WHEN a frame is successfully processed THEN the system SHALL return HTTP 200 with pose data in the response body
4. WHEN a frame processing fails THEN the system SHALL return HTTP 400 with an error message describing the failure
5. WHEN the process pool is at capacity THEN the system SHALL accept requests and queue them, returning HTTP 202 (Accepted)

### Requirement 4: Input/Output Handling

**User Story:** As a reliability engineer, I want robust input/output handling for process communication, so that frame data is reliably transmitted and pose results are correctly parsed.

#### Acceptance Criteria

1. WHEN frame data is sent to a process THEN the system SHALL support both base64-encoded images and file paths
2. WHEN a process returns pose data THEN the system SHALL parse the JSON response and validate the structure
3. WHEN a process returns invalid JSON THEN the system SHALL log the raw output and return an error
4. WHEN a process writes to stderr THEN the system SHALL capture it and include it in error logs
5. WHEN frame data exceeds memory limits THEN the system SHALL reject it with a clear error message

### Requirement 5: Timeout and Error Handling

**User Story:** As a system operator, I want configurable timeouts and comprehensive error handling, so that stuck processes don't block the system and failures are clearly reported.

#### Acceptance Criteria

1. WHEN a process exceeds the timeout threshold THEN the system SHALL forcefully terminate it and return a timeout error
2. WHEN a process fails to start THEN the system SHALL log the error and return a startup failure response
3. WHEN a process crashes unexpectedly THEN the system SHALL capture the exit code and stderr, then return an error
4. WHEN multiple consecutive frames fail THEN the system SHALL log a warning and continue processing remaining frames
5. WHEN the pose service Python code is unavailable THEN the system SHALL return a clear error indicating the service is not installed

### Requirement 6: Health Checks and Monitoring

**User Story:** As an operations engineer, I want health check endpoints and process pool metrics, so that I can monitor system health and diagnose issues.

#### Acceptance Criteria

1. WHEN a GET request arrives at `/api/pose/pool-status` THEN the system SHALL return the current pool state (active workers, queued tasks, total processed)
2. WHEN a GET request arrives at `/api/pose/health` THEN the system SHALL verify the Python service is available and return status
3. WHEN the pool has queued tasks THEN the health check SHALL indicate the system is under load
4. WHEN a worker crashes THEN the system SHALL log the event and attempt to restart it
5. WHEN the system starts THEN the system SHALL log the pool configuration and initialization status

### Requirement 7: Configuration and Startup

**User Story:** As a DevOps engineer, I want configurable pool size, timeouts, and Python service paths, so that the system can be tuned for different environments.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL read configuration from environment variables (POSE_POOL_SIZE, POSE_TIMEOUT_MS, POSE_SERVICE_PATH)
2. WHEN configuration is invalid THEN the system SHALL use sensible defaults and log a warning
3. WHEN the Python service path is not found THEN the system SHALL return an error on first request
4. WHEN the system starts THEN the system SHALL verify the Python service is available before accepting requests
5. WHEN environment variables change THEN the system SHALL allow reconfiguration via an admin endpoint

### Requirement 8: Logging and Debugging

**User Story:** As a developer, I want comprehensive logging of process spawning, task queuing, and errors, so that I can debug failures and understand system behavior.

#### Acceptance Criteria

1. WHEN a process is spawned THEN the system SHALL log the process ID, frame number, and timestamp
2. WHEN a task is queued THEN the system SHALL log the queue length and estimated wait time
3. WHEN a process completes THEN the system SHALL log the processing time, keypoint count, and success status
4. WHEN an error occurs THEN the system SHALL log the error type, message, and context (frame number, process ID)
5. WHEN the system is in debug mode THEN the system SHALL log all process stdout/stderr to a file for inspection

