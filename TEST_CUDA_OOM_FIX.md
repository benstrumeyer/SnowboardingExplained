# Testing the CUDA OOM Fix

## Quick Start

### Option 1: Automated Test (Recommended)
```bash
cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate
python test_cuda_oom_fix.py
```

This will:
- Start Flask wrapper automatically
- Send test frames 16, 17, 25, 26
- Report success/failure for each frame
- Clean up automatically

**Expected Output:**
```
============================================================
[TEST] CUDA OOM Fix Verification
============================================================

[TEST] Starting Flask wrapper...
[TEST] Flask process started (PID: 12345)
[TEST] Waiting for Flask to start (timeout: 60s)...
[TEST] ✅ Flask is ready!

[TEST] Testing frames that were previously failing...

[TEST] Testing frame 16...
[TEST] Sending frame 16 to /pose/hybrid...
[TEST] ✅ Frame 16 processed successfully in 45.2s
[TEST]    - Keypoints: 24
[TEST]    - Mesh vertices: 6890
[TEST]    - Processing time: 45123.5ms

[TEST] Testing frame 17...
[TEST] ✅ Frame 17 processed successfully in 42.8s
...

============================================================
[TEST] RESULTS SUMMARY
============================================================
[TEST] Frame 16: ✅ PASS
[TEST] Frame 17: ✅ PASS
[TEST] Frame 25: ✅ PASS
[TEST] Frame 26: ✅ PASS

[TEST] Total: 4/4 frames passed
[TEST] ✅ CUDA OOM fix verified - all frames processed successfully!
```

### Option 2: Manual Testing

#### Step 1: Start Flask Wrapper
```bash
cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate
python flask_wrapper_minimal_safe.py
```

Wait for output like:
```
[STARTUP] ✓ Models initialized
[STARTUP] Listening on 0.0.0.0:5000
[STARTUP] Loading models at startup...
```

#### Step 2: Send Test Frame (in another terminal)
```bash
# Create a simple test image and send it
curl -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "frame_number": 16,
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

#### Step 3: Check Response
Success response:
```json
{
  "frame_number": 16,
  "keypoints": [...],
  "has_3d": true,
  "mesh_vertices_data": [...],
  "mesh_faces_data": [...],
  "camera_translation": [...],
  "processing_time_ms": 45123.5,
  "error": null
}
```

Error response (if CUDA OOM still occurs):
```json
{
  "error": "CUDA error: out of memory"
}
```

#### Step 4: Check Logs
Look for these messages in Flask output:
```
[🔴 POSE] 🧹 Frame 16: Pre-clearing GPU memory before ViTDet...
[🔴 POSE] 🧹 Frame 16: Pre-clearing GPU memory before batch transfer...
[🔴 POSE] 🧹 Frame 16: Clearing GPU memory...
[🔴 POSE] ✅ Frame 16: GPU memory cleared
```

## What to Look For

### ✅ Success Indicators
- Frame processes without CUDA OOM error
- Response includes keypoints and mesh data
- Logs show "GPU memory cleared" messages
- Processing time is reasonable (30-60 seconds)

### ❌ Failure Indicators
- CUDA OOM error in response
- No "GPU memory cleared" messages in logs
- Flask crashes or hangs
- Response timeout (>120 seconds)

## Troubleshooting

### Flask Won't Start
```bash
# Check if port 5000 is already in use
lsof -i :5000

# Kill existing process if needed
kill -9 <PID>
```

### CUDA OOM Still Occurs
1. Check GPU memory:
```bash
nvidia-smi
```

2. Check if `torch.cuda.empty_cache()` is being called:
```bash
# Look for these in logs:
# [🔴 POSE] 🧹 Frame X: Pre-clearing GPU memory...
# [🔴 POSE] ✅ Frame X: GPU memory cleared
```

3. If memory is still accumulating, check:
- Are all GPU tensors being extracted to CPU?
- Are GPU tensors being deleted with `del`?
- Are there other GPU operations not being cleared?

### Test Script Hangs
- Flask may still be initializing (can take 30-60 seconds)
- Check Flask logs in another terminal
- If it hangs for >2 minutes, kill and restart

## Performance Expectations

| Metric | Expected | Notes |
|--------|----------|-------|
| Flask startup | 30-60s | Loading models |
| Frame processing | 30-60s | Depends on GPU |
| GPU memory | <12GB | Depends on GPU VRAM |
| Memory per frame | ~2-3GB | Cleared after each frame |

## Next Steps After Testing

### If All Tests Pass ✅
1. Test with full video (multiple consecutive frames)
2. Monitor GPU memory over time
3. Deploy to production

### If Tests Fail ❌
1. Check GPU memory with `nvidia-smi`
2. Verify all `torch.cuda.empty_cache()` calls are in place
3. Check for memory leaks in other code
4. Consider reducing batch size
5. Check logs for detailed error messages

## Files Involved

- `flask_wrapper_minimal_safe.py` - Main Flask wrapper with CUDA OOM fix
- `test_cuda_oom_fix.py` - Automated test script
- `CUDA_OOM_FIX.md` - Detailed fix explanation
- `CUDA_OOM_FIX_COMPLETE.md` - Complete verification report

## Support

For issues or questions:
1. Check the logs in `/tmp/pose-service-logs/`
2. Review `CUDA_OOM_FIX_COMPLETE.md` for detailed information
3. Check GPU memory with `nvidia-smi`
4. Verify all GPU memory clearing points are in place

---

**Last Updated:** December 27, 2025  
**Status:** Ready for Testing
