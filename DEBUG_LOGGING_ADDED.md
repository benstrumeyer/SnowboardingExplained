# Debug Logging Added for Pose Service Issue

## Problem
After the backend restarts, frames are not being sent to the pose service. The logs show:
- `[FINALIZE] Starting pose extraction for 130 frames`
- But no subsequent logs from the pose service indicating it received frame requests
- Queue overflow error: "Queue full (max 100 requests)"

## Root Cause Investigation
The issue appears to be one of:
1. `poolManager` is null when finalize-upload or upload-video-with-pose endpoints run
2. HTTP wrapper is not making requests correctly
3. Pose service is not responding to requests
4. Frames are not being submitted to the pool

## Debug Logging Added

### 1. ProcessPoolManager (`processPoolManager.ts`)

#### `processRequest()` method
- Logs when called with frame count
- Logs current state: `activeProcesses`, `queueSize`, `maxConcurrentProcesses`
- Logs when at capacity and queueing
- Logs when spawning process

```
[POOL-MANAGER] processRequest called with X frames
[POOL-MANAGER] Current state: activeProcesses=Y, queueSize=Z, maxConcurrent=2
[POOL-MANAGER] At capacity (Y/2), queueing request
[POOL-MANAGER] Spawning process for X frames
```

#### `_spawnAndProcess()` method
- Logs when incrementing activeProcesses
- Logs which wrapper is being created (HTTP or Process)
- Logs when calling wrapper.getPoseInfo()
- Logs when wrapper returns results
- Logs errors with full context
- Logs when decrementing activeProcesses

```
[POOL-MANAGER] _spawnAndProcess: activeProcesses now Y
[POOL-MANAGER] Creating HTTP wrapper for X frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with X frames
[POOL-MANAGER] wrapper.getPoseInfo() returned Y results
[POOL-MANAGER] _spawnAndProcess complete: activeProcesses now Z
```

#### `_processNextQueued()` method
- Logs queue state before processing
- Logs when processing queued request
- Logs why it can't process (if applicable)

```
[POOL-MANAGER] _processNextQueued: queue=X, active=Y, max=2, accepting=true
[POOL-MANAGER] Processing queued request with X frames. Queue now: Y
[POOL-MANAGER] Cannot process next queued: queue=X, active=Y, max=2, accepting=true
```

### 2. PoseServiceHttpWrapper (`poseServiceHttpWrapper.ts`)

#### `getPoseInfo()` method
- Logs when called with frame count
- Logs for each frame: sending to service with image size
- Logs when frame processed successfully with timing and keypoint count
- Logs errors for each frame
- Logs batch summary with success/error counts

```
[HTTP-WRAPPER] getPoseInfo called with X frames
[HTTP-WRAPPER] Sending frame Y to HTTP service (image size: Z bytes)
[HTTP-WRAPPER] Frame Y processed successfully (Zms, N keypoints)
[HTTP-WRAPPER] Error processing frame Y: error message
[HTTP-WRAPPER] Batch complete: X successful, Y errors
```

### 3. Server (`server.ts`)

#### `/api/finalize-upload` endpoint
- Logs poolManager state before processing
- Logs when poolManager is initialized vs null
- Logs each frame submission to pool
- Logs fallback to sequential processing if no pool

```
[FINALIZE] poolManager check: poolManager=YES, framesToProcess.length=130
[FINALIZE] ✓ poolManager is initialized, submitting 130 frames to process pool
[FINALIZE] Submitting frame 0/130 to pool
[FINALIZE] ✓ poolManager is initialized, submitting 130 frames to process pool
[FINALIZE] ✗ poolManager is NULL, framesToProcess.length=130
[FINALIZE] Falling back to sequential processing without pool
```

#### `/api/upload-video-with-pose` endpoint
- Same logging as finalize-upload
- Logs poolManager state before processing
- Logs each frame submission to pool

```
[UPLOAD] poolManager check: poolManager=YES, framesToProcess.length=130
[UPLOAD] ✓ poolManager is initialized, submitting 130 frames to process pool
[UPLOAD] Submitting frame 0/130 to pool
[UPLOAD] ✗ poolManager is NULL, framesToProcess.length=130
[UPLOAD] Falling back to sequential processing without pool
```

## How to Use This Debug Output

1. **Restart the backend** with `start-backend.bat`
2. **Upload a video** using the browser UI
3. **Check the console output** for the debug logs
4. **Look for these key indicators:**
   - Is `poolManager` initialized? (YES or NULL)
   - Are frames being submitted to the pool?
   - Is the HTTP wrapper being called?
   - Are frames being sent to the pose service?
   - Are results being returned?

## Expected Flow

For a successful upload with 130 frames:

```
[UPLOAD] poolManager check: poolManager=YES, framesToProcess.length=130
[UPLOAD] ✓ poolManager is initialized, submitting 130 frames to process pool
[UPLOAD] Submitting frame 0/130 to pool
[POOL-MANAGER] processRequest called with 1 frames
[POOL-MANAGER] Current state: activeProcesses=0, queueSize=0, maxConcurrent=2
[POOL-MANAGER] Spawning process for 1 frames
[POOL-MANAGER] _spawnAndProcess: activeProcesses now 1
[POOL-MANAGER] Creating HTTP wrapper for 1 frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with 1 frames
[HTTP-WRAPPER] getPoseInfo called with 1 frames
[HTTP-WRAPPER] Sending frame 0 to HTTP service (image size: XXXXX bytes)
[4D-HUMANS] Starting request for frame 0
[4D-HUMANS] Got response for frame 0: status 200
[HTTP-WRAPPER] Frame 0 processed successfully (Zms, 24 keypoints)
[HTTP-WRAPPER] Batch complete: 1 successful, 0 errors
[POOL-MANAGER] wrapper.getPoseInfo() returned 1 results
[POOL-MANAGER] _spawnAndProcess complete: activeProcesses now 0
[POOL-MANAGER] _processNextQueued: queue=X, active=0, max=2, accepting=true
[POOL-MANAGER] Processing queued request with 1 frames. Queue now: Y
```

## Next Steps

After collecting this debug output, we can:
1. Confirm poolManager is initialized
2. Confirm frames are being submitted to the pool
3. Confirm HTTP wrapper is being called
4. Confirm pose service is receiving requests
5. Identify where the flow breaks down
