# Mesh Projection Debug - Tasks

## Phase 1: Detection Verification

### Task 1.1: Check ViTDet Detection
- [ ] Verify ViTDet is loading correctly
- [ ] Log all detections (not just person class)
- [ ] Log confidence scores for all detections
- [ ] Log bounding boxes for all detections
- [ ] Verify person class detection (class 0)
- [ ] Check if confidence threshold (0.3) is too high/low

### Task 1.2: Visualize Detection
- [ ] Draw bounding box on frame
- [ ] Save frame with box for visual inspection
- [ ] Compare box size to rider size

## Phase 2: HMR2 Output Verification

### Task 2.1: Log HMR2 Output
- [ ] Log vertices shape and bounds
- [ ] Log camera parameters (cam_t, pred_cam)
- [ ] Log SMPL faces availability
- [ ] Log box_center and box_size

### Task 2.2: Verify Vertex Ranges
- [ ] Check if vertices are in expected range (typically -1 to 1)
- [ ] Check if vertices have reasonable spread
- [ ] Log sample vertices for inspection

## Phase 3: Projection Verification

### Task 3.1: Debug Camera Transformation
- [ ] Log focal length calculation
- [ ] Log cam_crop_to_full inputs and output
- [ ] Verify formula matches 4D-Humans
- [ ] Check if tz_full is reasonable (should be > 0)

### Task 3.2: Debug Vertex Projection
- [ ] Log projected vertex bounds
- [ ] Calculate percentage of vertices in bounds
- [ ] Log sample projected vertices
- [ ] Check if projection makes sense visually

### Task 3.3: Compare with Reference
- [ ] Read 4D-Humans demo.py projection code
- [ ] Compare focal length calculation
- [ ] Compare camera transformation formula
- [ ] Identify any differences

## Phase 4: Rendering Verification

### Task 4.1: Debug Mesh Rendering
- [ ] Log triangle count
- [ ] Log pixel coverage
- [ ] Verify alpha blending
- [ ] Check for rendering errors

### Task 4.2: Visual Inspection
- [ ] Save rendered frame
- [ ] Compare mesh position to rider
- [ ] Check mesh shape and coverage

## Phase 5: Fix Implementation

### Task 5.1: Fix Detection (if needed)
- [ ] Adjust confidence threshold
- [ ] Improve bounding box calculation
- [ ] Add fallback detection method

### Task 5.2: Fix Projection (if needed)
- [ ] Correct focal length calculation
- [ ] Fix camera transformation formula
- [ ] Adjust vertex projection

### Task 5.3: Fix Rendering (if needed)
- [ ] Improve triangle rasterization
- [ ] Fix alpha blending
- [ ] Add edge case handling

## Phase 6: Testing

### Task 6.1: Test with Multiple Videos
- [ ] Test with rider in different poses
- [ ] Test with rider spinning
- [ ] Test with rider at different distances
- [ ] Test with different video resolutions

### Task 6.2: Verify Fixes
- [ ] Mesh aligns with rider
- [ ] Mesh maintains shape during motion
- [ ] No visual artifacts
- [ ] Performance acceptable
