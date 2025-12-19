# Mesh Projection Debug - Action Plan

## Current Status
- ✓ ViTDet caching implemented
- ✓ HMR2 loading implemented
- ✓ Mesh rendering pipeline created
- ❌ Mesh not properly overlaid on rider

## Root Cause
The mesh projection pipeline has issues at one or more of these stages:
1. ViTDet detection (not detecting rider correctly)
2. HMR2 inference (not getting right crop or parameters)
3. Camera transformation (formula or parameters wrong)
4. Vertex projection (focal length or offset wrong)
5. Mesh rendering (triangles not rasterizing correctly)

## Immediate Actions

### Step 1: Run Debug Tests
```bash
cd SnowboardingExplained/backend/pose-service
venv\Scripts\python.exe test_projection_debug.py
```

This will test:
- Camera transformation formula
- Vertex projection math
- Basic rendering pipeline

### Step 2: Add Comprehensive Logging
The code already has detailed logging added. When you upload a video, check the pose service logs for:

**ViTDet Detection:**
```
[POSE] Running ViTDet detection on WxH image...
[POSE] ViTDet raw output: N detections
[POSE] Classes: [...]
[POSE] Scores: [...]
[POSE] After filtering (class=0, score>0.3): N detections
[POSE] ✓ ViTDet detected N person(s)
[POSE] Largest box: [x1, y1, x2, y2]
[POSE] Final box with margin and square: (x1, y1) to (x2, y2), size=S
```

**HMR2 Output:**
```
[POSE] ===== HMR2 OUTPUT DEBUG =====
[POSE] Vertices shape: (6890, 3)
[POSE] Vertices bounds: x=[...], y=[...], z=[...]
[POSE] pred_cam_t (full space): [tx, ty, tz]
[POSE] pred_cam (crop space): [s, tx, ty]
[POSE] Box center: [cx, cy]
[POSE] Box size: S
[POSE] Image size: [W, H]
```

**Mesh Rendering:**
```
[VIZ] ===== STARTING VISUALIZATION FOR FRAME N =====
[VIZ] ===== MESH RENDERING ATTEMPT =====
[VIZ] has_3d=True
[VIZ] has_renderer=True
[VIZ] has_attr=True
[VIZ] has_result=True
[MESH] ===== PROJECTION DEBUG =====
[MESH] Image size: WxH
[MESH] Focal length: F
[MESH] Box center: [cx, cy]
[MESH] Box size: S
[MESH] cam_crop (crop space): [s, tx, ty]
[MESH] cam_t_full (full space): [tx_full, ty_full, tz_full]
[MESH] Sample vertex projections:
[MESH]   Vertex 0: 3D=(...) -> 2D=(...)
[MESH] Projected vertex bounds: x=[...], y=[...]
[MESH] Image bounds: x=[0, W], y=[0, H]
[MESH] Vertices in bounds: N/6890
[MESH] Rendering complete: N triangles rendered, S skipped
[MESH] Total pixels rendered: P
```

### Step 3: Analyze Logs
Look for:
1. **Is ViTDet detecting the rider?**
   - Should see "✓ ViTDet detected 1 person(s)"
   - If not, detection is the problem

2. **Are vertices projecting to reasonable positions?**
   - Should see vertices in image bounds
   - If all vertices are outside bounds, projection is wrong

3. **Are triangles rendering?**
   - Should see "N triangles rendered" where N > 0
   - If N=0, rendering is the problem

### Step 4: Fix Based on Findings

**If ViTDet not detecting:**
- Lower confidence threshold (currently 0.3)
- Check if rider is visible in frame
- Try different detection approach

**If vertices out of bounds:**
- Check focal length calculation
- Check camera transformation formula
- Verify box_center and box_size are correct

**If triangles not rendering:**
- Check triangle rasterization
- Verify alpha blending
- Check for degenerate triangles

## Testing Strategy

### Test 1: Simple Cube
Use the test script to verify basic projection works with a simple cube

### Test 2: Single Frame
Upload a video and check logs for a single frame

### Test 3: Multiple Frames
Once single frame works, test with multiple frames

### Test 4: Different Poses
Test with rider in different poses (carving, spinning, etc.)

## Success Metrics
- ✓ Mesh appears on rider
- ✓ Mesh aligns with body
- ✓ Mesh maintains shape during motion
- ✓ No visual artifacts
- ✓ Performance < 150ms per frame (after first load)

## Files to Monitor
- `SnowboardingExplained/backend/pose-service/hybrid_pose_detector.py` - Detection and HMR2
- `SnowboardingExplained/backend/pose-service/mesh_renderer.py` - Projection and rendering
- `SnowboardingExplained/backend/pose-service/app.py` - Flask endpoint
- `SnowboardingExplained/backend/src/services/meshVisualizationService.ts` - Frontend service

## Next Session
Once you run the tests and upload a video, share:
1. Output from `test_projection_debug.py`
2. Pose service logs from video upload
3. Screenshot of what you see on frontend

This will give us the data needed to pinpoint and fix the issue.
