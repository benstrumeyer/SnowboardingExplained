# Design Document: SMPL Mesh Visualization

## Overview

The SMPL Mesh Visualization system renders 3D human body meshes overlaid on video frames, matching the 4D-Humans approach but with Windows compatibility. The system extracts 6890 mesh vertices and 13776 faces from HMR2 output, projects them to 2D using perspective projection, renders them with depth sorting, and composites them onto the original frame using alpha blending. The implementation prioritizes CPU-based rendering for Windows compatibility while maintaining visual quality.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Input: Video Frame + HMR2 Detection Result                      │
│ (image, vertices, faces, camera_params, image_size)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ 1. Mesh Data Extraction            │
        │ - Extract 6890 vertices            │
        │ - Extract 13776 faces              │
        │ - Validate data structure          │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ 2. Camera Projection               │
        │ - Apply cam_crop_to_full           │
        │ - Scale focal length               │
        │ - Project 3D → 2D pixels           │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ 3. Depth Sorting                   │
        │ - Compute face z-depths            │
        │ - Sort back-to-front               │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ 4. Triangle Rasterization          │
        │ - Render each face                 │
        │ - Apply light blue color           │
        │ - Handle occlusion                 │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ 5. Alpha Blending                  │
        │ - Composite mesh (α=0.6)           │
        │ - Blend with original frame        │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ 6. Skeleton Overlay                │
        │ - Draw 24 joints (orange)          │
        │ - Draw skeleton connections        │
        └────────────────┬───────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Output: Base64-encoded PNG with mesh + skeleton overlay         │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Mesh Data Extraction Component

**Responsibility:** Extract and validate mesh data from HMR2 output

**Input:**
- HMR2 model output dictionary containing:
  - `pred_vertices`: np.array of shape (6890, 3) - 3D vertex positions
  - `pred_cam_t`: np.array of shape (3,) - camera translation [tx, ty, tz]
  - `pred_cam`: np.array of shape (3,) - camera parameters [s, tx, ty]
  - SMPL model faces: np.array of shape (13776, 3) - vertex indices

**Output:**
```python
{
    'vertices': np.array (6890, 3),      # 3D vertex positions
    'faces': np.array (13776, 3),        # Face vertex indices
    'cam_t': np.array (3,),              # Camera translation
    'cam_crop': np.array (3,),           # Crop camera params
    'valid': bool                        # Data validity flag
}
```

**Key Functions:**
- `extract_mesh_data(hmr2_output)` → mesh_data dict
- `validate_mesh_structure(vertices, faces)` → bool

### 2. Camera Projection Component

**Responsibility:** Transform 3D mesh vertices to 2D image coordinates

**Input:**
- Mesh vertices: (6890, 3) array
- Camera parameters: cam_t, cam_crop, image_size
- Focal length: scalar

**Projection Pipeline:**
```python
# Step 1: cam_crop_to_full transformation
box_center = [cx, cy]
box_size = b
img_size = [w, h]
scaled_focal = 5000 * max(img_size) / 256

bs = b * cam_crop[0]
tx_full = (2 * (cx - w/2) / bs) + cam_crop[1]
ty_full = (2 * (cy - h/2) / bs) + cam_crop[2]
tz_full = 2 * scaled_focal / bs

# Step 2: Perspective projection
x_cam = vertices[:, 0] + tx_full
y_cam = vertices[:, 1] + ty_full
z_cam = vertices[:, 2] + tz_full

x_2d = scaled_focal * x_cam / z_cam
y_2d = scaled_focal * y_cam / z_cam

# Step 3: Convert to pixel coordinates
x_pixel = x_2d + w / 2
y_pixel = y_2d + h / 2
```

**Output:**
```python
{
    'vertices_2d': np.array (6890, 2),   # 2D pixel coordinates
    'vertices_z': np.array (6890,),      # Z-depth for sorting
    'valid': bool                        # Projection validity
}
```

**Key Functions:**
- `cam_crop_to_full(cam_crop, box_center, box_size, img_size, focal_length)` → cam_t_full
- `project_vertices(vertices_3d, cam_t, focal_length, img_size)` → vertices_2d, z_depths

### 3. Depth Sorting Component

**Responsibility:** Sort faces for correct occlusion handling

**Input:**
- Faces: (13776, 3) array of vertex indices
- Vertices 2D: (6890, 2) array
- Z-depths: (6890,) array

**Algorithm:**
```python
# Compute average z-depth for each face
face_z_depths = []
for face in faces:
    v0, v1, v2 = face
    avg_z = (z_depths[v0] + z_depths[v1] + z_depths[v2]) / 3
    face_z_depths.append(avg_z)

# Sort faces back-to-front (ascending z)
sorted_indices = np.argsort(face_z_depths)
sorted_faces = faces[sorted_indices]
```

**Output:**
```python
{
    'sorted_faces': np.array (13776, 3),  # Sorted face indices
    'face_z_depths': np.array (13776,)    # Z-depth per face
}
```

**Key Functions:**
- `compute_face_depths(faces, z_depths)` → face_z_depths
- `sort_faces_back_to_front(faces, face_z_depths)` → sorted_faces

### 4. Triangle Rasterization Component

**Responsibility:** Render mesh triangles to image buffer

**Input:**
- Image: (H, W, 3) RGB array
- Vertices 2D: (6890, 2) pixel coordinates
- Sorted faces: (13776, 3) vertex indices
- Mesh color: (3,) RGB tuple
- Mesh alpha: float (0.0-1.0)

**Algorithm:**
```python
# Create output buffer
output = image.copy()
alpha_buffer = np.zeros((H, W))

# For each face (in sorted order)
for face in sorted_faces:
    v0, v1, v2 = vertices_2d[face]
    
    # Rasterize triangle
    pixels = rasterize_triangle(v0, v1, v2, H, W)
    
    # Apply mesh color with alpha
    for x, y in pixels:
        output[y, x] = blend_pixel(
            output[y, x],
            mesh_color,
            mesh_alpha
        )
```

**Output:**
```python
{
    'mesh_image': np.array (H, W, 3),    # Rendered mesh
    'valid': bool                        # Rendering success
}
```

**Key Functions:**
- `rasterize_triangle(v0, v1, v2, H, W)` → list of (x, y) pixels
- `blend_pixel(bg_color, fg_color, alpha)` → blended_color
- `render_mesh(image, vertices_2d, faces, color, alpha)` → mesh_image

### 5. Skeleton Overlay Component

**Responsibility:** Draw skeleton joints and connections on top of mesh

**Input:**
- Mesh image: (H, W, 3) RGB array
- Keypoints: list of {name, x, y, z, confidence}
- Skeleton connections: list of (joint1, joint2) pairs

**Output:**
```python
{
    'visualization': np.array (H, W, 3),  # Final visualization
    'valid': bool                         # Drawing success
}
```

**Key Functions:**
- `draw_skeleton_connections(image, keypoints, connections)` → image
- `draw_skeleton_joints(image, keypoints)` → image

## Data Models

### Mesh Data Structure
```python
class MeshData:
    vertices: np.ndarray        # (6890, 3) - 3D positions
    faces: np.ndarray           # (13776, 3) - vertex indices
    cam_t: np.ndarray           # (3,) - camera translation
    cam_crop: np.ndarray        # (3,) - crop camera params
    image_size: tuple           # (width, height)
    focal_length: float         # scaled focal length
```

### Projection Result
```python
class ProjectionResult:
    vertices_2d: np.ndarray     # (6890, 2) - pixel coordinates
    z_depths: np.ndarray        # (6890,) - z-depth per vertex
    valid: bool                 # projection success
    error: Optional[str]        # error message if failed
```

### Rendering Result
```python
class RenderingResult:
    image: np.ndarray           # (H, W, 3) - rendered image
    base64_png: str             # base64-encoded PNG
    valid: bool                 # rendering success
    error: Optional[str]        # error message if failed
    processing_time_ms: float   # rendering duration
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Mesh Data Extraction Completeness
*For any* HMR2 output containing valid SMPL parameters, extracting mesh data SHALL result in exactly 6890 vertices and 13776 faces with no data loss or corruption.
**Validates: Requirements 1.1**

### Property 2: Perspective Projection Correctness
*For any* 3D vertex and valid camera parameters, the perspective projection formula SHALL produce 2D pixel coordinates that fall within image bounds [0, width) × [0, height).
**Validates: Requirements 1.2, 5.3**

### Property 3: Depth Sorting Consistency
*For any* mesh with multiple faces, sorting faces by z-depth and rendering back-to-front SHALL produce correct occlusion where closer faces occlude farther faces.
**Validates: Requirements 1.3, 4.3**

### Property 4: Mesh-Skeleton Alignment
*For any* frame with both mesh and skeleton visualization, the mesh vertices SHALL align with skeleton joint positions within 5 pixels (measured as Euclidean distance).
**Validates: Requirements 1.4**

### Property 5: Back-Facing Pose Handling
*For any* back-facing pose (camera behind rider), the mesh rendering SHALL still produce valid output that aligns with back-facing skeleton joints.
**Validates: Requirements 1.5, edge-case**

### Property 6: No OpenGL Dependencies
*For any* initialization of the mesh renderer, the system SHALL NOT import pyrender, EGL, or OpenGL libraries, verified by checking sys.modules.
**Validates: Requirements 2.1**

### Property 7: Fallback to Software Rasterization
*For any* scenario where PyTorch3D is unavailable, the system SHALL successfully fall back to CPU-based triangle rasterization without errors.
**Validates: Requirements 2.3**

### Property 8: Graceful Error Recovery
*For any* rendering failure (missing libraries, invalid data, etc.), the system SHALL return skeleton-only visualization without crashing.
**Validates: Requirements 2.4, 2.5**

### Property 9: Performance Within Budget
*For any* frame of any resolution, mesh rendering SHALL complete within 150ms per frame.
**Validates: Requirements 3.1**

### Property 10: Output Format Correctness
*For any* completed rendering, the output SHALL be a valid base64-encoded PNG image that decodes without errors.
**Validates: Requirements 3.2**

### Property 11: Frame Independence
*For any* sequence of frames, each frame's mesh overlay SHALL be computed independently with no state carried between frames.
**Validates: Requirements 3.3**

### Property 12: Mesh Color Accuracy
*For any* rendered mesh, sampled pixels SHALL have RGB values matching light blue (166, 189, 219) ±5 per channel.
**Validates: Requirements 4.1**

### Property 13: Alpha Blending Correctness
*For any* mesh composited over a known background, the resulting pixel color SHALL match the formula: output = mesh_color * 0.6 + background_color * 0.4.
**Validates: Requirements 4.2**

### Property 14: cam_crop_to_full Transformation
*For any* crop camera parameters and bounding box, the cam_crop_to_full transformation SHALL produce camera translation that correctly maps crop space to full image space.
**Validates: Requirements 5.1**

### Property 15: Focal Length Scaling
*For any* image size, the scaled focal length SHALL equal 5000 * image_size / 256.
**Validates: Requirements 5.2**

### Property 16: Rendering Order Correctness
*For any* visualization, the mesh SHALL be rendered before skeleton joints, verified by checking that mesh pixels are underneath skeleton pixels.
**Validates: Requirements 6.1**

### Property 17: Skeleton Color Accuracy
*For any* rendered skeleton, joint pixels SHALL have RGB values matching orange (255, 165, 0) ±5 per channel.
**Validates: Requirements 6.2**

### Property 18: Mesh Unavailability Fallback
*For any* scenario where mesh rendering is disabled or unavailable, the system SHALL render skeleton-only visualization without attempting mesh rendering.
**Validates: Requirements 6.3**

## Error Handling

**Mesh Data Extraction Errors:**
- Invalid vertex count → log warning, skip mesh rendering
- Invalid face count → log warning, skip mesh rendering
- Missing camera parameters → log warning, skip mesh rendering

**Projection Errors:**
- Division by zero (z_cam ≈ 0) → clamp z to minimum value
- Out-of-bounds pixels → clamp to image bounds
- NaN/Inf values → skip affected vertices

**Rendering Errors:**
- PyTorch3D import failure → fall back to software rasterization
- Software rasterization failure → return skeleton-only
- Memory errors → return skeleton-only with error log

**Compositing Errors:**
- Invalid alpha values → clamp to [0, 1]
- Color value overflow → clamp to [0, 255]
- Image format errors → return skeleton-only

## Testing Strategy

### Unit Testing
- Test mesh data extraction with synthetic HMR2 output
- Test projection formula against known 3D→2D mappings
- Test depth sorting with overlapping faces
- Test alpha blending with known color values
- Test focal length scaling across image sizes

### Property-Based Testing
- Generate random valid HMR2 outputs and verify mesh extraction
- Generate random 3D vertices and verify projection bounds
- Generate random face orderings and verify depth sort correctness
- Generate random camera parameters and verify cam_crop_to_full
- Generate random mesh/background combinations and verify alpha blending

### Integration Testing
- End-to-end visualization on sample snowboarding frames
- Verify mesh alignment with skeleton joints
- Test back-facing pose handling
- Test error recovery (missing libraries, invalid data)
- Test performance on various image sizes

### Visual Testing
- Manual inspection of mesh alignment
- Comparison with 4D-Humans demo output
- Edge cases (extreme poses, occlusion, back-facing)

## Dependencies

**Required:**
- NumPy (array operations, projection math)
- PIL/Pillow (image I/O, base64 encoding)
- PyTorch (already available for HMR2)

**Optional:**
- PyTorch3D (GPU-accelerated rendering, optional)
- Trimesh (mesh utilities, optional)

**Explicitly Avoided:**
- pyrender (OpenGL-based, breaks on Windows)
- OpenGL/EGL (platform-specific, not available on Windows)

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Mesh extraction | <10ms | Data copying and validation |
| Projection | <20ms | 6890 vertices × perspective formula |
| Depth sorting | <10ms | 13776 faces sort |
| Rasterization | <80ms | Triangle rendering |
| Alpha blending | <20ms | Pixel-wise blending |
| Skeleton overlay | <10ms | 24 joints + connections |
| **Total per frame** | **<150ms** | All operations combined |
| **Target FPS** | **6-7 FPS** | At 150ms per frame |

Note: HMR2 inference (~200ms) is separate and dominates total time.
