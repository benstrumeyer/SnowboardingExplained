# Architecture with Debug Points

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser                              │
│                    (http://localhost:3001)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Upload Video
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Backend (Node.js)                    │
│                    (http://localhost:3001)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/upload-video-with-pose Endpoint                    │  │
│  │ [DEBUG] poolManager check: poolManager=YES/NO           │  │
│  │ [DEBUG] ✓ poolManager is initialized                    │  │
│  │ [DEBUG] Submitting frame X/Y to pool                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ProcessPoolManager                                       │  │
│  │ [DEBUG] processRequest called with 1 frames             │  │
│  │ [DEBUG] Current state: activeProcesses=0, queue=0       │  │
│  │ [DEBUG] Spawning process for 1 frames                   │  │
│  │ [DEBUG] Creating HTTP wrapper for 1 frames              │  │
│  │ [DEBUG] Calling wrapper.getPoseInfo() with 1 frames     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PoseServiceHttpWrapper                                   │  │
│  │ [DEBUG] getPoseInfo called with 1 frames                │  │
│  │ [DEBUG] Sending frame 0 to HTTP service (size: X bytes) │  │
│  │ [DEBUG] Frame 0 processed successfully (Zms, 24 kpts)   │  │
│  │ [DEBUG] Batch complete: 1 successful, 0 errors          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ HTTP POST /pose/hybrid
                              │ (image_base64, frame_number)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Pose Service (Python)                        │
│                    (http://localhost:5000)                      │
│                    Running on WSL                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /pose/hybrid Endpoint                                    │  │
│  │ [4D-HUMANS] Starting request for frame 0                │  │
│  │ [4D-HUMANS] URL: http://localhost:5000/pose/hybrid      │  │
│  │ [4D-HUMANS] Image base64 length: 12345                  │  │
│  │ [4D-HUMANS] Timeout: 120000ms                           │  │
│  │ [4D-HUMANS] Got response for frame 0: status 200        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4D-Humans Model (HMR2 + ViTPose)                        │  │
│  │ - Detects 24 SMPL keypoints                             │  │
│  │ - Generates 3D pose                                     │  │
│  │ - Computes joint angles                                 │  │
│  │ - Returns mesh vertices and faces                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ HTTP Response
                              │ {keypoints, has3d, mesh_data, ...}
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Backend (Node.js)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PoseServiceHttpWrapper (continued)                       │  │
│  │ [HTTP-WRAPPER] Frame 0 processed successfully (2500ms)   │  │
│  │ [HTTP-WRAPPER] Batch complete: 1 successful, 0 errors    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ProcessPoolManager (continued)                           │  │
│  │ [POOL-MANAGER] wrapper.getPoseInfo() returned 1 results  │  │
│  │ [POOL-MANAGER] _spawnAndProcess complete                │  │
│  │ [POOL-MANAGER] _processNextQueued: queue=30, active=0   │  │
│  │ [POOL-MANAGER] Processing queued request with 1 frames   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/upload-video-with-pose Endpoint (continued)        │  │
│  │ [UPLOAD] Processed 1/31 frames                          │  │
│  │ [UPLOAD] Processed 10/31 frames                         │  │
│  │ [UPLOAD] Processed 20/31 frames                         │  │
│  │ [UPLOAD] Successfully processed 31/31 frames            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MongoDB Storage                                          │  │
│  │ [UPLOAD] Connecting to MongoDB...                        │  │
│  │ [UPLOAD] ✓ Connected to MongoDB                          │  │
│  │ [UPLOAD] ✓ Stored mesh data in MongoDB                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  MongoDB Database │
                    │  (mesh data)      │
                    └──────────────────┘
```

## Debug Points Explained

### 1. Upload Endpoint (`[UPLOAD]`)
**Location:** `backend/src/server.ts` - `/api/upload-video-with-pose`

**What it checks:**
- Is poolManager initialized?
- Are frames being submitted to the pool?
- How many frames are being processed?

**Key logs:**
```
[UPLOAD] poolManager check: poolManager=YES, framesToProcess.length=31
[UPLOAD] ✓ poolManager is initialized, submitting 31 frames to process pool
[UPLOAD] Submitting frame 0/31 to pool
[UPLOAD] Successfully processed 31/31 frames with pose data
```

**What to look for:**
- If `poolManager=NO`, the pool manager is null
- If no `[POOL-MANAGER]` logs follow, frames are not being submitted
- If `Successfully processed` shows fewer frames than expected, some failed

### 2. Pool Manager (`[POOL-MANAGER]`)
**Location:** `backend/src/services/processPoolManager.ts`

**What it checks:**
- Is the pool accepting requests?
- Are frames being queued or spawned?
- Is the HTTP wrapper being created?
- Are results being returned?

**Key logs:**
```
[POOL-MANAGER] processRequest called with 1 frames
[POOL-MANAGER] Current state: activeProcesses=0, queueSize=0, maxConcurrent=2
[POOL-MANAGER] Spawning process for 1 frames
[POOL-MANAGER] Creating HTTP wrapper for 1 frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with 1 frames
[POOL-MANAGER] wrapper.getPoseInfo() returned 1 results
```

**What to look for:**
- If `activeProcesses` reaches `maxConcurrent`, frames are queued
- If `Creating HTTP wrapper` is missing, wrapper instantiation failed
- If `wrapper.getPoseInfo() returned` is missing, HTTP call failed

### 3. HTTP Wrapper (`[HTTP-WRAPPER]`)
**Location:** `backend/src/services/poseServiceHttpWrapper.ts`

**What it checks:**
- Is the wrapper being called?
- Are frames being sent to the pose service?
- Are results being returned?
- How many frames succeeded vs failed?

**Key logs:**
```
[HTTP-WRAPPER] getPoseInfo called with 1 frames
[HTTP-WRAPPER] Sending frame 0 to HTTP service (image size: 12345 bytes)
[HTTP-WRAPPER] Frame 0 processed successfully (2500ms, 24 keypoints)
[HTTP-WRAPPER] Batch complete: 1 successful, 0 errors
```

**What to look for:**
- If `getPoseInfo called` is missing, wrapper is not being invoked
- If `Sending frame` is missing, frame data is missing
- If `processed successfully` shows 0 keypoints, pose detection failed
- If `Batch complete` shows errors, some frames failed

### 4. Pose Service (`[4D-HUMANS]`)
**Location:** `backend/src/services/pythonPoseService.ts` - `detectPoseHybrid()`

**What it checks:**
- Is the HTTP request being sent?
- Is the pose service responding?
- What is the response status?

**Key logs:**
```
[4D-HUMANS] Starting request for frame 0
[4D-HUMANS] URL: http://localhost:5000/pose/hybrid
[4D-HUMANS] Image base64 length: 12345
[4D-HUMANS] Timeout: 120000ms
[4D-HUMANS] Got response for frame 0: status 200
```

**What to look for:**
- If `Starting request` is missing, HTTP wrapper is not calling detectPoseHybrid
- If `Got response` is missing, pose service is not responding
- If status is not 200, pose service returned an error
- If error shows `ECONNREFUSED`, pose service is not running

## Debugging Flow

### Scenario 1: poolManager is null
```
[UPLOAD] poolManager check: poolManager=NO
         ↓
Check: Is [STARTUP] ProcessPoolManager initialized in logs?
       ↓
       NO → Backend didn't initialize pool manager
            Check: Is USE_HTTP_POSE_SERVICE=true in .env.local?
            Check: Are there TypeScript errors?
            Solution: Restart backend
       
       YES → Pool manager was initialized but became null
             This shouldn't happen - check for memory issues
```

### Scenario 2: Frames not submitted to pool
```
[UPLOAD] ✓ poolManager is initialized
[UPLOAD] Submitting frame 0/31 to pool
         ↓
Check: Do you see [POOL-MANAGER] processRequest called?
       ↓
       NO → Frames are not being submitted
            Check: Is there an error in the submission loop?
            Check: Is framesToProcess array populated?
            Solution: Check server logs for exceptions
       
       YES → Frames are being submitted, continue to next scenario
```

### Scenario 3: HTTP wrapper not called
```
[POOL-MANAGER] Creating HTTP wrapper for 1 frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with 1 frames
         ↓
Check: Do you see [HTTP-WRAPPER] getPoseInfo called?
       ↓
       NO → HTTP wrapper is not being invoked
            Check: Is PoseServiceHttpWrapper imported?
            Check: Is wrapper instantiation failing?
            Solution: Check TypeScript compilation errors
       
       YES → HTTP wrapper is being called, continue to next scenario
```

### Scenario 4: Pose service not responding
```
[HTTP-WRAPPER] Sending frame 0 to HTTP service (image size: 12345 bytes)
         ↓
Check: Do you see [4D-HUMANS] Got response?
       ↓
       NO → Pose service is not responding
            Check: Is WSL pose service running?
            Check: Is POSE_SERVICE_URL correct?
            Solution: Start pose service, check URL
       
       YES → Pose service is responding, continue to next scenario
```

### Scenario 5: Pose detection failed
```
[4D-HUMANS] Got response for frame 0: status 200
[HTTP-WRAPPER] Frame 0 processed successfully (2500ms, 24 keypoints)
         ↓
Check: Do you see 24 keypoints?
       ↓
       NO → Pose detection failed
            Check: Is pose service returning valid data?
            Check: Pose service logs for errors
            Solution: Check pose service health
       
       YES → Pose detection succeeded, continue to next scenario
```

### Scenario 6: MongoDB storage failed
```
[UPLOAD] Successfully processed 31/31 frames with pose data
[UPLOAD] Connecting to MongoDB...
         ↓
Check: Do you see ✓ Connected to MongoDB?
       ↓
       NO → MongoDB connection failed
            Check: Is MongoDB running?
            Check: Are credentials correct?
            Solution: Start MongoDB, check connection string
       
       YES → MongoDB storage succeeded
```

## Performance Monitoring

Use the debug logs to monitor performance:

```
[4D-HUMANS] Got response for frame 0: status 200
[HTTP-WRAPPER] Frame 0 processed successfully (2500ms, 24 keypoints)
                                              ↑
                                    Processing time per frame
```

- **Expected:** 2-3 seconds per frame
- **Slow:** >5 seconds per frame (check pose service performance)
- **Fast:** <1 second per frame (unusual, check if pose service is actually running)

## Conclusion

The debug logging provides a complete trace of the frame processing pipeline. By following the flow from upload → pool manager → HTTP wrapper → pose service → MongoDB, you can identify exactly where the issue occurs.

Each debug point is strategically placed to answer the question: "Did this step complete successfully?"

If any step is missing from the logs, that's where the issue is.
