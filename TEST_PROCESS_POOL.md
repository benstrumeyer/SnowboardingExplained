# Testing the Process Pool Fix

## Quick Test: 31 Frames

This is the exact scenario that was failing before the fix.

### Prerequisites
1. Backend server running on port 3001
2. Python pose service available at `SnowboardingExplained/pose-service`
3. Test video file (any MP4 video, ~30+ frames)

### Test Command
```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

### Expected Output
```json
{
  "success": true,
  "videoId": "v_1766584200271_1",
  "role": "rider",
  "message": "Video uploaded. Pose extraction started in background."
}
```

### What to Check in Logs

**Success indicators:**
```
[UPLOAD] Submitting 31 frames to process pool (one process per frame)
[UPLOAD] Successfully processed 31/31 frames with pose data
Pose detection completed
```

**Error indicators (should NOT see these):**
```
Error: write EOF at WriteWrap.onWriteComplete
stdin error (process may have crashed on startup)
Process exited with code 1
```

## Detailed Testing

### Test 1: Single Frame
```bash
# Create a 1-frame video or use a short clip
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@single-frame.mp4" \
  -F "role=rider"
```

Expected: Completes in ~3 seconds

### Test 2: 10 Frames
```bash
# Use a ~0.3 second video at 30fps
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@10-frames.mp4" \
  -F "role=rider"
```

Expected: Completes in ~15 seconds (10 × 2.6s ÷ 2 processes)

### Test 3: 31 Frames (Original Failing Case)
```bash
# Use a ~1 second video at 30fps
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@31-frames.mp4" \
  -F "role=rider"
```

Expected: Completes in ~42 seconds (31 × 2.6s ÷ 2 processes)

### Test 4: 100 Frames (Stress Test)
```bash
# Use a ~3.3 second video at 30fps
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@100-frames.mp4" \
  -F "role=rider"
```

Expected: Completes in ~130 seconds (100 × 2.6s ÷ 2 processes)

## Monitoring During Test

### Terminal 1: Run Backend
```bash
cd SnowboardingExplained/backend
npm run dev
```

Watch for:
- Process spawn logs
- Frame processing logs
- No stdin errors

### Terminal 2: Run Test
```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

### Terminal 3: Monitor System Resources
```bash
# On macOS/Linux
watch -n 1 'ps aux | grep python | grep -v grep'

# On Windows
Get-Process python | Select-Object ProcessName, CPU, Memory
```

Watch for:
- Max 2 Python processes running at once
- Memory usage stays reasonable (~2-3 GB per process)
- Processes exit cleanly after each frame

## Debugging

### Enable Debug Logging
In `posePoolConfig.ts`:
```typescript
const posePoolConfig: PoolConfig = {
  // ... other config
  debug: true  // Enable verbose logging
};
```

This will log:
- Request queued
- Processing queued request
- Process completed with frame count

### Check Pool Status
Add this to your test:
```typescript
// In server.ts, add a status endpoint
app.get('/api/pool-status', (req, res) => {
  res.json(poolManager?.getStatus());
});
```

Then check:
```bash
curl http://localhost:3001/api/pool-status
```

Output:
```json
{
  "activeProcesses": 2,
  "queuedRequests": 27,
  "totalProcessed": 2,
  "totalErrors": 0,
  "uptime": 5000
}
```

### Check MongoDB Results
```bash
# Connect to MongoDB
mongosh

# Check if data was saved
use snowboarding_explained
db.mesh_data.findOne({ videoId: "v_1766584200271_1" })
```

Should see:
- `frameCount`: 31 (or however many frames)
- `frames`: Array with pose data for each frame
- `role`: "rider"

## Performance Baseline

### Expected Times (on typical system)
- Single frame: 2.6 seconds
- 10 frames: 15 seconds
- 31 frames: 42 seconds
- 100 frames: 130 seconds

### If Times Are Slower
- Check system resources (RAM, GPU)
- Verify Python models are cached (first run is slower)
- Check network latency to MongoDB

### If Times Are Faster
- Great! Your system is faster than baseline
- Consider increasing `maxConcurrentProcesses` for more parallelization

## Troubleshooting

### Error: "write EOF"
- **Cause:** Spawn interval too short or system overloaded
- **Fix:** Increase `MIN_SPAWN_INTERVAL_MS` in wrapper
- **Check:** System RAM and CPU usage

### Error: "Process timeout"
- **Cause:** Frame processing taking too long
- **Fix:** Increase `processTimeoutMs` in pool config
- **Check:** GPU availability and model loading time

### Error: "Queue full"
- **Cause:** Too many requests queued
- **Fix:** Increase `queueMaxSize` in pool config
- **Check:** System can handle more concurrent processes

### Error: "Failed to parse Python output"
- **Cause:** Python app crashed or produced invalid JSON
- **Fix:** Check Python app logs
- **Check:** Frame data is valid base64

### No Results in MongoDB
- **Cause:** Pose extraction failed silently
- **Fix:** Check backend logs for errors
- **Check:** MongoDB connection is working

## Success Criteria

✅ All tests pass if:
1. No "write EOF" errors
2. All frames processed successfully
3. Results stored in MongoDB
4. Max 2 Python processes running at once
5. Processing time matches expected baseline
6. No memory leaks (processes exit cleanly)
7. Graceful error handling for invalid inputs

## Next Steps

Once tests pass:
1. Deploy to production
2. Monitor error rates in production
3. Adjust `maxConcurrentProcesses` based on system resources
4. Consider implementing request prioritization
5. Add metrics/monitoring for long-term tracking
