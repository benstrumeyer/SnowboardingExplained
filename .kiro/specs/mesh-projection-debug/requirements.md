# Mesh Projection Debug - Requirements

## Problem Statement
The SMPL mesh is not properly overlaid on the rider in video frames. The mesh either:
- Doesn't appear at all
- Appears but is misaligned with the rider's body
- Is too small or in the wrong position
- Loses body shape during aerial spins

## Root Cause Analysis Needed
1. **ViTDet Detection**: Is the rider being detected? What bounding box is returned?
2. **HMR2 Projection**: Are 3D vertices being projected to 2D correctly?
3. **Camera Parameter Transformation**: Is `cam_crop_to_full()` working correctly?
4. **Mesh Rendering**: Are triangles being rasterized in the right positions?

## Success Criteria
- Mesh overlay perfectly aligns with rider's body in all frames
- Mesh maintains correct shape during spins and rotations
- Mesh is visible (bright green at 80% opacity for testing)
- Debug logs show correct camera parameters and vertex projections

## Acceptance Criteria
1. **Detection**: ViTDet detects rider with confidence > 0.3
2. **Projection**: Projected vertices fall within image bounds
3. **Alignment**: Mesh center aligns with rider's center
4. **Rendering**: Mesh triangles render without gaps or artifacts
5. **Logging**: All debug logs show expected values at each step
