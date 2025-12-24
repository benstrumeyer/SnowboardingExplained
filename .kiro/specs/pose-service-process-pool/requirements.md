# Pose Service Process Pool Requirements

## Introduction

This feature implements a robust, scalable pose detection service that spawns isolated Python processes for each request. The service manages a process pool with configurable concurrency limits, handles process lifecycle (startup, execution, cleanup), and exposes a clean HTTP API for pose detection. Each request gets its own fresh Python process, ensuring memory isolation and crash resilience.

## Glossary

- **Pose Service**: Python application that runs 4DHumans (HMR2) and ViTPose models for pose detection
- **Process Pool**: Manager that spawns and tracks Python processes, enforcing concurrency limits
- **PoseServiceExecWrapper**: TypeScript service that spawns Python processes and manages their I/O
- **Frame**: Image data (either as bytes or file path) to be processed for pose detection
- **Pose Data**: Output from 4DHumans including 3D joints, confidence scores, angles, and mesh vertices
- **Task Queue**: Background queue that buffers requests when process pool is at capacity
- **Process Isolation**: Each request runs in its own Python process with separate memory space
- **Graceful Shutdown**: Proper cleanup of processes, temp files, and resources

## Requirements

### Requirement 1: Python Pose Service Preparation

**User Story:** As a DevOps engineer, I want a self-contained Python application folder with all dependencies and models pre-installed, so that I can deploy it to any Linux environment without additional setup.

#### Acceptance Criteria

1. WHEN the pose service folder is prepared, THE system SHALL include a `requirements.txt` with all Python dependencies
2. WHEN dependencies are installed, THE system SHALL download and cache 4DHumans (HMR2) model weights (~500MB)
3. WHEN dependencies are installed, THE system SHALL download and cache ViTPose model weights (~100MB)
4. WHEN the folder is ready, THE system SHALL include a setup script that installs all dependencies in one command
5. WHEN the setup script runs, THE system SHALL verify model downloads and report success/failure
6. WHERE models are cached, THE system SHALL store them in a `.models` directory within the service folder
7. WHEN the service starts, THE system SHALL load models into memory once and reuse them for all requests

### Requirement 2: Process Execution Wrapper

**User Story:** As a backend developer, I want a TypeScript service that spawns Python processes and manages their lifecycle, so that I can invoke pose detection without worrying about process management.

#### Acceptance Criteria

1. WHEN `PoseServiceExecWrapper.getPoseInfo(frames)` is called, THE system SHALL spawn a new Python process
2. WHEN a process is spawned, THE system SHALL pass frame data via stdin (JSON format)
3. WHEN the process completes, THE system SHALL read pose data from stdout (JSON format)
4. WHEN a process crashes or times out, THE system SHALL kill it and return an error
5. WHEN a process finishes, THE system SHALL clean up all temporary files and resources
6. WHEN a process is killed, THE system SHALL ensure no zombie processes remain
7. WHERE process execution fails, THE system SHALL log the error with full context (stderr, exit code, timeout)
8. WHEN multiple processes are spawned, THE system SHALL track them and enforce cleanup on application exit

### Requirement 3: Process Pool Management

**User Story:** As a system architect, I want a process pool that limits concurrent processes and queues excess requests, so that the system doesn't overwhelm the GPU or memory.

#### Acceptance Criteria

1. WHEN the pool is initialized, THE system SHALL accept a `maxConcurrentProcesses` configuration (default: 2)
2. WHEN a request arrives and pool is at capacity, THE system SHALL queue it in a background task queue
3. WHEN a process completes, THE system SHALL dequeue the next request and spawn a new process
4. WHEN the queue has pending requests, THE system SHALL process them in FIFO order
5. WHEN a request is queued, THE system SHALL return a promise that resolves when processing completes
6. WHERE the queue is full, THE system SHALL reject new requests with a clear error message
7. WHEN the pool is shutting down, THE system SHALL wait for all in-flight processes to complete
8. WHERE pool metrics are requested, THE system SHALL return: active processes, queued requests, total processed

### Requirement 4: HTTP API Endpoint

**User Story:** As a frontend developer, I want a clean HTTP endpoint that accepts frames and returns pose data, so that I can integrate pose detection into my application.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/pose/detect`, THE system SHALL accept frame data
2. WHEN frames are provided as file paths, THE system SHALL read them from disk
3. WHEN frames are provided as base64-encoded bytes, THE system SHALL decode them
4. WHEN frames are processed, THE system SHALL return pose data in JSON format
5. WHEN processing completes, THE system SHALL return HTTP 200 with pose results
6. WHEN an error occurs, THE system SHALL return HTTP 400/500 with error details
7. WHERE the request is invalid, THE system SHALL validate input and return clear error messages
8. WHEN multiple frames are provided, THE system SHALL process them sequentially or in batch (configurable)

### Requirement 5: Process Isolation and Crash Resilience

**User Story:** As a reliability engineer, I want each request to run in its own process, so that a crash in one request doesn't affect others.

#### Acceptance Criteria

1. WHEN a request is processed, THE system SHALL spawn a fresh Python process for that request only
2. WHEN a process crashes, THE system SHALL catch the error and return a failure response
3. WHEN a process crashes, THE system SHALL NOT affect other in-flight processes
4. WHEN a process times out, THE system SHALL kill it and return a timeout error
5. WHEN a process is killed, THE system SHALL ensure all child processes are also terminated
6. WHERE a process crashes, THE system SHALL log the crash with full traceback
7. WHEN the pool recovers from a crash, THE system SHALL continue processing subsequent requests

### Requirement 6: Configuration and Deployment

**User Story:** As a DevOps engineer, I want to configure the service via environment variables, so that I can deploy it to different environments without code changes.

#### Acceptance Criteria

1. WHEN the service starts, THE system SHALL read configuration from environment variables
2. WHEN `POSE_SERVICE_PATH` is set, THE system SHALL use that as the Python service folder
3. WHEN `MAX_CONCURRENT_PROCESSES` is set, THE system SHALL limit concurrent processes to that value
4. WHEN `PROCESS_TIMEOUT_MS` is set, THE system SHALL kill processes that exceed that timeout
5. WHEN `QUEUE_MAX_SIZE` is set, THE system SHALL reject requests if queue exceeds that size
6. WHERE configuration is invalid, THE system SHALL log warnings and use sensible defaults
7. WHEN the service starts, THE system SHALL verify the Python service folder exists and is readable

### Requirement 7: Monitoring and Diagnostics

**User Story:** As an operations engineer, I want to monitor the process pool health, so that I can detect issues and scale appropriately.

#### Acceptance Criteria

1. WHEN `/api/pose/health` is called, THE system SHALL return pool status (active processes, queue size, uptime)
2. WHEN `/api/pose/metrics` is called, THE system SHALL return performance metrics (avg processing time, success rate)
3. WHEN a process fails, THE system SHALL increment failure counter and log the error
4. WHERE diagnostics are enabled, THE system SHALL log detailed information about each process lifecycle
5. WHEN the pool is under heavy load, THE system SHALL log warnings about queue buildup

### Requirement 8: Graceful Shutdown

**User Story:** As a DevOps engineer, I want the service to shut down gracefully, so that in-flight requests complete before the process terminates.

#### Acceptance Criteria

1. WHEN a shutdown signal is received, THE system SHALL stop accepting new requests
2. WHEN shutdown begins, THE system SHALL wait for all in-flight processes to complete (with timeout)
3. WHEN the timeout is exceeded, THE system SHALL force-kill remaining processes
4. WHEN shutdown completes, THE system SHALL clean up all temporary files and resources
5. WHERE processes are force-killed, THE system SHALL log which processes were terminated

## Testing Strategy

### Unit Tests
- Process spawning and cleanup
- Input/output serialization (JSON)
- Error handling (crashes, timeouts)
- Pool capacity enforcement
- Queue FIFO ordering

### Integration Tests
- End-to-end pose detection (Python service + wrapper)
- Process pool under load (multiple concurrent requests)
- Queue behavior (requests queued and processed in order)
- Crash recovery (process crashes don't affect others)
- Graceful shutdown (in-flight requests complete)

### Acceptance Tests
- HTTP endpoint accepts frames and returns pose data
- Process isolation (crashes don't affect other requests)
- Pool limits concurrent processes to configured max
- Queue buffers excess requests
- Metrics endpoint reports accurate pool status

## Success Criteria

1. Each HTTP request spawns its own Python process
2. Process pool enforces concurrency limits
3. Excess requests are queued and processed in order
4. Process crashes don't affect other requests
5. HTTP endpoint accepts frames (file paths or base64) and returns pose data
6. Service can be deployed to Linux with one setup command
7. Graceful shutdown completes in-flight requests
8. Monitoring endpoints provide pool health and metrics
