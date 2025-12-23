# Debugging Network Communication Issue - Comprehensive Logging Added

## Problem
When processing 83 frames instead of 4, the backend requests to the pose service are timing out with `ECONNABORTED` error after 120 seconds. The pose service is not logging that it's receiving requests, suggesting they're getting lost in the network layer.

## Root Cause Investigation
The issue likely stems from:
1. Large image payloads (83 frames × ~500KB each = ~40MB total)
2. Network communication between Windows backend and WSL pose service
3. Possible buffer/timeout issues with large request bodies
4. Garbage collection changes affecting memory/performance

## Comprehensive Logging Added

### 1. Frontend Logging (VideoUploadModal.tsx)
Added detailed logging to track:
- File upload start/completion with timestamps
- Upload progress tracking
- API URL being used
- Response data from backend
- Poll attempts and status checks
- Error details with full stack traces

**Key logs:**
```
[UPLOAD] Starting video upload...
[UPLOAD] File: {filename}, Size: {bytes}, Type: {type}
[UPLOAD] API URL: {url}
[UPLOAD] Upload response received ({elapsed}ms)
[UPLOAD] Got videoId: {id}
[UPLOAD] Poll attempt {n}/200...
[UPLOAD] Poll {n}: status={status}
```

### 2. Backend Logging (server.ts)
Added detailed logging to the frame processing loop:
- Environment variables (POSE_SERVICE_URL, POSE_SERVICE_TIMEOUT)
- Frame extraction details
- Per-frame processing with timestamps
- Image size and disk read operations
- detectPoseHybrid call timing
- Error details with stack traces

**Key logs:**
```
[UPLOAD] Starting pose extraction for {count} frames
[UPLOAD] POSE_SERVICE_URL: {url}
[UPLOAD] Processing frame {n}/{total}
[UPLOAD] Frame timestamp: {ts}s
[UPLOAD] Reading frame from disk...
[UPLOAD] ✓ Frame read from disk, size: {bytes} bytes
[UPLOAD] Calling detectPoseHybrid...
[UPLOAD] Timestamp before call: {iso}
[UPLOAD] Timestamp after call: {iso}
[UPLOAD] Frame processing time: {ms}ms
[UPLOAD] Pose result error: {error}
```

### 3. Python Pose Service Logging (app.py)

#### Request Middleware
Added comprehensive request logging:
```
[REQUEST] ========================================
[REQUEST] Timestamp: {unix}
[REQUEST] {METHOD} {path}
[REQUEST] Remote addr: {ip}
[REQUEST] Content-Type: {type}
[REQUEST] Content-Length: {bytes}
[REQUEST] Headers: {dict}
[REQUEST] ========================================
```

#### /pose/hybrid Endpoint
Added detailed endpoint logging:
```
[POSE/HYBRID] ========================================
[POSE/HYBRID] REQUEST RECEIVED!
[POSE/HYBRID] Timestamp: {unix}
[POSE/HYBRID] {METHOD} {path}
[POSE/HYBRID] Content-Type: {type}
[POSE/HYBRID] Content-Length: {bytes}
[POSE/HYBRID] JSON keys: {list}
[POSE/HYBRID] Frame: {n}, Image size: {bytes} bytes, Visualize: {bool}
[POSE/HYBRID] Getting detector...
[POSE/HYBRID] Running detection...
[POSE/HYBRID] ✓ Detection complete, returning result
```

### 4. Python Pose Service Client Logging (pythonPoseService.ts)
Enhanced detectPoseHybrid with detailed logging:
```
[4D-HUMANS] ========================================
[4D-HUMANS] FRAME {n} - START
[4D-HUMANS] URL: {url}
[4D-HUMANS] Image size: {bytes} bytes
[4D-HUMANS] Timeout: 120000ms
[4D-HUMANS] Visualize: {bool}
[4D-HUMANS] Creating axios instance...
[4D-HUMANS] Preparing request body...
[4D-HUMANS] Request body size: {bytes} bytes
[4D-HUMANS] Sending POST request to {url}
[4D-HUMANS] Request timestamp: {iso}
[4D-HUMANS] ✓ Response received (status: {code})
[4D-HUMANS] Response time: {ms}ms
[4D-HUMANS] Response timestamp: {iso}
[4D-HUMANS] Response data keys: {list}
[4D-HUMANS] has_3d: {bool}
[4D-HUMANS] keypoint_count: {n}
[4D-HUMANS] ✓ Frame {n} complete
```

**Error logging:**
```
[4D-HUMANS] ✗ ERROR on frame {n}
[4D-HUMANS] Elapsed time: {ms}ms
[4D-HUMANS] Error code: {code}
[4D-HUMANS] Error message: {msg}
[4D-HUMANS] Error address: {addr}
[4D-HUMANS] Error port: {port}
[4D-HUMANS] Error syscall: {syscall}
[4D-HUMANS] Error errno: {errno}
[4D-HUMANS] Error response status: {code}
[4D-HUMANS] Error response data: {json}
[4D-HUMANS] Error timestamp: {iso}
```

## How to Debug

### Step 1: Check Frontend Logs
Open browser DevTools (F12) → Console tab
Look for `[UPLOAD]` logs to see:
- If upload completes successfully
- What videoId is returned
- If polling starts and what status is returned

### Step 2: Check Backend Logs
Run backend with: `npm run dev` or `npm start`
Look for `[UPLOAD]` logs to see:
- Frame extraction progress
- When detectPoseHybrid is called
- How long each frame takes
- Any errors from the pose service

### Step 3: Check Pose Service Logs
Run pose service with: `python app.py` in WSL
Look for:
- `[REQUEST]` logs showing if requests arrive
- `[POSE/HYBRID]` logs showing if endpoint is called
- Any errors during detection

### Step 4: Trace the Request Path
1. **Frontend sends upload** → Look for `[UPLOAD] Starting video upload...`
2. **Backend receives upload** → Look for `[UPLOAD] Processing video for pose extraction`
3. **Backend extracts frames** → Look for `[UPLOAD] Extracted {n} frames`
4. **Backend calls pose service** → Look for `[UPLOAD] Calling detectPoseHybrid...`
5. **Pose service receives request** → Look for `[REQUEST]` and `[POSE/HYBRID]` logs
6. **Pose service processes** → Look for `[POSE/HYBRID] Running detection...`
7. **Pose service returns** → Look for `[POSE/HYBRID] ✓ Detection complete`
8. **Backend receives response** → Look for `[UPLOAD] Timestamp after call`

## Key Metrics to Track

### Timing
- **Upload time**: From `[UPLOAD] Starting video upload...` to `[UPLOAD] Upload response received`
- **Frame extraction time**: From `[UPLOAD] Starting pose extraction` to first frame processing
- **Per-frame time**: From `[UPLOAD] Calling detectPoseHybrid...` to `[UPLOAD] Frame processing time`
- **Total processing time**: Sum of all frame times

### Network
- **Request size**: `[UPLOAD] Request body size` and `[POSE/HYBRID] Content-Length`
- **Response time**: `[4D-HUMANS] Response time`
- **Timeout threshold**: 120000ms (120 seconds)

### Errors
- **Connection errors**: `ECONNREFUSED`, `ECONNABORTED`, `ETIMEDOUT`
- **HTTP errors**: Non-200 status codes in `[POSE/HYBRID]` logs
- **Processing errors**: Exceptions in `[POSE/HYBRID] ✗ Exception`

## Common Issues and Solutions

### Issue: No `[REQUEST]` logs in pose service
**Cause**: Request never reaches the pose service
**Solutions**:
1. Check POSE_SERVICE_URL in backend `.env.local` - should be `http://172.24.183.130:5000` for WSL
2. Verify pose service is running: `netstat -an | grep 5000`
3. Test connectivity: `curl http://172.24.183.130:5000/health` from Windows
4. Check Windows firewall isn't blocking port 5000

### Issue: `[POSE/HYBRID]` logs appear but detection fails
**Cause**: Request reaches service but processing fails
**Solutions**:
1. Check GPU memory: `nvidia-smi` in WSL
2. Check model loading: Look for `[WARMUP]` logs on startup
3. Check image data: Verify `Image size` is reasonable (not 0 or huge)

### Issue: Timeout after 120 seconds
**Cause**: Request takes too long to process
**Solutions**:
1. Check GPU utilization: `nvidia-smi` in WSL
2. Reduce frame count for testing
3. Check if garbage collection is blocking: Look for long pauses in logs
4. Increase timeout in `.env.local`: `POSE_SERVICE_TIMEOUT=180000`

## Files Modified
- `SnowboardingExplained/backend/web/src/components/VideoUploadModal.tsx` - Frontend logging
- `SnowboardingExplained/backend/src/server.ts` - Backend frame processing logging
- `SnowboardingExplained/backend/src/services/pythonPoseService.ts` - Pose service client logging
- `SnowboardingExplained/backend/pose-service/app.py` - Flask request and endpoint logging

## Next Steps
1. Run a test upload with a small video (2-3 seconds)
2. Check all three log sources (frontend, backend, pose service)
3. Identify where the request gets stuck
4. Report findings with relevant log excerpts
