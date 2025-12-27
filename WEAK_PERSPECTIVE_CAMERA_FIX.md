# Weak Perspective Camera Fix - Mesh Position Alignment

## Problem Identified

The mesh positions were not aligning with the video content because `pred_cam` was being misinterpreted as a **3D world space translation** when it's actually a **weak perspective camera** with format `[scale, tx_norm, ty_norm]`.

### What Was Wrong

```python
# WRONG - treating pred_cam as 3D translation
vertices_translated = vertices + pred_cam[np.newaxis, :]  # [tx, ty, tz]
```

This was completely incorrect because:
1. `pred_cam` has only 3 values: `[s, tx, ty]` (scale, translation_x, translation_y)
2. These are in **normalized image coordinates**, not 3D world space
3. The scale factor `s` is a zoom/scale multiplier, not a Z-coordinate
4. `tx, ty` are in normalized image space (roughly [-1, 1]), not world coordinates

## Solution Implemented

### 1. Flask Wrapper (`flask_wrapper_minimal_safe.py`)

**Changed**: Removed the incorrect translation and added proper camera parameter extraction:

```python
# CORRECT - extract weak perspective camera parameters
cam_scale = pred_cam[0]  # Zoom factor
cam_tx = pred_cam[1]     # Translation X in normalized coords
cam_ty = pred_cam[2]     # Translation Y in normalized coords

# Vertices stay in SMPL model space - no translation applied
vertices_translated = vertices.copy()
keypoints_translated = keypoints_3d.copy()
```

**Added**: New `camera_params` field in response:

```python
'camera_params': {
    'scale': float(cam_scale),
    'tx': float(cam_tx),
    'ty': float(cam_ty),
    'type': 'weak_perspective'
}
```

### 2. Type-Safe Backend Updates

**Added**: Shared `CameraParams` interface in `types.ts`:

```typescript
export interface CameraParams {
  scale: number;  // Zoom factor
  tx: number;     // Translation X in normalized image coords
  ty: number;     // Translation Y in normalized image coords
  type: string;   // Camera type (e.g., 'weak_perspective')
}
```

**Updated**: `HybridPoseFrame` interface in `pythonPoseService.ts`:

```typescript
export interface HybridPoseFrame extends PoseFrame {
  cameraTranslation?: number[] | null;  // [scale, tx_norm, ty_norm]
  cameraParams?: CameraParams;
  // ... other fields
}
```

**Updated**: `DatabaseFrame` interface in `meshDataService.ts` with proper types:

```typescript
interface DatabaseFrame {
  keypoints: PoseKeypoint[];
  skeleton: SkeletonData;
  jointAngles3d: JointAngles3d;
  cameraTranslation: number[] | null;
  cameraParams?: CameraParams;
  // ... other fields
}
```

### 3. Type-Safe Frontend (`MeshViewer.tsx`)

**Added**: Type guard and helper function:

```typescript
// Type guard to check if frame is SyncedFrame
function isSyncedFrame(frame: MeshFrame | SyncedFrame): frame is SyncedFrame {
  return 'meshData' in frame;
}

// Helper to extract camera params from either frame type
function getCameraParams(frame: MeshFrame | SyncedFrame): CameraParams | undefined {
  if (isSyncedFrame(frame)) {
    return frame.meshData.cameraParams;
  }
  return frame.cameraParams;
}
```

**Changed**: Mesh positioning now uses type-safe camera parameters:

```typescript
const cameraParams = getCameraParams(riderMesh);

if (cameraParams) {
  mesh.scale.set(cameraParams.scale, cameraParams.scale, cameraParams.scale);
  mesh.position.set(cameraParams.tx * 2, -cameraParams.ty * 2, 0);
} else {
  mesh.position.set(0, 0, 0);
}
```

### 4. Frontend Types (`types/index.ts`)

**Added**: Shared `CameraParams` interface and updated frame types:

```typescript
export interface CameraParams {
  scale: number;
  tx: number;
  ty: number;
  type: string;
}

export interface SyncedFrame {
  meshData: {
    // ... other fields
    cameraParams?: CameraParams;
  };
}

export interface MeshFrame {
  // ... other fields
  cameraParams?: CameraParams;
}
```

## How Weak Perspective Camera Works

The weak perspective camera model is used in SMPL/HMR2 because:

1. **Scale (`s`)**: Controls the apparent size of the person in the image
   - Larger `s` = person appears larger = closer to camera
   - Smaller `s` = person appears smaller = farther from camera

2. **Translation (`tx, ty`)**: Controls the position in the image
   - In normalized coordinates (typically [-1, 1])
   - `tx` = horizontal position (left/right)
   - `ty` = vertical position (up/down)

## Files Modified

- `SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py`
- `SnowboardingExplained/backend/src/types.ts`
- `SnowboardingExplained/backend/src/services/pythonPoseService.ts`
- `SnowboardingExplained/backend/src/services/meshDataService.ts`
- `SnowboardingExplained/backend/web/src/components/MeshViewer.tsx`
- `SnowboardingExplained/backend/web/src/types/index.ts`

## Next Steps

1. Test with actual video upload to verify mesh alignment
2. Fine-tune the scaling factor if needed
3. Validate that keypoints also align correctly with the mesh
