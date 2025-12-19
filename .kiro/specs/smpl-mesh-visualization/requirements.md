# Requirements Document: SMPL Mesh Visualization

## Introduction

The SMPL Mesh Visualization feature enables rendering of 3D human body meshes overlaid on video frames, matching the 4D-Humans project approach. This provides accurate visual feedback of detected body pose that works from any camera angle, including back-facing views common in snowboarding footage. The system renders meshes with proper lighting and alpha blending, compositing them onto original video frames without requiring OpenGL or GPU rendering.

## Glossary

- **SMPL**: Skinned Multi-Person Linear model - a 3D human body model with 6890 vertices and 13776 triangular faces
- **HMR2**: Human Mesh Recovery 2.0 - neural network that predicts SMPL parameters from images
- **Mesh Vertices**: 6890 3D points (x, y, z) defining the human body surface in camera space
- **Mesh Faces**: 13776 triangles connecting vertices, defining mesh topology
- **Camera Translation**: 3D vector [tx, ty, tz] positioning the mesh in camera space
- **cam_crop_to_full**: Function transforming camera parameters from crop bounding box space to full image space
- **Focal Length**: Camera intrinsic parameter controlling perspective projection (base: 5000, scaled by image size)
- **RGBA Rendering**: Rendering with alpha channel for transparency-based compositing
- **Alpha Blending**: Compositing technique: output = mesh_color * alpha + image_color * (1 - alpha)
- **Depth Sorting**: Back-to-front ordering of mesh faces by z-depth to handle occlusion
- **PyTorch3D**: GPU-accelerated 3D rendering library (optional, for performance)

## Requirements

### Requirement 1

**User Story:** As a snowboard coach, I want to see a 3D body mesh overlaid on the rider, so that I can assess body position from any camera angle.

#### Acceptance Criteria

1. WHEN HMR2 processes a frame THEN the system SHALL extract mesh vertices (6890 3D points) and mesh faces (13776 triangles) from the model output
2. WHEN mesh vertices and camera parameters are available THEN the system SHALL compute 2D pixel coordinates using perspective projection with focal length scaling
3. WHEN 2D projection is complete THEN the system SHALL render the mesh with depth-sorted faces to handle occlusion correctly
4. WHEN the mesh is rendered THEN it SHALL align with the rider's body position within 5 pixels of skeleton joint positions
5. WHEN the rider faces away from camera THEN the mesh SHALL still render correctly and align with back-facing skeleton joints

### Requirement 2

**User Story:** As a developer, I want mesh rendering without OpenGL dependencies, so that it works on Windows and cloud environments.

#### Acceptance Criteria

1. WHEN the mesh renderer initializes THEN it SHALL NOT import or require pyrender, EGL, or OpenGL libraries
2. WHEN rendering on Windows THEN the system SHALL use CPU-based triangle rasterization (no GPU required)
3. WHEN PyTorch3D is unavailable or fails THEN the system SHALL fall back to software-based triangle rasterization using NumPy and PIL
4. WHEN any mesh rendering library fails to import THEN the system SHALL gracefully disable mesh rendering and return skeleton-only visualization
5. WHEN mesh rendering fails for any reason THEN the system SHALL return the original frame with skeleton overlay only

### Requirement 3

**User Story:** As a user, I want mesh overlay generated quickly, so that I can see results immediately.

#### Acceptance Criteria

1. WHEN mesh rendering begins THEN the system SHALL complete rendering within 150ms per frame
2. WHEN rendering completes THEN the system SHALL return a base64-encoded PNG image containing the mesh overlay
3. WHEN processing multiple frames THEN each frame SHALL receive its own mesh overlay with independent rendering

### Requirement 4

**User Story:** As a coach, I want the mesh rendered with proper depth and lighting, so that 3D body shape is clearly visible.

#### Acceptance Criteria

1. WHEN mesh is rendered THEN it SHALL use light blue color (RGB: 166, 189, 219) for high contrast with snow backgrounds
2. WHEN mesh is composited onto the frame THEN it SHALL use 60% opacity (alpha = 0.6) so the video remains visible underneath
3. WHEN rendering mesh faces THEN the system SHALL sort faces by average z-depth and render back-to-front to correctly handle occlusion
4. WHEN mesh is rendered THEN it SHALL apply directional lighting to create shading that emphasizes 3D body shape

### Requirement 5

**User Story:** As a developer, I want camera projection matching 4D-Humans exactly, so that mesh aligns correctly with skeleton joints.

#### Acceptance Criteria

1. WHEN projecting mesh vertices from crop space to full image THEN the system SHALL apply cam_crop_to_full transformation: tx_full = (2 * (cx - w/2) / bs) + cam_crop.tx, ty_full = (2 * (cy - h/2) / bs) + cam_crop.ty, tz_full = 2 * focal_length / bs
2. WHEN computing focal length THEN the system SHALL scale the base focal length (5000) by image size: scaled_focal = 5000 * image_size / 256
3. WHEN transforming 3D vertices to 2D pixels THEN the system SHALL use perspective projection: x_pixel = focal * (x_3d + tx) / (z_3d + tz) + image_width/2, y_pixel = focal * (y_3d + ty) / (z_3d + tz) + image_height/2

### Requirement 6

**User Story:** As a user, I want both mesh overlay and skeleton joints visible together for complete pose understanding.

#### Acceptance Criteria

1. WHEN visualization is requested THEN the system SHALL render the mesh first, then draw skeleton joints and connections on top
2. WHEN skeleton is drawn THEN it SHALL use orange color (RGB: 255, 165, 0) for high contrast with the light blue mesh
3. WHEN mesh rendering fails or is unavailable THEN the system SHALL render skeleton visualization only without attempting mesh rendering
