# No Pose Data Fix

## Problem

When processing videos where no poses are detected (e.g., no people in the video, or detector fails), the system crashed with:

```
ZeroDivisionError: float division by zero
```

This happened in `batch_mesh_renderer.py` when trying to calculate average rendering time per frame:

```python
f"({total_time_ms / rendered_count:.0f}ms/frame)"  # ← rendered_count = 0
```

## Root Cause

1. Pose detection runs on all frames but finds no poses
2. No frames are added to the mesh renderer (no pose data)
3. Mesh renderer tries to log stats with `rendered_count = 0`
4. Division by zero when calculating `total_time_ms / rendered_count`

## Solution

### 1. Fixed `batch_mesh_renderer.py`

Added check before division:

```python
if rendered_count > 0:
    logger.info(
        f"[BATCH_RENDERER] Rendering complete: {rendered_count} frames in {total_time_ms:.0f}ms "
        f"({total_time_ms / rendered_count:.0f}ms/frame)"
    )
else:
    logger.warning(
        f"[BATCH_RENDERER] No frames rendered (no pose data available)"
    )
```

### 2. Enhanced `parallel_video_processor.py`

Added tracking of how many frames were added for rendering:

```python
tasks_added = 0
for frame_idx, frame_bgr in enumerate(frames):
    if has_pose_data:
        self.mesh_renderer.add_task(...)
        tasks_added += 1

logger.info(f"[RENDER] Added {tasks_added} frames for rendering")
```

## Behavior

### When Poses Are Detected

- Frames with pose data are rendered with mesh overlay
- Output video shows skeleton/mesh on detected people
- Stats logged normally

### When No Poses Are Detected

- All frames are skipped (no pose data)
- Mesh renderer logs warning: "No frames rendered (no pose data available)"
- Output video is original frames (no overlay)
- Processing completes successfully
- Download button works

## Expected Output

**With poses detected:**
```
[RENDER] Added 300 frames for rendering
[BATCH_RENDERER] Rendering complete: 300 frames in 1500ms (5ms/frame)
```

**Without poses detected:**
```
[RENDER] Added 0 frames for rendering
[BATCH_RENDERER] No frames rendered (no pose data available)
```

## Testing

### Test with video that has people

```bash
curl -X POST -F "video=@person.mp4" \
  http://localhost:5000/process_video
```

Expected: Mesh overlay on detected people

### Test with video that has no people

```bash
curl -X POST -F "video=@landscape.mp4" \
  http://localhost:5000/process_video
```

Expected: Original frames returned, no error

## Files Modified

- `batch_mesh_renderer.py` - Added division by zero check
- `parallel_video_processor.py` - Added task tracking

## Impact

✓ No more crashes when no poses are detected
✓ Graceful handling of edge cases
✓ Better logging for debugging
✓ Download button works even without pose data
✓ Video processing completes successfully

---

**Status**: Fixed
**Date**: December 19, 2025
