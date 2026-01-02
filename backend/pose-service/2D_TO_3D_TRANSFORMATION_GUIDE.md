# 2D to 3D Mesh Transformation Guide

## Overview

The 2D->3D transformation process converts 3D mesh data (vertices and faces) from PHALP output into a format that can be rendered in Three.js on the frontend. This involves:

1. **Extracting mesh data** from PHALP pickle files (vertices, faces, camera parameters)
2. **Converting to JSON format** (numpy arrays → lists)
3. **Passing to frontend** via the frames array
4. **Rendering in Three.js** using the camera parameters and mesh geometry

## What Already Exists

### 1. Mesh Renderer (`mesh_renderer.py`)
- **Purpose**: Renders SMPL mesh overlaid on images using pyrender
- **Key function**: `render_mesh_on_image()`
- **What it does**:
  - Takes vertices, faces, and camera parameters
  - Applies 180° rotation around X-axis (OpenGL convention)
  - Flips X component of camera translation
  - Uses intrinsic camera parameters (focal length, principal point)
  - Renders with proper lighting and alpha blending

### 2. Camera Parameter Conversion (`hybrid_pose_detector.py`)
- **Function**: `cam_crop_to_full()`
- **Purpose**: Converts camera parameters from crop space to full image space
- **What it does**:
  - Takes HMR2 camera output (scale, tx, ty in crop space)
  - Converts to full image space using:
    - Bounding box center and size
    - Image dimensions
    - Focal length
  - Returns camera translation [tx, ty, tz] in full image space

### 3. Video Processor (`video_processor.py`)
- **Purpose**: Processes videos frame-by-frame
- **Extracts**:
  - Mesh vertices and faces from HMR2 results
  - Camera parameters
  - Builds frames array with mesh data
  - Returns to backend in expected format

## What We Need to Do

### Step 1: Extract from PHALP Pickle
The PHALP pickle file contains:
```python
{
  "frame_0000": {
    "vertices": np.array([...]),  # (6890, 3) - 3D mesh vertices
    "faces": np.array([...]),      # (13776, 3) - face indices
    "camera": {...},               # Camera parameters
    "smpl": {...},                 # SMPL body parameters
    "track_id": 0,                 # Person tracking ID
    ...
  },
  "frame_0001": {...},
  ...
}
```

### Step 2: Convert to Frontend Format
Convert to JSON-serializable format:
```python
{
  'frames': [
    {
      'frameNumber': 0,
      'timestamp': 0.0,
      'vertices': [[x, y, z], ...],      # List of 3D points
      'faces': [[v1, v2, v3], ...],      # List of triangle indices
      'camera': {
        'tx': 0.0,
        'ty': 0.0,
        'tz': 5.0,
        'focal_length': 5000.0
      },
      'personId': 0,
      'tracked': True,
      ...
    },
    ...
  ],
  'fps': 30,
  'total_frames': 300,
  'video_duration': 10.0
}
```

### Step 3: Frontend Rendering in Three.js
The frontend receives the frames array and:
1. Creates a Three.js scene
2. For each frame:
   - Creates BufferGeometry from vertices and faces
   - Creates mesh with material
   - Applies camera parameters
   - Renders the frame
3. Animates through frames at original FPS

## Key Transformations

### Camera Parameters
PHALP provides camera parameters in the format:
- `tx, ty, tz`: Camera translation (position in 3D space)
- `focal_length`: Intrinsic camera parameter (typically 5000)

These are used to:
1. Position the camera in 3D space
2. Project 3D vertices onto 2D image plane
3. Render the mesh from the correct viewpoint

### Mesh Geometry
PHALP provides:
- **Vertices**: 6890 3D points (SMPL body model)
- **Faces**: 13776 triangles (how vertices connect)

These define the 3D body mesh that gets rendered.

### Coordinate Systems
- **SMPL space**: 3D coordinates from SMPL model
- **Camera space**: Relative to camera position
- **Image space**: 2D projection onto image plane
- **Three.js space**: WebGL coordinate system

## Implementation Checklist

- [ ] **Step 1**: Verify pickle file is created by track.py
- [ ] **Step 2**: Inspect pickle structure (keys, data types, shapes)
- [ ] **Step 3**: Extract vertices and faces from pickle
- [ ] **Step 4**: Extract camera parameters from pickle
- [ ] **Step 5**: Convert numpy arrays to lists (JSON serializable)
- [ ] **Step 6**: Build frames array with correct structure
- [ ] **Step 7**: Return frames array from track_wrapper.py
- [ ] **Step 8**: Backend receives and saves to MongoDB
- [ ] **Step 9**: Frontend loads frames from MongoDB
- [ ] **Step 10**: Frontend renders mesh in Three.js using camera parameters

## Reference Code

### Existing Mesh Rendering (Python)
```python
from mesh_renderer import SMPLMeshRenderer

renderer = SMPLMeshRenderer(focal_length=5000.0)
rendered = renderer.render_mesh_on_image(
    image_rgb,
    vertices,      # (V, 3) numpy array
    faces,         # (F, 3) numpy array
    camera_translation,  # (3,) numpy array [tx, ty, tz]
    focal_length=5000.0
)
```

### Expected Frontend Format
```javascript
{
  frames: [
    {
      frameNumber: 0,
      timestamp: 0.0,
      vertices: [[x, y, z], ...],
      faces: [[v1, v2, v3], ...],
      camera: {
        tx: 0.0,
        ty: 0.0,
        tz: 5.0,
        focal_length: 5000.0
      }
    }
  ],
  fps: 30,
  total_frames: 300
}
```

## Next Steps

1. **Verify PHALP pickle structure** - Run track.py and inspect output
2. **Update track_wrapper.py** - Extract mesh data correctly
3. **Test extraction** - Verify frames array has correct format
4. **Frontend integration** - Render mesh in Three.js
5. **End-to-end test** - Upload video and verify rendering
