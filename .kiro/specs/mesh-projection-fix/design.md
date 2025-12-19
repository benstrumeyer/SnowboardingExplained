# Mesh Projection Alignment Fix - Design

## Overview

The mesh misalignment is caused by incorrect projection math. The fix requires implementing crop-aware projection that matches 4D-Humans' pipeline. This document details three implementation paths with increasing complexity and robustness.

## Architecture

### Current (Broken) Pipeline
```
Video Frame
    ↓
HMR2 (full image) → SMPL vertices + (s, tx, ty) in crop space
    ↓
Project directly to image space (WRONG - ignores crop)
    ↓
Misaligned mesh
```

### Correct Pipeline (4D-Humans)
```
Video Frame
    ↓
ViTDet → Tight bbox [x1, y1, x2, y2]
    ↓
Crop & Resize to 224×224
    ↓
HMR2 → SMPL vertices + (s, tx, ty) in crop space
    ↓
Project: crop space → image space (CORRECT)
    ↓
Aligned mesh
```

## Components and Interfaces

### Component 1: Crop-Space Projection (REQUIRED)

**Purpose**: Transform SMPL vertices from crop-normalized space to image pixels

**Interface**:
```python
def project_smpl_crop_to_image(
    vertices: np.ndarray,           # (N, 3) 3D SMPL vertices
    camera: Tuple[float, float, float],  # (s, tx, ty) weak-perspective
    bbox: Tuple[float, float, float, float],  # (x1, y1, x2, y2) in pixels
    img_size: Tuple[int, int]       # (H, W) full image size
) -> np.ndarray:                    # (N, 2) 2D projected points
    """
    Project SMPL vertices from crop space to image space.
    
    Math:
    1. Weak-perspective in crop space: x_crop = s * X + tx, y_crop = s * Y + ty
    2. Normalize from [-1, 1] to [0, 1]: x_norm = (x_crop + 1) / 2
    3. Scale to crop size: x_pixel = x_norm * crop_w + x1
    """
```

**Implementation**:
```python
def project_smpl_crop_to_image(vertices, camera, bbox, img_size):
    s, tx, ty = camera
    x1, y1, x2, y2 = bbox
    
    crop_w = x2 - x1
    crop_h = y2 - y1
    
    # Weak-perspective projection in crop space
    x_crop = s * vertices[:, 0] + tx
    y_crop = s * vertices[:, 1] + ty
    
    # Map from [-1, 1] crop space to [0, 1]
    x_norm = (x_crop + 1) / 2
    y_norm = (y_crop + 1) / 2
    
    # Scale to crop size and translate to image space
    x_pixel = x_norm * crop_w + x1
    y_pixel = y_norm * crop_h + y1
    
    return np.stack([x_pixel, y_pixel], axis=1)
```

**Validation**:
- Projected keypoints should align with skeleton keypoints
- Mesh should not float/shrink/drift
- Projection should be invertible (can go back to crop space)

### Component 2: Keypoint-Based Bbox Detection (OPTIONAL - Path B/C)

**Purpose**: Compute tight person bbox from detected keypoints when ViTDet unavailable

**Interface**:
```python
def bbox_from_keypoints(
    keypoints_2d: np.ndarray,       # (N, 2) 2D keypoint positions
    margin: float = 0.2             # 20% margin around joints
) -> Tuple[float, float, float, float]:  # (x1, y1, x2, y2)
    """
    Compute bounding box from detected keypoints.
    """
```

**Implementation**:
```python
def bbox_from_keypoints(keypoints_2d, margin=0.2):
    # Filter out invalid keypoints (confidence < 0.1)
    valid = keypoints_2d[keypoints_2d[:, 2] > 0.1] if keypoints_2d.shape[1] > 2 else keypoints_2d
    
    if len(valid) == 0:
        return None
    
    x_min, y_min = valid[:, :2].min(axis=0)
    x_max, y_max = valid[:, :2].max(axis=0)
    
    # Add margin
    w = x_max - x_min
    h = y_max - y_min
    margin_x = w * margin
    margin_y = h * margin
    
    x1 = max(0, x_min - margin_x)
    y1 = max(0, y_min - margin_y)
    x2 = x_max + margin_x
    y2 = y_max + margin_y
    
    return (x1, y1, x2, y2)
```

**Validation**:
- Bbox should be tighter than full image
- Should contain all visible joints
- Should not crop off limbs

### Component 3: Debug Visualization (REQUIRED)

**Purpose**: Visualize projection steps to validate correctness

**Interface**:
```python
def visualize_projection_debug(
    image: np.ndarray,              # (H, W, 3) RGB image
    bbox: Tuple[float, float, float, float],
    keypoints_2d: np.ndarray,       # (N, 2) projected keypoints
    mesh_vertices_2d: np.ndarray,   # (V, 2) projected mesh vertices
    mesh_faces: np.ndarray          # (F, 3) mesh faces
) -> np.ndarray:                    # (H, W, 3) annotated image
    """
    Draw bbox, keypoints, and mesh for debugging.
    """
```

**Implementation**:
```python
def visualize_projection_debug(image, bbox, keypoints_2d, mesh_vertices_2d, mesh_faces):
    img = image.copy()
    
    # Draw bbox
    x1, y1, x2, y2 = bbox
    cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
    
    # Draw keypoints
    for kp in keypoints_2d:
        cv2.circle(img, (int(kp[0]), int(kp[1])), 3, (0, 0, 255), -1)
    
    # Draw mesh edges (wireframe)
    for face in mesh_faces:
        for i in range(3):
            v1 = mesh_vertices_2d[face[i]]
            v2 = mesh_vertices_2d[face[(i+1)%3]]
            cv2.line(img, (int(v1[0]), int(v1[1])), (int(v2[0]), int(v2[1])), (0, 255, 255), 1)
    
    return img
```

## Data Models

### Camera Model
```python
@dataclass
class WeakPerspectiveCamera:
    s: float        # Scale
    tx: float       # Translation X (crop space)
    ty: float       # Translation Y (crop space)
    
    @classmethod
    def from_hmr2_output(cls, pred_cam):
        """Create from HMR2 output (s, tx, ty)"""
        return cls(s=pred_cam[0], tx=pred_cam[1], ty=pred_cam[2])
```

### Bbox Model
```python
@dataclass
class BoundingBox:
    x1: float
    y1: float
    x2: float
    y2: float
    
    @property
    def width(self):
        return self.x2 - self.x1
    
    @property
    def height(self):
        return self.y2 - self.y1
    
    @property
    def center(self):
        return ((self.x1 + self.x2) / 2, (self.y1 + self.y2) / 2)
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Projection Invertibility
*For any* SMPL vertex in crop space, projecting to image space and back should recover the original crop-space coordinate (within floating-point precision).

**Validates: Requirements 2.1, 2.2**

### Property 2: Keypoint-Mesh Alignment
*For any* frame with detected keypoints and SMPL mesh, the projected 2D keypoints should align with the mesh skeleton (within 5 pixels).

**Validates: Requirements 2.3, 4.1, 4.2**

### Property 3: Bbox Tightness
*For any* set of detected keypoints, the computed bbox should be tighter than full-image bbox but still contain all keypoints.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Projection Consistency
*For any* sequence of frames, the projected mesh should maintain consistent alignment with the rider across frames (no drift/float).

**Validates: Requirements 2.4, 4.3**

### Property 5: Reference Implementation Match
*For any* frame processed by both our implementation and 4D-Humans demo, the projected 2D keypoints should be identical (within 1 pixel).

**Validates: Requirements 5.1, 5.2, 5.3**

## Error Handling

### Projection Errors
- **Invalid camera**: If s ≤ 0, log warning and use s=1.0
- **Invalid bbox**: If bbox is outside image bounds, clamp to image
- **Invalid vertices**: If vertices contain NaN/Inf, skip and log

### Detection Errors
- **No keypoints detected**: Fall back to full-image bbox
- **Keypoints too sparse**: Log warning, use full-image bbox
- **Bbox computation fails**: Return None, trigger fallback

## Testing Strategy

### Unit Tests
- Test projection math with known inputs/outputs
- Test bbox computation with synthetic keypoints
- Test visualization doesn't crash on edge cases

### Property-Based Tests
- Property 1: Invertibility across random vertices
- Property 2: Alignment across random frames
- Property 3: Tightness across random keypoint sets
- Property 4: Consistency across frame sequences
- Property 5: Match with reference on test frames

### Integration Tests
- End-to-end: video frame → mesh overlay
- Compare with 4D-Humans demo on same frame
- Test on multiple snowboarding videos

## Implementation Paths

### Path A: Crop-Aware Projection Only
**Files to modify**:
- `hybrid_pose_detector.py`: Add `project_smpl_crop_to_image()` function
- `simple_mesh_renderer.py`: Update to use crop-aware projection
- `app.py`: Add debug visualization endpoint

**Estimated effort**: 2-3 hours

### Path B: Crop-Aware + Keypoint Bbox
**Files to modify**:
- All from Path A
- `hybrid_pose_detector.py`: Add `bbox_from_keypoints()` function
- `hybrid_pose_detector.py`: Update `_run_hmr2()` to use keypoint bbox

**Estimated effort**: 4-5 hours

### Path C: Crop-Aware + ViTDet
**Files to modify**:
- All from Path B
- `hmr2_loader.py`: Remove pyrender mocking, enable ViTDet
- `hybrid_pose_detector.py`: Update `_load_vitdet()` to work on Windows

**Estimated effort**: 6-8 hours (includes ViTDet setup)

## Recommendation

**Implement Path A first** because:
1. Fixes the core issue (projection math)
2. Validates that problem is indeed projection, not detection
3. Works immediately without ViTDet
4. Provides foundation for Path B/C if needed
5. Can be tested against 4D-Humans reference

If alignment is still imperfect on extreme poses → upgrade to Path B.
If detection fails on some frames → upgrade to Path C.
