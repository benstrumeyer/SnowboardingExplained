# CUDA Out of Memory Fix - Frame 16-17 Issue

## Problem
The Flask wrapper was running out of GPU memory on frames 16-17 during HMR2 inference with error:
```
RuntimeError: CUDA error: out of memory
```

## Root Cause
The HMR2 inference code was not clearing GPU memory between frame processing. Each frame's tensors (batch, model outputs, intermediate computations) remained on the GPU, accumulating memory until VRAM was exhausted.

## Solution
Added strategic `torch.cuda.empty_cache()` calls at three critical points in the `/pose/hybrid` endpoint:

### 1. After HMR2 Inference (Line ~1270-1280)
```python
# Extract camera params to CPU before clearing GPU memory
pred_cam_cpu = pred_cam[0].cpu().numpy()
box_center_cpu = box_center[0].cpu().numpy()
box_size_cpu = box_size[0].cpu().numpy()
img_size_cpu = img_size[0].cpu().numpy()
scaled_focal_length_cpu = float(scaled_focal_length.cpu().numpy())

# CRITICAL: Clear GPU memory after extracting all outputs to CPU
# This prevents CUDA out of memory errors on subsequent frames
print(f"[🔴 POSE] 🧹 Frame {frame_number}: Clearing GPU memory...")
del batch, out, pred_cam, box_center, box_size, img_size, scaled_focal_length, pred_cam_t_full
torch.cuda.empty_cache()
print(f"[🔴 POSE] ✅ Frame {frame_number}: GPU memory cleared")
```

**Why this works:**
- Extracts all needed data to CPU numpy arrays first
- Deletes GPU tensor references explicitly
- Calls `torch.cuda.empty_cache()` to reclaim VRAM
- Uses CPU copies for response building (no GPU access after cleanup)

### 2. Before Returning Response (Line ~1352)
```python
# Final GPU memory cleanup before returning
torch.cuda.empty_cache()
return jsonify(response_data)
```

**Why this works:**
- Ensures GPU is clean before next request
- Prevents memory fragmentation between requests

### 3. In Error Handler (Line ~1360)
```python
except Exception as e:
    print(f"[🔴 POSE] ❌ Frame {frame_number}: HMR2 processing failed: {e}")
    traceback.print_exc()
    # Clear GPU memory even on error
    torch.cuda.empty_cache()
    return jsonify({'error': f'HMR2 processing failed: {str(e)}'}), 500
```

**Why this works:**
- Prevents memory leaks on error paths
- Ensures GPU is available for next request even if current one fails

## Key Implementation Details

### Try-Except Structure
The fix maintains proper exception handling with three nested try-except blocks:
1. **Outer try** (line 1103): Wraps entire `/pose/hybrid` endpoint
2. **Middle try** (line 1181): Wraps HMR2 setup and processing
3. **Inner try** (line 1234): Wraps the dataloader loop

This ensures GPU memory is cleared even if errors occur at any level.

### Memory Management Strategy
1. **Extract to CPU**: All GPU tensors converted to numpy arrays before deletion
2. **Explicit Deletion**: GPU tensor references deleted with `del` statement
3. **Cache Clearing**: `torch.cuda.empty_cache()` called to reclaim VRAM
4. **CPU-Only Response**: Response built entirely from CPU data

## Testing
To verify the fix works:

1. Start the Flask wrapper:
```bash
cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate
python flask_wrapper_minimal_safe.py
```

2. Send frames 16-17 (the ones that were failing):
```bash
curl -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d '{"frame_number": 16, "image_base64": "..."}'
```

3. Check logs for:
```
[🔴 POSE] 🧹 Frame 16: Clearing GPU memory...
[🔴 POSE] ✅ Frame 16: GPU memory cleared
```

## Expected Behavior
- Frames 16-17 should now process without CUDA OOM errors
- GPU memory should be reclaimed after each frame
- Processing time should remain similar (no performance regression)
- Logs should show "GPU memory cleared" for each frame
- Error paths should also clear GPU memory

## Files Modified
- `SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py`
  - Lines ~1270-1280: GPU memory extraction and clearing after HMR2 inference
  - Line ~1352: Final cleanup before response return
  - Line ~1360: Error handler GPU cleanup
  - Lines ~1355-1365: Proper exception handling for HMR2 processing
  - Lines ~1362-1365: Exception handling for image decoding/setup
