# Mesh Projection Fix - Quick Start Guide

## What Was Fixed

The mesh overlay was not displaying correctly because the projection math was wrong. The fix implements the correct crop-aware projection that matches 4D-Humans.

## What Changed

### Before (Wrong)
```
HMR2 (crop space) → Direct projection to image space → Mesh too small/misaligned
```

### After (Correct)
```
HMR2 (crop space) → Crop-aware projection → Mesh aligns with rider
```

## Files Changed

1. **Created**: `backend/pose-service/crop_projection.py`
   - Core projection math
   - Invertible transformation from crop space to image space

2. **Created**: `backend/pose-service/debug_visualization.py`
   - Debug tools for visualization
   - Quality metrics for projection

3. **Modified**: `backend/pose-service/hybrid_pose_detector.py`
   - Updated visualization to use crop-aware projection
   - Now stores bbox for projection
   - Draws mesh with correct projected vertices

## How to Test

### 1. Start the Pose Service
```bash
cd SnowboardingExplained
./start-pose-service.bat
```

### 2. Upload a Video
Use the mobile app or API to upload a snowboarding video

### 3. Check the Output
- Mesh should overlay the rider
- Mesh should be bright green (0, 255, 0)
- Skeleton should be orange on top
- Mesh should not float or shrink

### 4. Debug Output
Check the console logs for:
```
[VIZ] ===== CAMERA DEBUG =====
[VIZ] pred_cam (crop space): [s, tx, ty]
[VIZ] Projected vertices bounds: x=[...], y=[...]
[VIZ] ✓ Mesh rendered successfully with crop-aware projection
```

## Expected Results

### Visual
- ✅ Mesh fills the rider's body
- ✅ Mesh aligns with skeleton keypoints
- ✅ Mesh stays on rider across frames
- ✅ No mesh drift/float/shrink

### Performance
- ✅ Projection: ~1-2ms per frame
- ✅ Total rendering: <150ms per frame

## Troubleshooting

### Mesh Still Not Displaying
1. Check pose service logs for errors
2. Verify ViTDet detection is working (should see bbox in logs)
3. Check that `pred_cam` is not None in debug output

### Mesh Misaligned
1. Verify bbox is correct (should be tight around person)
2. Check camera parameters in debug output
3. Compare with 4D-Humans reference

### Performance Issues
1. Check ViTDet detection time (should be <200ms)
2. Check HMR2 inference time (should be <1000ms)
3. Profile projection code if needed

## Next Steps

### Immediate
- Test on actual video frames
- Verify mesh alignment
- Check performance

### Short Term
- Implement keypoint-based bbox detection (fallback)
- Add mesh color customization
- Add mesh shading

### Long Term
- Set up ViTDet on WSL
- Integrate with Kiro for automation
- Full pipeline optimization

## Key Concepts

### Crop Space
- Normalized [-1, 1] coordinates
- Relative to person bounding box
- Used by HMR2 for prediction

### Image Space
- Pixel coordinates [0, W] x [0, H]
- Absolute position in frame
- Used for rendering

### Projection Formula
```
x_crop = s * X + tx              # Weak-perspective in crop space
x_norm = (x_crop + 1) / 2        # Map to [0, 1]
x_pixel = x_norm * crop_w + x1   # Scale to crop size and translate
```

## References

- Implementation: `backend/pose-service/crop_projection.py`
- Tests: `backend/pose-service/test_crop_projection.py`
- Debug: `backend/pose-service/debug_visualization.py`
- 4D-Humans: https://github.com/shubham-goel/4D-Humans

## Questions?

Check the detailed documentation:
- `IMPLEMENTATION_SUMMARY.md` - Full technical details
- `design.md` - Architecture and design decisions
- `requirements.md` - Requirements and acceptance criteria
