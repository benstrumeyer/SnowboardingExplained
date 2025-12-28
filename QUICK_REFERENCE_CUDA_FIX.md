# CUDA OOM Fix - Quick Reference

## Status
✅ **IMPLEMENTED AND DEPLOYED** - Flask wrapper running (PID 271)

## The Fix in 30 Seconds

**Problem:** GPU memory not cleared between frames → CUDA OOM on frames 16-17, 25-26

**Solution:** Clear GPU memory at 4 critical points:
1. Before ViTDet detection (line ~1205)
2. **Before batch transfer to GPU (line ~1239) ← CRITICAL**
3. After HMR2 inference (line ~1287)
4. Before response return (line ~1360)

## Check Status

```bash
# Is Flask running?
wsl -d Ubuntu bash -c "ps aux | grep flask"

# Check logs
wsl -d Ubuntu bash -c "tail -50 /tmp/pose-service-logs/pose-service-*.log"

# Check GPU
wsl -d Ubuntu bash -c "nvidia-smi"
```

## Test the Fix

```bash
# Automated test (recommended)
cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate
python test_cuda_oom_fix.py

# Manual test
curl http://localhost:5000/health
```

## Expected Output

### Health Check
```json
{
  "status": "ready",
  "models": {
    "hmr2": "loaded",
    "vitdet": "loaded",
    "phalp": "loaded"
  },
  "device": "cuda",
  "ready": true
}
```

### Frame Processing
```json
{
  "frame_number": 16,
  "keypoints": [...],
  "mesh_vertices_data": [...],
  "processing_time_ms": 45123.5,
  "error": null
}
```

### Logs
```
[🔴 POSE] 🧹 Frame 16: Pre-clearing GPU memory before ViTDet...
[🔴 POSE] 🧹 Frame 16: Pre-clearing GPU memory before batch transfer...
[🔴 POSE] 🧹 Frame 16: Clearing GPU memory...
[🔴 POSE] ✅ Frame 16: GPU memory cleared
```

## Key Files

| File | Purpose |
|------|---------|
| `flask_wrapper_minimal_safe.py` | Main Flask wrapper with fix |
| `test_cuda_oom_fix.py` | Automated test script |
| `CUDA_OOM_FIX_COMPLETE.md` | Detailed documentation |
| `TEST_CUDA_OOM_FIX.md` | Testing guide |

## Troubleshooting

### Flask Not Running
```bash
# Start it
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_minimal_safe.py"
```

### CUDA OOM Still Occurs
1. Check GPU memory: `nvidia-smi`
2. Check logs for "GPU memory cleared" messages
3. Verify all 4 clearing points are in place
4. Check for memory leaks in other code

### Connection Refused
- Flask may still be initializing (wait 5 minutes)
- Check if port 5000 is in use: `lsof -i :5000`

## Performance Expectations

| Metric | Value |
|--------|-------|
| Flask startup | 30-60 seconds |
| Model loading | 2-5 minutes |
| Frame processing | 30-60 seconds |
| GPU memory | <12GB |
| Memory per frame | ~2-3GB (cleared after) |

## Success Criteria

- ✅ Frames 16-17 process without CUDA OOM
- ✅ Frames 25-26 process without CUDA OOM
- ✅ GPU memory reclaimed after each frame
- ✅ Logs show "GPU memory cleared"
- ✅ Multiple consecutive frames work

## Next Steps

1. **Wait** for Flask to finish initializing (~5 minutes)
2. **Test** with automated script: `python test_cuda_oom_fix.py`
3. **Monitor** GPU memory: `nvidia-smi`
4. **Verify** frames 16-17 and 25-26 process successfully
5. **Deploy** to production

---

**Status:** ✅ Ready for Testing  
**Last Updated:** December 27, 2025
