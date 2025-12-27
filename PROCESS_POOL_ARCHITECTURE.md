# Process Pool Architecture - Complete Flow

## Overview
The pose detection system uses a process pool to handle concurrent frame processing with resource limits. This document explains the complete architecture and how all components work together.

## Architecture Diagram

```
HTTP Request (31 frames)
    ↓
/api/upload-video-with-pose
    ↓
Extract frames from video
    ↓
Create 31 frame objects with base64 data
    ↓
Promise.all([
  poolManager.processRequest([frame0]),
  poolManager.processRequest([frame1]),
  ...
  poolManager.processRequest([frame30])
])
    ↓
ProcessPoolManager
├─ Active Processes: 0/2
├─ Queue: [frame0, frame1, ..., frame30]
    ↓
    ├─ Spawn Process 1 (frame0)
    │  └─ Wait 50ms (backpressure)
    │
    ├─ Spawn Process 2 (frame1)
    │  └─ Wait 50ms (backpressure)
    │
    ├─ Queue: [frame2, frame3, ..., frame30]
    │
    └─ When Process 1 finishes:
       ├─ Spawn Process 1 (frame2)
       └─ Continue until queue empty
    ↓
PoseServiceExecWrapper (per process)
├─ Enforce 50ms spawn interval
├─ Spawn Python process
├─ Write frame data to stdin
├─ Read pose results from stdout
└─ Handle errors and cleanup
    ↓
Python Process (app.py)
├─ Load models (once per process)
├─ Read frame from stdin
├─ Detect pose using HMR2
├─ Output JSON to stdout
└─ Exit
    ↓
Results collected and stored in MongoDB
```

## Component Details

### 1. HTTP Endpoint: `/api/upload-video-with-pose`
**File:** `SnowboardingExplained/backend/src/server.ts`

Responsibilities:
- Extract frames from video file
- Convert frames to base64
- Create frame objects with metadata
- Submit all frames to process pool via `Promise.all()`
- Collect results and store in MongoDB

Key code:
```typescript
const framePromises = framesToProcess.map(frameData =>
  poolManager!.processRequest([frameData])  // One frame per request
    .then(results => { /* process result */ })
    .catch(err => { /* handle error */ })
);

const results = await Promise.all(framePromises);
```

### 2. ProcessPoolManager
**File:** `SnowboardingExplained/backend/src/services/processPoolManager.ts`

Responsibilities:
- Maintain queue of pending requests
- Limit concurrent processes (default: 2)
- Spawn new processes as capacity becomes available
- Track statistics (active, queued, processed, errors)

Key features:
- `maxConcurrentProcesses`: Limits parallel processes
- `queueMaxSize`: Prevents unbounded queue growth
- Automatic queue processing when processes finish
- Graceful shutdown with timeout

Flow:
```
processRequest(frames)
  ├─ If activeProcesses < maxConcurrentProcesses:
  │  └─ Spawn immediately via _spawnAndProcess()
  │
  └─ Else:
     └─ Queue request, wait for capacity
```

### 3. PoseServiceExecWrapper
**File:** `SnowboardingExplained/backend/src/services/poseServiceExecWrapper.ts`

Responsibilities:
- Spawn isolated Python process
- Write frame data to stdin
- Read pose results from stdout
- Handle errors and timeouts
- Enforce spawn interval backpressure

Key features:
- `MIN_SPAWN_INTERVAL_MS`: 50ms between spawns (backpressure)
- Tracks stdin write errors separately
- Timeout handling (default: 120s)
- Comprehensive error logging

Flow:
```
getPoseInfo(frames)
  ├─ Enforce 50ms spawn interval
  ├─ Spawn Python process
  ├─ Write JSON to stdin
  ├─ Collect stdout/stderr
  ├─ Wait for process close
  ├─ Parse JSON output
  └─ Return results or error
```

### 4. Python Process: `app.py`
**File:** `SnowboardingExplained/pose-service/app.py`

Responsibilities:
- Load pose detection models
- Read frame data from stdin
- Detect pose using HMR2
- Output results as JSON to stdout
- Handle errors gracefully

Key features:
- Robust stdin error handling
- Per-frame error handling (one frame error doesn't crash process)
- Timing information for each frame
- Proper exit codes

Flow:
```
main()
  ├─ Load PoseDetector (models cached)
  ├─ Read JSON from stdin
  ├─ For each frame:
  │  ├─ Decode base64 or load from file
  │  ├─ Detect pose
  │  └─ Collect result
  ├─ Write JSON array to stdout
  └─ Exit with code 0 (or 1 on error)
```

## Data Flow: 31 Frames Example

### Timeline
```
T=0ms:    HTTP request arrives with 31 frames
T=0ms:    Promise.all() submits 31 requests to pool
T=0ms:    Pool spawns Process 1 (frame 0)
T=50ms:   Pool spawns Process 2 (frame 1)
T=100ms:  Queue has 29 frames waiting
T=2600ms: Process 1 finishes (frame 0 took 2.6s)
T=2600ms: Pool spawns Process 1 (frame 2)
T=2650ms: Process 2 finishes (frame 1 took 2.6s)
T=2650ms: Pool spawns Process 2 (frame 3)
...
T=~82s:   All 31 frames processed (31 × 2.6s ÷ 2 processes)
```

### Concurrency Pattern
```
Time    Process 1       Process 2       Queue Size
0ms     frame 0         frame 1         29
50ms    frame 0         frame 1         29
2600ms  frame 2         frame 1         28
2650ms  frame 2         frame 3         27
5200ms  frame 4         frame 3         26
...
```

## Configuration

### Pool Config
**File:** `SnowboardingExplained/backend/src/services/posePoolConfig.ts`

```typescript
const posePoolConfig: PoolConfig = {
  pythonServicePath: path.join(__dirname, '../../pose-service'),
  maxConcurrentProcesses: 2,      // Limit to 2 parallel processes
  queueMaxSize: 100,              // Max 100 queued requests
  processTimeoutMs: 120000,       // 120 second timeout per process
  debug: false                    // Set to true for verbose logging
};
```

### Tuning Parameters

**maxConcurrentProcesses:**
- Default: 2
- Increase for more parallelization (uses more memory)
- Decrease to reduce resource usage
- Optimal depends on system RAM and GPU availability

**MIN_SPAWN_INTERVAL_MS:**
- Default: 50ms
- Increase if still getting stdin errors
- Decrease for faster throughput (if system can handle it)
- Currently hardcoded in wrapper, can be made configurable

**processTimeoutMs:**
- Default: 120s
- Increase for slower systems or complex poses
- Decrease to fail faster on hung processes

## Error Handling

### stdin Write Errors
- Tracked separately in wrapper
- Logged with error code
- Causes process to be rejected
- Triggers retry at HTTP level (if implemented)

### Process Crashes
- Detected via non-zero exit code
- stderr captured and logged
- Results in error response to client

### Timeout
- Process killed after 120s
- Error returned to client
- Queue continues processing

### JSON Parse Errors
- Python app: exits with code 1, error to stderr
- Wrapper: detects exit code, rejects promise

## Performance Characteristics

### Throughput
- Single frame: ~2.6 seconds
- 31 frames with 2 processes: ~42 seconds (31 × 2.6 ÷ 2)
- Overhead from spawn interval: ~1.5 seconds (50ms × 31)

### Resource Usage
- Per process: ~2-3 GB RAM (for model loading)
- With 2 processes: ~4-6 GB RAM
- CPU: ~80-100% per process (GPU-accelerated)

### Scalability
- Queue can hold up to 100 requests
- Processes spawn on-demand
- No memory leaks (processes exit after each frame)
- Graceful degradation under load

## Monitoring

### Logs to Watch
```
[UPLOAD] Submitting 31 frames to process pool
[UPLOAD] Successfully processed 31/31 frames with pose data
ProcessPoolManager initialized
Pose detection completed
```

### Error Patterns
```
stdin error (process may have crashed on startup)
Process exited with code 1
Process timeout after 120000ms
Failed to parse Python output
```

### Pool Status
```typescript
const status = poolManager.getStatus();
console.log(status);
// {
//   activeProcesses: 2,
//   queuedRequests: 27,
//   totalProcessed: 2,
//   totalErrors: 0,
//   uptime: 5000
// }
```

## Future Improvements

1. **Configurable spawn interval:** Make MIN_SPAWN_INTERVAL_MS configurable
2. **Adaptive backpressure:** Adjust spawn interval based on error rate
3. **Process reuse:** Keep processes alive between requests (careful with memory)
4. **GPU management:** Coordinate GPU access between processes
5. **Metrics export:** Prometheus-style metrics for monitoring
6. **Request prioritization:** Priority queue for urgent frames
7. **Graceful degradation:** Reduce maxConcurrentProcesses under memory pressure
