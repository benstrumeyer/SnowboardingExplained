# Testing with Debug Logging

## Quick Start

### 1. Restart Backend with Debug Logging
```bash
cd SnowboardingExplained
./start-backend.bat
```

Wait for the backend to start. You should see:
```
[STARTUP] ProcessPoolManager initialized
[STARTUP] mode: HTTP
[STARTUP] maxConcurrentProcesses: 2
[STARTUP] queueMaxSize: 100
```

### 2. Verify Pose Service is Running
The backend will check pose service health on startup:
```
[STARTUP] Checking pose service health...
[STARTUP] Pose service URL: http://localhost:5000
[STARTUP] ✓ Pose service is responding
```

If you see a warning about pose service not responding, make sure the WSL pose service is running:
```bash
# In WSL terminal
cd ~/SnowboardingExplained/pose-service
python app.py
```

### 3. Upload a Test Video
1. Open the web UI at `http://localhost:3001`
2. Click "Upload Video"
3. Select a small test video (e.g., `not.mov` - 213KB, 31 frames)
4. Select role (rider or coach)
5. Click upload

### 4. Monitor Console Output
Watch the backend console for debug logs. You should see:

#### Phase 1: Frame Extraction
```
[UPLOAD] ========================================
[UPLOAD] Generated videoId: v_XXXXXXXXX_1
[UPLOAD] Role: rider
[UPLOAD] File: not.mov
[UPLOAD] Size: 0.20MB
[UPLOAD] Path: C:\Users\benja\repos\SnowboardingExplained\backend\uploads\v_XXXXXXXXX_1.mov
[UPLOAD] Extracted 31 frames
```

#### Phase 2: Pool Manager Check
```
[UPLOAD] poolManager check: poolManager=YES, framesToProcess.length=31
[UPLOAD] ✓ poolManager is initialized, submitting 31 frames to process pool
```

If you see `poolManager=NO`, that's the problem - the pool manager is null.

#### Phase 3: Frame Submission
```
[UPLOAD] Submitting frame 0/31 to pool
[POOL-MANAGER] processRequest called with 1 frames
[POOL-MANAGER] Current state: activeProcesses=0, queueSize=0, maxConcurrent=2
[POOL-MANAGER] Spawning process for 1 frames
[POOL-MANAGER] _spawnAndProcess: activeProcesses now 1
[POOL-MANAGER] Creating HTTP wrapper for 1 frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with 1 frames
```

#### Phase 4: HTTP Wrapper Processing
```
[HTTP-WRAPPER] getPoseInfo called with 1 frames
[HTTP-WRAPPER] Sending frame 0 to HTTP service (image size: 12345 bytes)
[4D-HUMANS] Starting request for frame 0
[4D-HUMANS] URL: http://localhost:5000/pose/hybrid
[4D-HUMANS] Image base64 length: 12345
[4D-HUMANS] Timeout: 120000ms
[4D-HUMANS] Got response for frame 0: status 200
[HTTP-WRAPPER] Frame 0 processed successfully (2500ms, 24 keypoints)
[HTTP-WRAPPER] Batch complete: 1 successful, 0 errors
```

#### Phase 5: Pool Processing
```
[POOL-MANAGER] wrapper.getPoseInfo() returned 1 results
[POOL-MANAGER] _spawnAndProcess complete: activeProcesses now 0
[POOL-MANAGER] _processNextQueued: queue=30, active=0, max=2, accepting=true
[POOL-MANAGER] Processing queued request with 1 frames. Queue now: 29
```

This repeats for each frame.

#### Phase 6: Completion
```
[UPLOAD] Successfully processed 31/31 frames with pose data
[UPLOAD] Connecting to MongoDB...
[UPLOAD] ✓ Connected to MongoDB
[UPLOAD] About to save mesh data for v_XXXXXXXXX_1
[UPLOAD] Mesh data: 31 frames, fps: 31
[UPLOAD] ✓ Stored mesh data in MongoDB for v_XXXXXXXXX_1
[UPLOAD] Saved 31 frames to MongoDB
```

## Troubleshooting

### Issue: `poolManager=NO`
**Symptom:** You see `[UPLOAD] ✗ poolManager is NULL`

**Cause:** The pool manager was not initialized during server startup

**Solution:**
1. Check server startup logs for errors
2. Look for `[STARTUP] ProcessPoolManager initialized` message
3. If missing, check `.env.local` for `USE_HTTP_POSE_SERVICE=true`
4. Restart backend

### Issue: HTTP Wrapper Not Called
**Symptom:** You see `[POOL-MANAGER] Creating HTTP wrapper` but no `[HTTP-WRAPPER]` logs

**Cause:** HTTP wrapper is not being instantiated correctly

**Solution:**
1. Check for errors in `_spawnAndProcess` method
2. Verify `PoseServiceHttpWrapper` class is imported correctly
3. Check TypeScript compilation errors

### Issue: Pose Service Not Responding
**Symptom:** You see `[HTTP-WRAPPER] Sending frame` but no `[4D-HUMANS]` response logs

**Cause:** Pose service is not running or not responding to HTTP requests

**Solution:**
1. Check if WSL pose service is running: `curl http://localhost:5000/health`
2. Verify `POSE_SERVICE_URL` in `.env.local` is correct
3. Check pose service logs for errors
4. Restart pose service

### Issue: Queue Full Error
**Symptom:** Error: `Queue full (max 100 requests)`

**Cause:** Frames are being submitted faster than they can be processed

**Solution:**
1. This is expected for large videos (>100 frames)
2. The sequential submission loop should prevent this
3. If you still see it, check that frames are being awaited properly
4. Increase `QUEUE_MAX_SIZE` in `.env.local` if needed

## Performance Expectations

### Small Video (31 frames, 213KB)
- Frame extraction: ~2 seconds
- Pose detection: ~2-3 seconds per frame
- Total time: ~90-100 seconds
- Expected output: 31 frames with 24 keypoints each

### Medium Video (130 frames, 60fps)
- Frame extraction: ~5 seconds
- Pose detection: ~2-3 seconds per frame
- Total time: ~400-450 seconds (7-8 minutes)
- Expected output: 130 frames with 24 keypoints each

## Debug Logging Levels

The debug logging is always on. To reduce verbosity, you can:

1. **Disable HTTP wrapper frame logs:**
   - Comment out `console.log` in `poseServiceHttpWrapper.ts` getPoseInfo method

2. **Disable pool manager logs:**
   - Comment out `console.log` in `processPoolManager.ts` methods

3. **Disable server logs:**
   - Comment out `console.log` in `server.ts` upload endpoints

## Collecting Logs for Analysis

To save logs to a file:

```bash
# PowerShell
./start-backend.bat 2>&1 | Tee-Object -FilePath backend-debug.log

# CMD
./start-backend.bat > backend-debug.log 2>&1
```

Then upload the video and check `backend-debug.log` for the complete flow.

## Next Steps

1. Run the test with debug logging enabled
2. Check the console output for the expected flow
3. If the flow breaks at any point, note the last successful log message
4. Report the issue with the debug logs attached
