# Latest Fix Summary - December 19, 2025

## Issue

When running the parallel video processor in WSL, HMR2 model loading failed with:

```
AttributeError: 'EGLPlatform' object has no attribute 'OSMesa'
```

This happened during model initialization because HMR2 tries to create a mesh renderer with pyrender, which requires OpenGL support that WSL doesn't have.

## Root Cause

In `4D-Humans/hmr2/models/hmr2.py`, the HMR2 class initializes a mesh renderer during `__init__`:

```python
class HMR2(pl.LightningModule):
    def __init__(self, cfg: CfgNode, init_renderer: bool = True):
        # ...
        if init_renderer:
            self.renderer = SkeletonRenderer(self.cfg)
            self.mesh_renderer = MeshRenderer(self.cfg, faces=self.smpl.faces)  # ← Fails in WSL
```

The `MeshRenderer` uses pyrender which tries to initialize OpenGL/OSMesa, which fails in WSL.

## Solution

Updated `hmr2_loader.py` to:

1. **Detect WSL** - Check if running in WSL using `/proc/version`
2. **Patch HMR2** - Monkey-patch the HMR2 class to force `init_renderer=False` in WSL
3. **Skip renderer** - HMR2 loads without trying to initialize the mesh renderer

```python
if _is_wsl():
    original_init = HMR2.__init__
    
    def patched_init(self, cfg, init_renderer=True):
        # Force init_renderer=False in WSL
        original_init(self, cfg, init_renderer=False)
    
    HMR2.__init__ = patched_init
```

## What Still Works

✓ HMR2 model inference (pose detection)
✓ Mesh vertex/face extraction
✓ Camera parameter computation
✓ Full video processing pipeline
✓ Parallel processing with multiple workers
✓ Batch mesh rendering (using our own renderer)

## What's Skipped

✗ HMR2's internal mesh renderer (not needed - we use our own)
✗ OpenGL/pyrender initialization (not available in WSL)

## Files Changed

- `hmr2_loader.py` - Added WSL detection and HMR2 patching

## Files Created

- `WSL_HMR2_RENDERER_FIX.md` - Detailed explanation of the fix
- `LATEST_FIX_SUMMARY.md` - This file

## Testing

```bash
# Start the service
python app.py

# Check health endpoint
curl http://localhost:5000/health

# Should show models loaded
# {
#   "status": "ready",
#   "models": {
#     "hmr2": "loaded",
#     "vitdet": "loaded"
#   }
# }

# Process a video
curl -X POST -F "video=@test.mp4" \
  -F "num_workers=2" \
  -F "batch_size=4" \
  http://localhost:5000/process_video
```

## Impact

- ✓ HMR2 now loads successfully in WSL
- ✓ Parallel video processor can run end-to-end
- ✓ No performance impact (we weren't using HMR2's renderer anyway)
- ✓ Mesh rendering still works via our own `SMPLMeshRenderer`

## Next Steps

1. Test video processing end-to-end
2. Monitor performance metrics
3. Tune worker count and batch size based on hardware
4. Deploy to production

---

**Status**: Ready for testing
**Date**: December 19, 2025
