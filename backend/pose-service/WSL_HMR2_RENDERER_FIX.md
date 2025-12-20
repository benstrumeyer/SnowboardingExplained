# WSL HMR2 Renderer Fix

## Problem

When loading HMR2 in WSL, the model initialization fails with:

```
AttributeError: 'EGLPlatform' object has no attribute 'OSMesa'
```

This happens because:
1. HMR2 model tries to initialize a `MeshRenderer` during `__init__`
2. `MeshRenderer` uses pyrender which requires OpenGL/OSMesa
3. WSL doesn't have proper OpenGL support by default
4. The initialization fails before we even get to use the model

## Solution

We patch the HMR2 class initialization to skip renderer setup in WSL:

```python
# In hmr2_loader.py
if _is_wsl():
    original_init = HMR2.__init__
    
    def patched_init(self, cfg, init_renderer=True):
        # Force init_renderer=False in WSL
        original_init(self, cfg, init_renderer=False)
    
    HMR2.__init__ = patched_init
```

This:
- Detects if running in WSL
- Patches HMR2's `__init__` to pass `init_renderer=False`
- Skips mesh renderer initialization (we don't need it during inference)
- Allows the model to load successfully

## What This Means

**What still works:**
- ✓ HMR2 model inference (pose detection)
- ✓ Mesh vertex/face extraction
- ✓ Camera parameter computation
- ✓ Full video processing pipeline

**What's skipped:**
- ✗ HMR2's internal mesh renderer (not needed)
- ✗ OpenGL/pyrender initialization (not available in WSL)

**Our mesh rendering:**
- Uses our own `SMPLMeshRenderer` (in `mesh_renderer.py`)
- Handles WSL gracefully with fallback to original frames
- Works in batch mode for efficiency

## Testing

```bash
# Start the service
python app.py

# Check health
curl http://localhost:5000/health

# Should show:
# {
#   "status": "ready",
#   "models": {
#     "hmr2": "loaded",
#     "vitdet": "loaded"
#   }
# }
```

## Files Modified

- `hmr2_loader.py` - Added WSL detection and HMR2 patching

## References

- HMR2 model: `4D-Humans/hmr2/models/hmr2.py`
- Our mesh renderer: `mesh_renderer.py`
- Parallel processor: `parallel_video_processor.py`
