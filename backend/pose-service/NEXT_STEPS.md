# Next Steps - Testing Mesh Rendering

## What Was Done

Enhanced the mesh rendering pipeline with comprehensive logging and validation to diagnose why mesh overlays aren't appearing. The system now provides detailed logs at every step of the process.

## What You Should Do Now

### Step 1: Test Mesh Rendering Directly

Run the test script to verify the rendering pipeline works:

```bash
cd SnowboardingExplained/backend/pose-service
python test_mesh_rendering.py
```

**Expected output:**
```
[RENDER] Starting render: Image 256x256, Vertices: 8, Faces: 12
[RENDER] ✓ OffscreenRenderer created
[RENDER] ✓ Trimesh created
[RENDER] ✓ Pyrender mesh created
[RENDER] ✓ Rendering complete: (256, 256, 4)
[RENDER] Rendered mesh pixels: 1000 / 65536 (1.5%)
✓ Mesh was rendered (pixels changed)
```

If this test passes, mesh rendering is working. If it fails, there's an issue with pyrender/OpenGL in your WSL environment.

### Step 2: Process a Test Video

Start the Flask server:

```bash
cd SnowboardingExplained/backend/pose-service
python app.py
```

Wait for the warmup to complete:
```
[STARTUP] Auto-warming up models...
[WARMUP] Loading HMR2 model...
[WARMUP] HMR2 loaded in 85.0s
[WARMUP] Loading ViTDet model...
[WARMUP] ViTDet loaded in 120.0s
[STARTUP] Ready to accept requests!
```

Then process a video via the API (or use the web UI at http://localhost:5000).

### Step 3: Check the Logs

Look for these key indicators:

**Pose Detection:**
```
[HMR2] ✓ Detection complete
[HMR2] Vertices: (6890, 3)
[HMR2] Joints 3D: (24, 3)
```

**Mesh Rendering:**
```
[BATCH] Frame 0: Starting render (vertices=(6890, 3), faces=(13776, 3), ...)
[BATCH] Frame 0: ✓ 250ms
[RENDER] ✓ Rendering complete: (1080, 1920, 4)
[RENDER] Rendered mesh pixels: 50000 / 2073600 (2.4%)
```

**Success:**
```
[BATCH] Batch complete: 8 frames in 2000ms (250ms/frame) - 8 successful
```

### Step 4: Check Output Video

After processing completes, check the output video:

1. **File exists:** Output file should be created in temp directory
2. **File size:** Should be > 1MB (not empty)
3. **Play video:** Open in video player and check if mesh is visible
4. **Mesh visible:** Should see 3D skeleton overlay on person

### Step 5: Interpret Results

**If mesh is visible:**
✓ Everything is working! The mesh rendering pipeline is functional.

**If mesh is NOT visible but logs show success:**
- Check "Rendered mesh pixels" count
- If 0, mesh is outside camera view (camera params issue)
- If > 0, mesh rendered but blending may have issues
- Check MESH_RENDERING_DEBUG.md for solutions

**If logs show errors:**
- Check the specific error message
- Look up the error in MESH_RENDERING_DEBUG.md
- Run test_mesh_rendering.py to isolate the issue

## Key Files to Monitor

1. **MESH_OVERLAY_FIX_SUMMARY.md** - Overview of changes
2. **MESH_RENDERING_DEBUG.md** - Detailed debugging guide
3. **test_mesh_rendering.py** - Test script
4. **batch_mesh_renderer.py** - Batch rendering with logging
5. **mesh_renderer.py** - Core rendering with logging

## Common Scenarios

### Scenario 1: Test passes, video processing fails
- Issue is likely in pose detection or data flow
- Check pose worker logs for errors
- Verify mesh data is being extracted

### Scenario 2: Test fails with OpenGL error
- pyrender/OpenGL not working in WSL
- May need to install graphics libraries
- Check WSL graphics setup

### Scenario 3: Video processes but mesh not visible
- Mesh is rendering but not visible
- Check "Rendered mesh pixels" count
- Verify camera parameters are correct
- Check mesh bounds vs camera position

### Scenario 4: Rendering is very slow
- Normal: 200-500ms per frame
- If slower, may be CPU-bound
- Try reducing batch_size or num_workers

## Performance Expectations

- **Pose detection:** 100-300ms per frame (4 workers in parallel)
- **Mesh rendering:** 200-500ms per frame (batch of 8)
- **Total for 300-frame video:** ~30-60 seconds

## If Everything Works

Great! The mesh rendering pipeline is functional. You can now:

1. Process videos with mesh overlays
2. Adjust parameters (num_workers, batch_size) for performance
3. Integrate with your main application
4. Deploy to production

## If Something Doesn't Work

1. Check the logs carefully for error messages
2. Run test_mesh_rendering.py to isolate the issue
3. Refer to MESH_RENDERING_DEBUG.md for specific solutions
4. Check if pyrender/OpenGL is properly installed
5. Verify WSL graphics setup if running in WSL

## Questions to Ask Yourself

1. **Does test_mesh_rendering.py pass?**
   - If yes: rendering works, issue is in data flow
   - If no: rendering doesn't work, check pyrender/OpenGL

2. **Do logs show mesh data being extracted?**
   - If yes: pose detection works
   - If no: check HMR2 error message

3. **Do logs show rendering completing?**
   - If yes: rendering works, check output
   - If no: check rendering error message

4. **Is output video file created?**
   - If yes: video assembly works
   - If no: check assembly error message

5. **Is mesh visible in output video?**
   - If yes: everything works!
   - If no: check "Rendered mesh pixels" count

## Support

If you get stuck:

1. Check MESH_RENDERING_DEBUG.md for your specific issue
2. Run test_mesh_rendering.py to isolate the problem
3. Check logs for error messages
4. Verify all dependencies are installed
5. Check WSL graphics setup if applicable
