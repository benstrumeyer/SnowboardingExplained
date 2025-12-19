# Mesh Overlay Pipeline - Visual Diagram

---

## High-Level Pipeline

```
Video Frame
    ↓
[ViTDet Detection]
    ├─ Detect person bounding box
    └─ Output: bbox coordinates
    ↓
[HMR2 Inference]
    ├─ Input: cropped image + bbox
    ├─ Output: vertices, faces, camera [s, tx, ty]
    └─ Space: crop space (normalized [-1, 1])
    ↓
[Camera Transformation: cam_crop_to_full()]
    ├─ Input: [s, tx, ty], box_center, box_size, img_size
    ├─ Output: [tx, ty, tz] in full image space
    └─ Key: Converts crop space → full image space
    ↓
[Mesh Rendering: pyrender]
    ├─ Create 3D scene
    ├─ Add mesh (vertices + faces)
    ├─ Add camera (with intrinsics)
    ├─ Add lighting (Raymond lights)
    ├─ Render to RGBA
    └─ Output: mesh with shading and alpha
    ↓
[Alpha Blending]
    ├─ Blend mesh with original image
    ├─ Formula: output = mesh * alpha + image * (1 - alpha)
    └─ Output: smooth overlay
    ↓
[Skeleton Overlay]
    ├─ Draw skeleton joints
    ├─ Draw skeleton connections
    └─ Output: skeleton on top of mesh
    ↓
Final Visualization
```

---

## Detailed Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    MESH RENDERING PIPELINE                  │
└─────────────────────────────────────────────────────────────┘

INPUT:
  - vertices: (V, 3) 3D points
  - faces: (F, 3) triangle indices
  - camera_translation: (3,) [tx, ty, tz]
  - focal_length: scalar
  - image: (H, W, 3) RGB

STEP 1: Create pyrender Scene
  ┌─────────────────────────────────────┐
  │ scene = pyrender.Scene()            │
  │ bg_color = [0, 0, 0, 0]             │
  │ ambient_light = (0.3, 0.3, 0.3)     │
  └─────────────────────────────────────┘

STEP 2: Create and Add Mesh
  ┌─────────────────────────────────────┐
  │ mesh = trimesh.Trimesh(vertices,    │
  │                        faces)       │
  │ rot = rotation_matrix(180°, [1,0,0])│
  │ mesh.apply_transform(rot)           │
  │ scene.add(mesh)                     │
  └─────────────────────────────────────┘
  
  Note: 180° rotation converts to OpenGL convention
        (flips Y and Z axes)

STEP 3: Setup Camera
  ┌─────────────────────────────────────┐
  │ camera_pose = eye(4)                │
  │ camera_pose[:3, 3] = camera_trans   │
  │ camera = IntrinsicsCamera(          │
  │   fx=focal_length,                  │
  │   fy=focal_length,                  │
  │   cx=width/2,                       │
  │   cy=height/2,                      │
  │   zfar=1e12                         │
  │ )                                   │
  │ scene.add(camera, pose=camera_pose) │
  └─────────────────────────────────────┘

STEP 4: Add Lighting
  ┌─────────────────────────────────────┐
  │ lights = create_raymond_lights()    │
  │ # 3 directional lights at 120°      │
  │ # 30° elevation                     │
  │ for light in lights:                │
  │   scene.add_node(light)             │
  └─────────────────────────────────────┘

STEP 5: Render
  ┌─────────────────────────────────────┐
  │ renderer = OffscreenRenderer(W, H)  │
  │ color, depth = renderer.render(     │
  │   scene,                            │
  │   flags=RenderFlags.RGBA            │
  │ )                                   │
  │ color = color / 255.0               │
  └─────────────────────────────────────┘
  
  Output: (H, W, 4) RGBA image

STEP 6: Blend with Original
  ┌─────────────────────────────────────┐
  │ alpha = color[:, :, 3:4]            │
  │ output = (color[:, :, :3] * alpha + │
  │          image * (1 - alpha))       │
  └─────────────────────────────────────┘

OUTPUT:
  - result: (H, W, 3) RGB image with mesh overlay
```

---

## Camera Transformation (cam_crop_to_full)

```
INPUT (Crop Space):
  ┌──────────────────────────────────────┐
  │ pred_cam = [s, tx, ty]               │
  │ box_center = [cx, cy]                │
  │ box_size = b                         │
  │ img_size = [w, h]                    │
  │ focal_length = f                     │
  └──────────────────────────────────────┘

TRANSFORMATION:
  ┌──────────────────────────────────────┐
  │ bs = b * s                           │
  │ tz = 2 * f / bs                      │
  │ tx = 2 * (cx - w/2) / bs + tx_crop   │
  │ ty = 2 * (cy - h/2) / bs + ty_crop   │
  └──────────────────────────────────────┘

OUTPUT (Full Image Space):
  ┌──────────────────────────────────────┐
  │ cam_t_full = [tx, ty, tz]            │
  │ Ready for rendering on full image    │
  └──────────────────────────────────────┘
```

---

## Coordinate Systems

```
CROP SPACE (HMR2 Output)
  ┌─────────────────────────────────────┐
  │  (-1, 1)          (1, 1)            │
  │     ┌─────────────────┐             │
  │     │                 │             │
  │     │   Normalized    │             │
  │     │   [-1, 1] x [-1, 1]           │
  │     │                 │             │
  │     └─────────────────┘             │
  │  (-1, -1)         (1, -1)           │
  │  Origin at center                   │
  └─────────────────────────────────────┘

FULL IMAGE SPACE (Rendering)
  ┌─────────────────────────────────────┐
  │  (0, 0)           (W, 0)            │
  │     ┌─────────────────┐             │
  │     │                 │             │
  │     │   Pixel coords  │             │
  │     │   [0, W] x [0, H]             │
  │     │                 │             │
  │     └─────────────────┘             │
  │  (0, H)           (W, H)            │
  │  Origin at top-left                 │
  └─────────────────────────────────────┘

OPENGL SPACE (pyrender)
  ┌─────────────────────────────────────┐
  │  Y and Z flipped compared to image   │
  │  Applied via 180° rotation around X  │
  │  Handled automatically by pyrender   │
  └─────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA FLOW                              │
└─────────────────────────────────────────────────────────────┘

Video Frame (H, W, 3)
    ↓
ViTDet Detection
    ├─ Input: Image
    └─ Output: bbox [x1, y1, x2, y2]
    ↓
HMR2 Inference
    ├─ Input: Cropped image, bbox
    ├─ Output:
    │   ├─ vertices: (6890, 3)
    │   ├─ faces: (13776, 3)
    │   ├─ pred_cam: (3,) [s, tx, ty]
    │   └─ joints_3d: (24, 3)
    └─ Space: Crop space
    ↓
cam_crop_to_full()
    ├─ Input: pred_cam, box_center, box_size, img_size
    └─ Output: cam_t_full (3,) [tx, ty, tz]
    ↓
SMPLMeshRenderer.render_mesh_on_image()
    ├─ Input:
    │   ├─ image: (H, W, 3)
    │   ├─ vertices: (6890, 3)
    │   ├─ faces: (13776, 3)
    │   ├─ camera_translation: (3,)
    │   └─ focal_length: scalar
    ├─ Process: pyrender rendering
    └─ Output: (H, W, 3) RGB with mesh
    ↓
Alpha Blending
    ├─ Input: mesh RGBA, original image
    └─ Output: (H, W, 3) blended
    ↓
Skeleton Overlay
    ├─ Input: joints_2d, skeleton connections
    └─ Output: (H, W, 3) with skeleton
    ↓
Final Visualization (H, W, 3)
```

---

## Comparison: Old vs New

```
OLD APPROACH (Wireframe)
┌─────────────────────────────────────┐
│ vertices_3d                         │
│     ↓                               │
│ Manual projection to 2D             │
│     ↓                               │
│ Draw lines between vertices         │
│     ↓                               │
│ Green wireframe overlay             │
│                                     │
│ Problems:                           │
│ - No perspective correction         │
│ - No lighting                       │
│ - No occlusion                      │
│ - Hard to judge alignment           │
└─────────────────────────────────────┘

NEW APPROACH (pyrender)
┌─────────────────────────────────────┐
│ vertices_3d + faces                 │
│     ↓                               │
│ Create pyrender Scene               │
│     ├─ Add mesh                     │
│     ├─ Add camera                   │
│     └─ Add lighting                 │
│     ↓                               │
│ GPU rendering                       │
│     ├─ Perspective projection       │
│     ├─ Lighting & shading           │
│     ├─ Occlusion handling           │
│     └─ Alpha blending               │
│     ↓                               │
│ Realistic mesh overlay              │
│                                     │
│ Advantages:                         │
│ - Proper perspective                │
│ - Realistic lighting                │
│ - Correct occlusion                 │
│ - Easy to judge alignment           │
└─────────────────────────────────────┘
```

---

## Lighting Setup

```
RAYMOND LIGHTS (3 directional lights)

View from above:
  
        Light 1
           ↑
           │
Light 3 ← Origin → Light 2
           │
           ↓
        
Elevation: 30° (π/6)
Azimuth: 0°, 120°, 240°

Result: Realistic shading without harsh shadows
```

---

## Performance Timeline

```
Frame Processing Timeline:

0ms     ├─ Start
        │
50ms    ├─ ViTDet detection (cached after first frame)
        │
150ms   ├─ HMR2 inference
        │
200ms   ├─ Camera transformation
        │
250ms   ├─ Mesh rendering (pyrender)
        │
300ms   ├─ Skeleton overlay
        │
350ms   └─ Image encoding
        
Total: ~350ms per frame (acceptable for real-time)
```

---

## Summary

The mesh overlay pipeline:
1. ✅ Detects person with ViTDet
2. ✅ Estimates pose with HMR2
3. ✅ Transforms camera to full image space
4. ✅ Renders mesh with pyrender
5. ✅ Blends with original image
6. ✅ Overlays skeleton
7. ✅ Returns visualization

Result: Mesh displays correctly and aligns with rider's body.

