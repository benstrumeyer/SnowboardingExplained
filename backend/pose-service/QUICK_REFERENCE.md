# Quick Reference - Mesh Overlay System

## Start Server
```bash
cd SnowboardingExplained/backend/pose-service
python app.py
```

## Process Video
- Web UI: http://localhost:5000
- API: POST /process_video with video file

## Expected Behavior

### WSL
- ✓ Pose detection works
- ✓ Video processing completes
- ✗ Mesh rendering skipped (no OpenGL)
- Output: Original frames (no mesh overlay)

### Native System
- ✓ Pose detection works
- ✓ Video processing completes
- ✓ Mesh rendering works
- Output: Frames with mesh overlay

## Check Logs

### Success (WSL)
```
[BATCH_RENDERER] WSL detected - mesh rendering disabled (no OpenGL)
[BATCH] Mesh renderer not available, returning original frames
[PROCESSOR] ✓ Processing complete in 45.2s
```

### Success (Native)
```
[BATCH_RENDERER] Initialized with batch_size=8
[RENDER] ✓ Rendering complete: (1080, 1920, 4)
[PROCESSOR] ✓ Processing complete in 45.2s
```

## Performance
- Pose detection: 100-300ms per frame
- Mesh rendering: 1ms (WSL) or 200-500ms (native) per frame
- Total: 30-40s (WSL) or 30-60s (native) for 300-frame video

## Test Rendering
```bash
python test_mesh_rendering.py
```

## Documentation
- **README_MESH_OVERLAY.md** - Overview
- **FINAL_STATUS.md** - Current status
- **WSL_OPENGL_PRAGMATIC_FIX.md** - Why mesh rendering is skipped in WSL
- **MESH_RENDERING_DEBUG.md** - Debugging guide

## Key Files
- `app.py` - Flask server
- `parallel_video_processor.py` - Main processing pipeline
- `batch_mesh_renderer.py` - Batch rendering (with WSL detection)
- `mesh_renderer.py` - Mesh rendering (with WSL detection)
- `pose_worker_pool.py` - Parallel pose detection

## API Endpoints

### Health Check
```
GET /health
```

### Process Video (Sync)
```
POST /process_video
Content-Type: multipart/form-data
- video: <file>
- num_workers: 4 (optional)
- batch_size: 8 (optional)
```

### Process Video (Async)
```
POST /process_video_async
Content-Type: multipart/form-data
- video: <file>
- num_workers: 4 (optional)
- batch_size: 8 (optional)

Returns: job_id
```

### Check Job Status
```
GET /job_status/<job_id>
```

## Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| Crash | Logs | Check error message |
| No output | File exists? | Check output path |
| Slow | Time > 60s? | Reduce workers/batch |
| No mesh | WSL? | Expected in WSL |

## Environment

- **OS:** Windows (WSL) or Linux
- **GPU:** CUDA (optional, uses CPU if not available)
- **Python:** 3.10+
- **Dependencies:** See requirements.txt

## Next Steps

1. Start server: `python app.py`
2. Process video via web UI
3. Check logs for status
4. Verify output video created
5. For mesh overlay: Deploy on native system

---

**Quick Start:** `python app.py` → http://localhost:5000
