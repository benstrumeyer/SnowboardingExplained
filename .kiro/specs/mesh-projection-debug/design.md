# Mesh Projection Debug - Design

## Current Pipeline
```
Image → ViTDet Detection → HMR2 Inference → Mesh Projection → Rendering
```

## Key Components to Debug

### 1. ViTDet Detection
**File**: `hybrid_pose_detector.py` - `_run_hmr2()` method
**Issue**: May not be detecting rider or returning wrong bounding box
**Debug Points**:
- Number of detections returned
- Confidence scores
- Bounding box coordinates
- Box size relative to image

### 2. HMR2 Inference
**File**: `hybrid_pose_detector.py` - `_run_hmr2()` method
**Issue**: May be running on wrong crop or with wrong parameters
**Debug Points**:
- Input crop size and position
- Output vertices bounds
- Camera parameters (cam_t, pred_cam)
- SMPL faces availability

### 3. Camera Projection (crop → full image)
**File**: `mesh_renderer.py` - `cam_crop_to_full()` method
**Issue**: Transformation formula may be incorrect
**Debug Points**:
- Input: cam_crop [s, tx, ty], box_center, box_size
- Output: cam_t_full [tx_full, ty_full, tz_full]
- Verify against 4D-Humans demo.py implementation

### 4. Vertex Projection (3D → 2D)
**File**: `mesh_renderer.py` - `project_vertices()` method
**Issue**: Perspective projection may have wrong focal length or offset
**Debug Points**:
- Focal length calculation
- Vertex bounds before/after projection
- Percentage of vertices in image bounds
- Sample vertex projections

### 5. Mesh Rendering
**File**: `mesh_renderer.py` - `render_mesh()` method
**Issue**: Triangles may not be rasterizing correctly
**Debug Points**:
- Number of triangles rendered
- Pixel coverage
- Alpha blending correctness

## Debugging Strategy

### Phase 1: Verify Detection
- Add logging to show ViTDet output
- Visualize bounding box on frame
- Check if rider is being detected

### Phase 2: Verify HMR2 Output
- Log vertices bounds
- Log camera parameters
- Compare with expected ranges

### Phase 3: Verify Projection
- Log focal length calculation
- Log camera transformation
- Log projected vertex bounds
- Compare with image bounds

### Phase 4: Verify Rendering
- Log triangle count
- Log pixel coverage
- Verify alpha blending

## Reference Implementation
Compare with 4D-Humans demo.py:
- How does it handle camera projection?
- What focal length does it use?
- How does it transform from crop to full image?
