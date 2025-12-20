# Mesh Overlay Fix

## Problem

Mesh was not being overlaid on video frames. The batch mesh renderer was failing silently because:

1. `batch_mesh_renderer.py` was setting `PYOPENGL_PLATFORM = 'osmesa'`
2. `mesh_renderer.py` was trying to set `PYOPENGL_PLATFORM = 'egl'`
3. These conflicting settings caused the import to fail
4. `HAS_MESH_RENDERER` became False
5. Batch renderer returned original frames without mesh overlay

## Root Cause

OpenGL platform environment variable must be set BEFORE importing pyrender. The conflicting settings between two files caused initialization to fail.

## Solution

### 1. Fixed `mesh_renderer.py`

Moved OpenGL platform detection to the top of the file, before importing pyrender:

```python
import os
import sys

# Set OpenGL platform for headless rendering
if 'PYOPENGL_PLATFORM' not in os.environ:
    if sys.platform.startswith('linux'):
        try:
            with open('/proc/version', 'r') as f:
                if 'microsoft' in f.read().lower():
                    os.environ['PYOPENGL_PLATFORM'] = 'osmesa'  # WSL
                else:
                    os.environ['PYOPENGL_PLATFORM'] = 'egl'     # Linux
        except:
            os.environ['PYOPENGL_PLATFORM'] = 'egl'

import pyrender  # ← Now imports with correct platform
```

### 2. Simplified `batch_mesh_renderer.py`

Removed duplicate OpenGL platform setting and added better error logging:

```python
try:
    from mesh_renderer import SMPLMeshRenderer
    HAS_MESH_RENDERER = True
except Exception as e:
    logger.warning(f"Failed to import mesh renderer: {e}", exc_info=True)
    HAS_MESH_RENDERER = False
```

## Expected Behavior

### Before Fix
```
[BATCH_RENDERER] Failed to import mesh renderer: ...
[BATCH_RENDERER] Mesh renderer not available
[BATCH] Mesh renderer not available, returning original frames
```

### After Fix
```
[BATCH_RENDERER] Initialized with batch_size=8
[BATCH] Rendering batch of 300 frames
[BATCH] Frame 0: 45ms
[BATCH] Frame 1: 42ms
...
[BATCH] Batch complete: 300 frames in 1500ms (5ms/frame)
```

## Testing

### Check if mesh renderer loads

```bash
python -c "from mesh_renderer import SMPLMeshRenderer; print('✓ Mesh renderer loaded')"
```

### Process video and check for mesh overlay

```bash
curl -X POST -F "video=@test.mp4" \
  http://localhost:5000/process_video
```

Output video should show mesh skeleton overlaid on the person.

## Files Modified

- `mesh_renderer.py` - Fixed OpenGL platform detection
- `batch_mesh_renderer.py` - Removed duplicate settings, added error logging

## Impact

✓ Mesh renderer imports successfully
✓ Mesh overlay renders on all frames
✓ Better error reporting for debugging
✓ Works in WSL and native Linux

---

**Status**: Fixed
**Date**: December 19, 2025
