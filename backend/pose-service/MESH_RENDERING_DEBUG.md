# Mesh Rendering Debug Guide

## Overview
The mesh rendering pipeline has been enhanced with comprehensive logging to help diagnose why mesh overlays aren't appearing on output videos.

## Pipeline Flow

```
Video Input
    ↓
Extract Frames
    ↓
Parallel Pose Detection (4 workers)
    ├─ HMR2 model inference
    ├─ Extract mesh vertices & faces
    └─ Extract camera translation
    ↓
Batch Mesh Rendering
    ├─ Create pyrender OffscreenRenderer
    ├─ Create trimesh from vertices/faces
    ├─ Apply 180° rotation
    ├─ Create pyrender scene
    ├─ Setup camera with intrinsics
    ├─ Add Raymond lights
    ├─ Render to RGBA
    └─ Blend with original frame
    ↓
Assemble Output Video
```

## Key Logging Points

### 1. Pose Detection (hybrid_pose_detector.py)
```
[HMR2] Starting HMR2 detection (demo-style)
[HMR2] ✓ ViTDet found X persons
[HMR2] Running HMR2 model inference...
[HMR2] ✓ Detection complete
[HMR2] Vertices: (6890, 3)
[HMR2] Joints 3D: (24, 3)
```

**What to look for:**
- Vertices should be ~6890 (SMPL model)
- Joints 3D should be 24 (SMPL joints)
- Camera translation should be [tx, ty, tz] with tz > 0

### 2. Pose Worker Pool (pose_worker_pool.py)
```
[WORKER-0] Frame 0: ✓ 150ms (6890 vertices)
[WORKER-0] Frame 1: ✗ No mesh data (error: ...)
```

**What to look for:**
- All frames should show mesh data
- If "No mesh data", check the error message
- Processing time should be 100-300ms per frame

### 3. Parallel Processor (parallel_video_processor.py)
```
[RENDER] Frame 0: Adding task - vertices (6890, 3) (float32), faces (13776, 3) (int32), cam_t (3,) (float32)
[RENDER] Frame 1: pose detected but no mesh data (vertices=False, faces=False)
[RENDER] Added 150 frames for rendering
```

**What to look for:**
- Vertices should be float32
- Faces should be int32
- Camera translation should be float32
- All frames should have mesh data

### 4. Batch Mesh Renderer (batch_mesh_renderer.py)
```
[BATCH] Rendering batch of 8 frames
[BATCH] Frame 0: Starting render (vertices=(6890, 3), faces=(13776, 3), cam_t=[...], focal=5000.0)
[BATCH] Frame 0: ✓ 250ms
[BATCH] Batch complete: 8 frames in 2000ms (250ms/frame) - 8 successful
```

**What to look for:**
- All frames should show "Starting render"
- All frames should show "✓" (success)
- Rendering time should be 200-500ms per frame
- If errors, check the exception message

### 5. Mesh Renderer (mesh_renderer.py)
```
[RENDER] Starting render: Image 1920x1080, Vertices: 6890, Faces: 13776
[RENDER] Camera: [0.1, 0.2, 2.5], Focal: 5000.0
[RENDER] Mesh bounds: min=[-0.5, -0.5, -0.5], max=[0.5, 0.5, 0.5], center=[0.0, 0.0, 0.0]
[RENDER] Creating OffscreenRenderer: 1920x1080
[RENDER] ✓ OffscreenRenderer created
[RENDER] Creating trimesh from 6890 vertices and 13776 faces
[RENDER] ✓ Trimesh created
[RENDER] Applying 180° rotation around X-axis
[RENDER] ✓ Rotation applied
[RENDER] Converting trimesh to pyrender mesh
[RENDER] ✓ Pyrender mesh created
[RENDER] Creating scene
[RENDER] ✓ Scene created with mesh
[RENDER] Setting up camera
[RENDER] Camera position (after flip): [-0.1, 0.2, 2.5]
[RENDER] Creating intrinsics camera: fx=5000.0, fy=5000.0, cx=960.0, cy=540.0
[RENDER] ✓ Camera added to scene
[RENDER] Adding Raymond lights
[RENDER] ✓ Added 3 lights
[RENDER] Starting pyrender rendering...
[RENDER] ✓ Rendering complete: (1080, 1920, 4)
[RENDER] ✓ Renderer cleaned up
[RENDER] Blending mesh with original image
[RENDER] Rendered mesh pixels: 50000 / 2073600 (2.4%)
[RENDER] ✓ Blending complete, output shape: (1080, 1920, 3)
```

**What to look for:**
- All steps should show "✓"
- Rendered mesh pixels should be > 0
- If "✗" appears, check the error message
- If rendering fails, it will raise an exception

## Common Issues and Solutions

### Issue 1: "No mesh data" in pose detection
**Symptoms:**
```
[WORKER-0] Frame 0: ✗ No mesh data (error: ...)
```

**Causes:**
- HMR2 model failed to detect pose
- ViTDet didn't find person in frame
- Mesh extraction failed

**Solution:**
- Check if person is visible in frame
- Check HMR2 error message
- Verify ViTDet detection worked

### Issue 2: "Failed to create OffscreenRenderer"
**Symptoms:**
```
[RENDER] ✗ Failed to create OffscreenRenderer: ...
```

**Causes:**
- OpenGL/pyrender initialization failed
- WSL graphics issues
- Missing dependencies

**Solution:**
- Check if pyrender is installed: `pip list | grep pyrender`
- Check if OpenGL is available: `glxinfo` (in WSL)
- Try running test_mesh_rendering.py

### Issue 3: "Rendering failed"
**Symptoms:**
```
[RENDER] ✗ Rendering failed: ...
```

**Causes:**
- Invalid mesh data
- Camera parameters out of range
- pyrender internal error

**Solution:**
- Check mesh bounds (should be reasonable)
- Check camera translation (tz should be > 0)
- Check focal length (should be > 0)

### Issue 4: "Rendered mesh pixels: 0"
**Symptoms:**
```
[RENDER] Rendered mesh pixels: 0 / 2073600 (0.0%)
```

**Causes:**
- Mesh is outside camera view
- Camera is inside mesh
- Mesh is too small/large
- Clipping planes wrong

**Solution:**
- Check mesh bounds vs camera position
- Verify camera translation is correct
- Check focal length is reasonable
- Verify mesh vertices are in correct space

## Testing

Run the test script to verify mesh rendering works:

```bash
cd SnowboardingExplained/backend/pose-service
python test_mesh_rendering.py
```

This will:
1. Test SMPLMeshRenderer directly with a simple cube
2. Test BatchMeshRenderer with multiple frames
3. Report success/failure

## Debugging Steps

1. **Check pose detection:**
   - Look for `[HMR2] ✓ Detection complete` in logs
   - Verify vertices and joints are extracted

2. **Check worker pool:**
   - Look for `[WORKER-X] Frame Y: ✓` in logs
   - Verify mesh data is collected

3. **Check batch renderer:**
   - Look for `[BATCH] Frame X: ✓` in logs
   - Verify all frames render successfully

4. **Check mesh renderer:**
   - Look for `[RENDER] ✓ Rendering complete` in logs
   - Verify rendered mesh pixels > 0

5. **Check output video:**
   - Verify output file exists and has size > 0
   - Play video and check if mesh is visible
   - If not visible, check "Rendered mesh pixels" count

## Performance Expectations

- Pose detection: 100-300ms per frame (4 workers in parallel)
- Mesh rendering: 200-500ms per frame (batch of 8)
- Total for 300-frame video: ~30-60 seconds

## Next Steps

If mesh rendering is still not working:

1. Run test_mesh_rendering.py to isolate the issue
2. Check all logging output for errors
3. Verify pyrender/OpenGL is working in WSL
4. Check if mesh data is valid (bounds, vertices, faces)
5. Verify camera parameters are correct
