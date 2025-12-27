# Debugging Session Summary

## What Was Done

We added comprehensive debug logging to trace the flow of frames from upload through pose detection. This will help identify where the issue occurs when frames are not being sent to the pose service.

## Files Modified

### 1. `backend/src/services/processPoolManager.ts`
Added debug logging to:
- `processRequest()` - Logs when called, current state, and whether queueing or spawning
- `_spawnAndProcess()` - Logs wrapper creation, getPoseInfo calls, and results
- `_processNextQueued()` - Logs queue state and processing decisions

**Key logs:**
```
[POOL-MANAGER] processRequest called with X frames
[POOL-MANAGER] Current state: activeProcesses=Y, queueSize=Z, maxConcurrent=2
[POOL-MANAGER] Creating HTTP wrapper for X frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with X frames
[POOL-MANAGER] wrapper.getPoseInfo() returned Y results
```

### 2. `backend/src/services/poseServiceHttpWrapper.ts`
Added debug logging to:
- `getPoseInfo()` - Logs when called, for each frame, and batch summary

**Key logs:**
```
[HTTP-WRAPPER] getPoseInfo called with X frames
[HTTP-WRAPPER] Sending frame Y to HTTP service (image size: Z bytes)
[HTTP-WRAPPER] Frame Y processed successfully (Zms, N keypoints)
[HTTP-WRAPPER] Batch complete: X successful, Y errors
```

### 3. `backend/src/server.ts`
Added debug logging to:
- `/api/finalize-upload` endpoint - Logs poolManager state and frame submission
- `/api/upload-video-with-pose` endpoint - Logs poolManager state and frame submission

**Key logs:**
```
[FINALIZE] poolManager check: poolManager=YES, framesToProcess.length=130
[FINALIZE] ✓ poolManager is initialized, submitting 130 frames to process pool
[FINALIZE] Submitting frame 0/130 to pool
[UPLOAD] poolManager check: poolManager=YES, framesToProcess.length=130
[UPLOAD] ✓ poolManager is initialized, submitting 130 frames to process pool
[UPLOAD] Submitting frame 0/130 to pool
```

## What This Helps Debug

### Issue 1: poolManager is null
If you see `poolManager=NO` or `poolManager=NULL`, the pool manager was not initialized during server startup.
- Check server startup logs for `[STARTUP] ProcessPoolManager initialized`
- Verify `.env.local` has `USE_HTTP_POSE_SERVICE=true`
- Check for TypeScript compilation errors

### Issue 2: Frames not submitted to pool
If you see `[UPLOAD] ✓ poolManager is initialized` but no `[POOL-MANAGER] processRequest called`, frames are not being submitted.
- Check for errors in the frame submission loop
- Verify `framesToProcess` array is populated
- Check for exceptions in the try-catch block

### Issue 3: HTTP wrapper not called
If you see `[POOL-MANAGER] Creating HTTP wrapper` but no `[HTTP-WRAPPER] getPoseInfo called`, the wrapper is not being instantiated.
- Check for TypeScript errors in wrapper instantiation
- Verify `PoseServiceHttpWrapper` is imported correctly
- Check for runtime errors in `_spawnAndProcess`

### Issue 4: Pose service not responding
If you see `[HTTP-WRAPPER] Sending frame` but no `[4D-HUMANS]` logs, the pose service is not responding.
- Check if WSL pose service is running
- Verify `POSE_SERVICE_URL` in `.env.local`
- Check pose service logs for errors
- Test with `curl http://localhost:5000/health`

### Issue 5: Queue overflow
If you see `Queue full (max 100 requests)`, frames are being submitted faster than processed.
- This is expected for large videos
- The sequential submission loop should prevent this
- If still occurring, check that frames are being awaited properly

## How to Use

1. **Restart backend:**
   ```bash
   cd SnowboardingExplained
   ./start-backend.bat
   ```

2. **Upload a test video** through the web UI

3. **Monitor console output** for debug logs

4. **Trace the flow:**
   - Look for `[UPLOAD] poolManager check`
   - Look for `[POOL-MANAGER] processRequest called`
   - Look for `[HTTP-WRAPPER] getPoseInfo called`
   - Look for `[4D-HUMANS] Got response`
   - Look for `[UPLOAD] Successfully processed`

5. **Identify where it breaks** by finding the last successful log message

## Expected Output for Successful Upload

For a 31-frame video:

```
[UPLOAD] ========================================
[UPLOAD] Generated videoId: v_XXXXXXXXX_1
[UPLOAD] Role: rider
[UPLOAD] File: not.mov
[UPLOAD] Size: 0.20MB
[UPLOAD] Extracted 31 frames
[UPLOAD] poolManager check: poolManager=YES, framesToProcess.length=31
[UPLOAD] ✓ poolManager is initialized, submitting 31 frames to process pool
[UPLOAD] Submitting frame 0/31 to pool
[POOL-MANAGER] processRequest called with 1 frames
[POOL-MANAGER] Current state: activeProcesses=0, queueSize=0, maxConcurrent=2
[POOL-MANAGER] Spawning process for 1 frames
[POOL-MANAGER] _spawnAndProcess: activeProcesses now 1
[POOL-MANAGER] Creating HTTP wrapper for 1 frames
[POOL-MANAGER] Calling wrapper.getPoseInfo() with 1 frames
[HTTP-WRAPPER] getPoseInfo called with 1 frames
[HTTP-WRAPPER] Sending frame 0 to HTTP service (image size: 12345 bytes)
[4D-HUMANS] Starting request for frame 0
[4D-HUMANS] Got response for frame 0: status 200
[HTTP-WRAPPER] Frame 0 processed successfully (2500ms, 24 keypoints)
[HTTP-WRAPPER] Batch complete: 1 successful, 0 errors
[POOL-MANAGER] wrapper.getPoseInfo() returned 1 results
[POOL-MANAGER] _spawnAndProcess complete: activeProcesses now 0
[POOL-MANAGER] _processNextQueued: queue=30, active=0, max=2, accepting=true
[POOL-MANAGER] Processing queued request with 1 frames. Queue now: 29
... (repeats for frames 1-30)
[UPLOAD] Successfully processed 31/31 frames with pose data
[UPLOAD] Connecting to MongoDB...
[UPLOAD] ✓ Connected to MongoDB
[UPLOAD] ✓ Stored mesh data in MongoDB for v_XXXXXXXXX_1
```

## Next Steps

1. Run the backend with debug logging
2. Upload a test video
3. Check the console output
4. Identify where the flow breaks
5. Report the issue with the debug logs

## Performance Notes

- Small video (31 frames): ~90-100 seconds total
- Medium video (130 frames): ~400-450 seconds total
- Each frame takes ~2-3 seconds for pose detection
- Pool manager handles concurrency (default: 2 concurrent processes)
- Sequential submission prevents queue overflow

## Rollback

If you need to remove debug logging:
1. Revert changes to the three files
2. Or comment out `console.log` statements
3. Or set `POSE_SERVICE_DEBUG=true` in `.env.local` to use logger instead of console.log
