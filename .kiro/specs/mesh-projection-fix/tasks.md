# Mesh Projection Fix - Implementation Plan (Path C: ViTDet + Crop-Aware)

## Overview

This plan implements the complete fix: ViTDet person detection + crop-aware projection math. This matches the 4D-Humans demo exactly.

---

## Phase 1: ViTDet Setup on WSL (2-3 hours)

### 1.1 Set Up WSL Environment
- [ ] Verify WSL2 is installed with Ubuntu 20.04 or 22.04
- [ ] Install Python 3.9+ in WSL
- [ ] Create virtual environment for pose-service
- [ ] Install PyTorch with CUDA support in WSL
- [ ] Verify GPU access: `python -c "import torch; print(torch.cuda.is_available())"`
- **Requirements**: Setup, environment configuration

### 1.2 Install Detectron2 in WSL
- [ ] Clone detectron2 repo: `git clone https://github.com/facebookresearch/detectron2.git`
- [ ] Install build dependencies: `sudo apt-get install build-essential python3-dev`
- [ ] Install detectron2: `cd detectron2 && pip install -e .`
- [ ] Verify installation: `python -c "import detectron2; print(detectron2.__version__)"`
- [ ] Download ViTDet model weights (~500MB)
- **Requirements**: 1.1, 1.2

### 1.3 Test ViTDet Detection
- [ ] Create test script: `test_vitdet.py`
- [ ] Load ViTDet model
- [ ] Run detection on sample image
- [ ] Verify output format: bounding boxes with confidence scores
- [ ] Log detection results
- **Requirements**: 1.1, 1.2

### 1.4 Port ViTDet to Pose Service
- [ ] Copy detectron2 installation to pose-service venv
- [ ] Update `requirements.txt` to include detectron2
- [ ] Update `hmr2_loader.py` to remove pyrender mocking
- [ ] Enable ViTDet import in `hybrid_pose_detector.py`
- [ ] Test ViTDet loads without errors
- **Requirements**: 1.1, 1.2

---

## Phase 2: Implement Crop-Aware Projection (2-3 hours)

### 2.1 Create Projection Math Module
- [ ] Create `crop_projection.py` with core functions
- [ ] Implement `project_smpl_crop_to_image()` function
  - Input: vertices (N, 3), camera (s, tx, ty), bbox (x1, y1, x2, y2), img_size (H, W)
  - Output: projected_2d (N, 2)
  - Math: weak-perspective in crop space → map to image pixels
- [ ] Implement `project_smpl_image_to_crop()` (inverse)
- [ ] Add docstrings with math explanation
- [ ] Add type hints
- **Requirements**: 2.1, 2.2, 5.1

### 2.2 Write Unit Tests for Projection
- [ ] Test projection with known inputs/outputs
- [ ] Test invertibility: project → unproject → original
- [ ] Test edge cases: vertices at bbox corners, outside bbox
- [ ] Test numerical stability: large/small camera scales
- [ ] Verify against 4D-Humans reference implementation
- **Requirements**: 2.1, 2.2, 5.1

### 2.3 Integrate Projection into Renderer
- [ ] Update `simple_mesh_renderer.py` to use crop-aware projection
- [ ] Replace direct projection with `project_smpl_crop_to_image()`
- [ ] Pass bbox and camera parameters to renderer
- [ ] Test rendering with correct projection
- **Requirements**: 2.1, 2.3

### 2.4 Update HybridPoseDetector
- [ ] Modify `detect_pose_with_visualization()` to use crop-aware projection
- [ ] Pass bbox from ViTDet to projection function
- [ ] Pass camera parameters correctly
- [ ] Test end-to-end: frame → ViTDet → HMR2 → projection → render
- **Requirements**: 2.1, 2.3, 2.4

---

## Phase 3: Debug Visualization (1-2 hours)

### 3.1 Create Debug Visualization Function
- [ ] Create `debug_visualization.py`
- [ ] Implement `visualize_projection_debug()` function
- [ ] Draw detected bbox as green rectangle
- [ ] Draw projected 2D keypoints as red circles
- [ ] Draw mesh wireframe in yellow
- [ ] Add text labels: bbox size, keypoint count, camera params
- **Requirements**: 4.1, 4.2, 4.3, 4.4

### 3.2 Add Debug Endpoint
- [ ] Add `/debug/projection` endpoint to `app.py`
- [ ] Returns visualization image + projection metrics
- [ ] Logs intermediate values: bbox, camera, projected points
- [ ] Helps diagnose if projection is correct
- **Requirements**: 4.1, 4.2, 4.3, 4.4

### 3.3 Test Debug Visualization
- [ ] Run on test frame
- [ ] Verify bbox is drawn correctly
- [ ] Verify keypoints align with skeleton
- [ ] Verify mesh overlays rider
- [ ] Compare with 4D-Humans demo output
- **Requirements**: 4.1, 4.2, 4.3, 4.4, 5.2

---

## Phase 4: Validation Against 4D-Humans (1-2 hours)

### 4.1 Compare Projection Math
- [ ] Extract 4D-Humans projection code
- [ ] Line-by-line comparison with our implementation
- [ ] Document any intentional differences
- [ ] Verify math is identical
- **Requirements**: 5.1, 5.4

### 4.2 Test on Same Frame as Demo
- [ ] Get test frame from 4D-Humans demo
- [ ] Run through our pipeline
- [ ] Run through 4D-Humans demo
- [ ] Compare projected 2D keypoints (should be identical within 1 pixel)
- [ ] Compare mesh overlay (should be visually identical)
- **Requirements**: 5.2, 5.3

### 4.3 Test on Multiple Frames
- [ ] Test on 5-10 snowboarding frames
- [ ] Verify mesh stays on rider across frames
- [ ] Check for drift/float/shrink artifacts
- [ ] Log alignment metrics: keypoint error, mesh coverage
- **Requirements**: 2.4, 5.2, 5.3

### 4.4 Document Results
- [ ] Create comparison report: our output vs. 4D-Humans
- [ ] Document any differences and why
- [ ] Include before/after screenshots
- [ ] Update design doc with findings
- **Requirements**: 5.4

---

## Phase 5: Property-Based Testing (1-2 hours)

### 5.1 Test Projection Invertibility
- [ ] **Property 1**: For any vertex, project → unproject → original
- [ ] Generate random vertices in crop space
- [ ] Project to image space
- [ ] Unproject back to crop space
- [ ] Verify within floating-point precision
- **Requirements**: Property 1

### 5.2 Test Keypoint-Mesh Alignment
- [ ] **Property 2**: Projected keypoints align with mesh skeleton
- [ ] Generate random frames
- [ ] Project keypoints and mesh
- [ ] Measure distance between keypoints and nearest mesh vertex
- [ ] Verify within 5 pixels
- **Requirements**: Property 2

### 5.3 Test Projection Consistency
- [ ] **Property 4**: Mesh alignment consistent across frame sequence
- [ ] Generate frame sequence
- [ ] Project mesh for each frame
- [ ] Measure drift: distance between consecutive frames
- [ ] Verify no significant drift
- **Requirements**: Property 4

### 5.4 Test Reference Implementation Match
- [ ] **Property 5**: Our projection matches 4D-Humans exactly
- [ ] Generate random camera/bbox/vertices
- [ ] Project with our implementation
- [ ] Project with 4D-Humans reference
- [ ] Verify identical within 1 pixel
- **Requirements**: Property 5

---

## Phase 6: Integration & Testing (1-2 hours)

### 6.1 End-to-End Test
- [ ] Upload snowboarding video
- [ ] Extract frames
- [ ] Run ViTDet detection
- [ ] Run HMR2 pose estimation
- [ ] Project mesh with crop-aware math
- [ ] Render visualization
- [ ] Verify mesh overlays rider correctly
- **Requirements**: 2.3, 2.4

### 6.2 Performance Testing
- [ ] Measure ViTDet detection time
- [ ] Measure projection time
- [ ] Measure rendering time
- [ ] Total time per frame (target: <150ms)
- [ ] Log performance metrics
- **Requirements**: Performance target

### 6.3 Edge Case Testing
- [ ] Test on extreme poses (720s, backflips)
- [ ] Test on small riders (far from camera)
- [ ] Test on multiple riders (use largest bbox)
- [ ] Test on frames with occlusion
- [ ] Verify graceful degradation
- **Requirements**: 2.4, 3.3

### 6.4 Checkpoint: All Tests Pass
- [ ] Unit tests pass
- [ ] Property tests pass
- [ ] Integration tests pass
- [ ] Performance meets target
- [ ] Edge cases handled
- **Requirements**: All

---

## Phase 7: Documentation & Cleanup (1 hour)

### 7.1 Code Documentation
- [ ] Add docstrings to all functions
- [ ] Document projection math with formulas
- [ ] Add inline comments for complex logic
- [ ] Create README for crop_projection module
- **Requirements**: 5.4

### 7.2 Update Design Doc
- [ ] Document final implementation
- [ ] Include code snippets
- [ ] Document any deviations from 4D-Humans
- [ ] Add performance metrics
- **Requirements**: 5.4

### 7.3 Clean Up
- [ ] Remove debug code
- [ ] Remove test files
- [ ] Update requirements.txt
- [ ] Verify all imports work
- **Requirements**: All

---

## Estimated Timeline

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| 1 | ViTDet Setup | 2-3 | Not started |
| 2 | Crop-Aware Projection | 2-3 | Not started |
| 3 | Debug Visualization | 1-2 | Not started |
| 4 | Validation | 1-2 | Not started |
| 5 | Property Testing | 1-2 | Not started |
| 6 | Integration | 1-2 | Not started |
| 7 | Documentation | 1 | Not started |
| **Total** | | **9-15** | |

---

## Success Criteria

- [ ] ViTDet detects person bbox correctly
- [ ] Crop-aware projection math is correct
- [ ] Projected keypoints align with skeleton (within 5 pixels)
- [ ] Mesh overlay stays on rider across frames
- [ ] No drift/float/shrink artifacts
- [ ] Output matches 4D-Humans demo
- [ ] All tests pass
- [ ] Performance meets target (<150ms per frame)
- [ ] Code is documented and clean

---

## Rollback Plan

If ViTDet setup fails on WSL:
1. Fall back to Path B (keypoint-based bbox)
2. Implement crop-aware projection (still works)
3. Use MediaPipe/OpenPose for bbox detection
4. Revisit ViTDet later if needed

If projection math is wrong:
1. Compare line-by-line with 4D-Humans reference
2. Debug with visualization tool
3. Verify against known test cases
4. Iterate until matches reference

---

## Notes

- ViTDet model (~500MB) will be downloaded on first run
- WSL should have at least 10GB free space
- GPU access in WSL requires NVIDIA drivers on host
- All code should be tested on both Windows (fallback) and WSL (primary)
