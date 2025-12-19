# Mesh Overlay - Testing Checklist

**Date**: December 19, 2025  
**Status**: Ready for testing

---

## Pre-Testing Setup

- [ ] All files created and in place
  - [ ] `backend/pose-service/mesh_renderer.py`
  - [ ] `backend/pose-service/test_mesh_renderer.py`
  - [ ] `backend/pose-service/hybrid_pose_detector.py` (modified)

- [ ] Dependencies installed
  - [ ] pyrender>=0.1.45
  - [ ] trimesh>=3.20.0
  - [ ] numpy>=1.26.0
  - [ ] torch>=2.0.0
  - [ ] opencv-python>=4.8.0

- [ ] Environment setup
  - [ ] Python 3.8+
  - [ ] CUDA available (optional, for GPU acceleration)
  - [ ] WSL or Linux (for ViTDet)

---

## Unit Tests

### Test 1: Import Test
```bash
cd backend/pose-service
python -c "from mesh_renderer import SMPLMeshRenderer; print('✓ Import successful')"
```
- [ ] Import succeeds
- [ ] No errors

### Test 2: Renderer Creation
```bash
python -c "from mesh_renderer import SMPLMeshRenderer; r = SMPLMeshRenderer(); print('✓ Renderer created')"
```
- [ ] Renderer instantiates
- [ ] No errors

### Test 3: Unit Test Script
```bash
python test_mesh_renderer.py
```
- [ ] Test runs without errors
- [ ] Output shows:
  - [ ] ✓ Successfully imported SMPLMeshRenderer
  - [ ] ✓ Created renderer
  - [ ] ✓ Rendered image shape: (256, 256, 3)
  - [ ] ✓ Output range: [0.000, 1.000]
  - [ ] ✓ Mesh was rendered (output differs from input)

---

## Integration Tests

### Test 4: Pose Service Startup
```bash
cd backend/pose-service
python app.py
```
- [ ] Service starts without errors
- [ ] Logs show:
  - [ ] [HYBRID_POSE_DETECTOR] VERSION: 2024-12-19-v3
  - [ ] [POSE] HMR2 (4D-Humans) available
  - [ ] [POSE] Device: cuda or cpu

### Test 5: Single Frame Detection
Send a test image to the pose service:
```bash
curl -X POST http://localhost:5000/detect_pose \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```
- [ ] Request succeeds
- [ ] Response includes:
  - [ ] `has_3d: true`
  - [ ] `keypoint_count > 0`
  - [ ] `mesh_vertices > 0`
  - [ ] `camera_translation` present

### Test 6: Visualization Generation
Send a test image with visualization request:
```bash
curl -X POST http://localhost:5000/detect_pose_with_visualization \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```
- [ ] Request succeeds
- [ ] Response includes:
  - [ ] `visualization` (base64 PNG)
  - [ ] `mesh_rendered: true`
  - [ ] No errors in logs

### Test 7: Visualization Quality
Decode and inspect the visualization image:
- [ ] Image displays correctly
- [ ] Mesh is visible
- [ ] Mesh has shading (not just wireframe)
- [ ] Skeleton is visible
- [ ] Mesh aligns with skeleton
- [ ] No artifacts or distortions

---

## Video Tests

### Test 8: Single Video Frame
Process a single frame from a snowboarding video:
- [ ] Frame loads successfully
- [ ] Pose detection works
- [ ] Mesh renders
- [ ] Mesh aligns with rider
- [ ] No errors in logs

### Test 9: Multiple Frames
Process 10 consecutive frames:
- [ ] All frames process successfully
- [ ] Mesh stays on rider across frames
- [ ] No drift or floating
- [ ] Performance acceptable (~100-150ms per frame)

### Test 10: Different Poses
Test with various snowboarding poses:
- [ ] Carving
- [ ] Jumping
- [ ] Spinning
- [ ] Grabbing
- [ ] Landing

For each:
- [ ] Mesh renders correctly
- [ ] Mesh aligns with body
- [ ] No distortions

---

## Performance Tests

### Test 11: Rendering Time
Measure mesh rendering time:
```python
import time
start = time.time()
result = renderer.render_mesh_on_image(...)
elapsed = (time.time() - start) * 1000
print(f"Rendering time: {elapsed:.1f}ms")
```
- [ ] Rendering time: 50-100ms
- [ ] Acceptable for real-time use

### Test 12: Memory Usage
Monitor memory during rendering:
- [ ] Memory usage reasonable
- [ ] No memory leaks
- [ ] No out-of-memory errors

### Test 13: GPU Utilization
Check GPU usage (if available):
- [ ] GPU is being used
- [ ] GPU memory reasonable
- [ ] No GPU errors

---

## Edge Cases

### Test 14: No Person Detected
Send image with no person:
- [ ] Graceful handling
- [ ] No mesh rendered
- [ ] No errors

### Test 15: Multiple People
Send image with multiple people:
- [ ] All people detected
- [ ] All meshes rendered
- [ ] No overlapping issues

### Test 16: Partial Person
Send image with person partially out of frame:
- [ ] Detection works
- [ ] Mesh renders (partial)
- [ ] No errors

### Test 17: Poor Lighting
Send image with poor lighting:
- [ ] Detection works
- [ ] Mesh renders
- [ ] Quality acceptable

### Test 18: Fast Motion
Send frames with fast motion:
- [ ] Detection works
- [ ] Mesh follows motion
- [ ] No lag or artifacts

---

## Debugging Tests

### Test 19: Check Logs
Verify logging output:
- [ ] [VIZ] Rendering X vertices with pyrender (exact 4D-Humans)
- [ ] [VIZ] cam_t_full: [tx, ty, tz]
- [ ] [VIZ] scaled_focal: XXXX.X
- [ ] [VIZ] ✓ Mesh rendered with pyrender

### Test 20: Check Camera Parameters
Verify camera transformation:
```python
# In logs, check:
# [HMR2] pred_cam (crop space): [s, tx, ty]
# [HMR2] box_center: [cx, cy]
# [HMR2] box_size: b
# [HMR2] img_size: [w, h]
# [HMR2] scaled_focal_length: f
# [HMR2] pred_cam_t_full: [tx, ty, tz]
```
- [ ] All parameters logged
- [ ] Values reasonable
- [ ] Transformation correct

---

## Comparison Tests

### Test 21: Before vs After
Compare old wireframe with new pyrender:
- [ ] New version looks better
- [ ] Mesh more visible
- [ ] Alignment clearer
- [ ] Shading helps judgment

### Test 22: vs 4D-Humans Reference
Compare with 4D-Humans demo output:
- [ ] Similar appearance
- [ ] Similar alignment
- [ ] Similar quality

---

## Regression Tests

### Test 23: Existing Functionality
Verify nothing broke:
- [ ] `detect_pose()` still works
- [ ] Skeleton overlay still works
- [ ] Joint angles still computed
- [ ] No breaking changes

### Test 24: Backward Compatibility
Test with old code paths:
- [ ] Fallback if pyrender unavailable
- [ ] Graceful degradation
- [ ] No crashes

---

## Documentation Tests

### Test 25: Documentation Accuracy
Verify documentation:
- [ ] MESH_RENDERING_GUIDE.md accurate
- [ ] MESH_OVERLAY_IMPLEMENTATION.md accurate
- [ ] WHY_THIS_WORKS.md accurate
- [ ] QUICK_REFERENCE.md accurate
- [ ] Code examples work

---

## Final Verification

### Test 26: Code Quality
- [ ] No syntax errors
- [ ] No import errors
- [ ] Type hints present
- [ ] Docstrings complete
- [ ] Logging comprehensive

### Test 27: Performance Acceptable
- [ ] Rendering: 50-100ms per frame
- [ ] Total: 100-150ms per frame
- [ ] Real-time capable
- [ ] No bottlenecks

### Test 28: Mesh Quality
- [ ] Mesh visible
- [ ] Mesh aligned
- [ ] Mesh shaded
- [ ] Mesh smooth
- [ ] No artifacts

### Test 29: User Experience
- [ ] Easy to use
- [ ] Clear output
- [ ] Good visualization
- [ ] Professional appearance

### Test 30: Production Ready
- [ ] All tests pass
- [ ] Documentation complete
- [ ] No known issues
- [ ] Ready to deploy

---

## Sign-Off

- [ ] All tests completed
- [ ] All tests passed
- [ ] No critical issues
- [ ] Ready for production

**Tested by**: _______________  
**Date**: _______________  
**Status**: ✅ APPROVED / ❌ NEEDS FIXES

---

## Notes

Use this space to document any issues found:

```
Issue 1:
- Description:
- Severity: Critical / High / Medium / Low
- Fix:

Issue 2:
- Description:
- Severity: Critical / High / Medium / Low
- Fix:
```

---

## Next Steps

After all tests pass:
1. [ ] Deploy to production
2. [ ] Monitor for issues
3. [ ] Gather user feedback
4. [ ] Plan enhancements

