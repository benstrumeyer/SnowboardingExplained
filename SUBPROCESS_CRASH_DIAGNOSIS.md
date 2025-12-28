# Subprocess Crash Diagnosis

## Problem
When Node.js calls Flask's `/pose/video` endpoint with a video file, Flask spawns `track.py` as a subprocess. The subprocess crashes, causing a "socket hang up" (ECONNRESET) error on the Node.js side.

## Root Causes (in order of likelihood)

### 1. **CUDA Out of Memory (Most Likely)**
- `track.py` processes the entire video at once using PHALP
- PHALP loads the entire video into GPU memory
- For large videos (>100MB), this can exceed GPU VRAM
- When CUDA OOM occurs, the process crashes hard without returning an error code
- Flask's subprocess handler doesn't catch this because the process dies before returning

**Evidence:**
- Error: "socket hang up" (ECONNRESET) - indicates process crashed mid-response
- No error response returned to Node.js
- Flask logs would show subprocess exit code but not the actual error

### 2. **track.py Subprocess Error Not Captured**
- Current Flask code captures `result.returncode` but if the process crashes hard (segfault, CUDA error), it might not return cleanly
- The subprocess error handling is good, but only if `subprocess.run()` completes

### 3. **Video File Path Issues**
- Video copied to WSL at `/tmp/pose-videos/v_*.mov`
- track.py might not be finding the file or having permission issues
- But this would show in stderr, not cause a hard crash

### 4. **track.py Timeout**
- Current timeout: 180 seconds (3 minutes)
- Large videos might take longer
- When timeout expires, subprocess is killed, but Flask should return a timeout error

## Solution Strategy

### Immediate Fix (Already in Code)
The Flask error handling is actually comprehensive:
- ✅ Captures `result.returncode` and logs stderr/stdout
- ✅ Detects CUDA OOM in stderr
- ✅ Has timeout handling
- ✅ Has outer exception handler

### What's Likely Happening
1. `track.py` starts processing video
2. During processing, CUDA OOM occurs
3. Process crashes hard (segfault or CUDA runtime error)
4. Flask's subprocess handler catches it and tries to return error
5. But the connection might already be broken, causing "socket hang up"

### Real Fix Needed
**Increase GPU memory management in track.py:**
- Process video in chunks instead of all at once
- Clear GPU memory between chunks
- Add explicit CUDA memory checks

**OR**

**Reduce video processing load:**
- Downsample video before processing
- Process at lower resolution
- Use frame skipping

## Testing Next Steps

1. **Check Flask logs** for actual error messages:
   ```bash
   tail -f /tmp/pose-service-logs/pose-service-*.log
   ```

2. **Monitor GPU memory** during processing:
   ```bash
   watch -n 1 nvidia-smi
   ```

3. **Test with smaller video** to confirm CUDA OOM hypothesis

4. **Add GPU memory pre-check** in Flask before calling track.py

## Current Status
- Flask error handling: ✅ Good
- Node.js error logging: ✅ Good
- Video path conversion: ✅ Working
- Subprocess error capture: ✅ Working
- **GPU memory management: ❌ Likely Issue**

## Next Action
Monitor Flask logs during next video upload to see actual error message from track.py.
