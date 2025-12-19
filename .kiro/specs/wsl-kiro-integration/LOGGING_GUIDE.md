# Enhanced Logging Guide - HMR2 Detection Debugging

**Date**: December 19, 2025  
**Purpose**: Comprehensive logging for debugging HMR2 pose detection failures

## What Was Enhanced

The `hybrid_pose_detector.py` now includes detailed logging at every step of the HMR2 detection pipeline:

### Logging Levels

- **INFO**: Major steps and results (what's happening)
- **DEBUG**: Detailed data (intermediate values)
- **WARNING**: Fallbacks and non-critical issues
- **ERROR**: Failures and exceptions

## Log Flow - What to Look For

### 1. Detection Start
```
================================================================================
=== DETECT_POSE START (frame 0) ===
================================================================================
✓ Image decoded: 1920x1080
```
**What it means**: Frame successfully loaded and decoded

### 2. HMR2 Model Loading
```
[HMR2] Starting HMR2 detection
[HMR2] Model loaded successfully
[HMR2] Image shape: 1920x1080
```
**What it means**: HMR2 model is ready to process the image

### 3. ViTDet Person Detection
```
[HMR2] Loading ViTDet detector...
[HMR2] Running ViTDet detection on 1920x1080 image
[HMR2] ViTDet raw output: 2 detections
[HMR2] After filtering (class=0, score>0.3): 2 detections
[HMR2] ✓ ViTDet detected 2 person(s)
[HMR2] Largest box: [100.0, 50.0, 800.0, 900.0]
[HMR2] Final box with margin and square: (50, 0) to (850, 900), size=900
```
**What it means**: 
- ✓ Person detected in frame
- Box coordinates show where person is
- Box is expanded with margin and made square for HMR2

**If you see**:
```
[HMR2] ✗ ViTDet found no people, using full image
```
**Problem**: No person detected. Try:
- Video with clearer person
- Person should fill most of frame
- Check video quality

### 4. HMR2 Model Inference
```
[HMR2] Creating ViTDetDataset with 1 boxes
[HMR2] Running HMR2 model inference...
[HMR2] Processing batch 0
[HMR2] Batch moved to device: cuda
[HMR2] Model inference completed in 0.45s
```
**What it means**: Model is processing the detected person

**If you see**:
```
[HMR2] Model inference completed in 15.23s
```
**Problem**: Very slow inference. Check:
- GPU availability
- Model is on correct device
- System resources

### 5. Output Extraction
```
[HMR2] Extracting predictions from model output...
[HMR2] Vertices extracted: shape=(6890, 3)
[HMR2] Camera translation: [0.05 0.02 0.8]
[HMR2] Joints 3D extracted: shape=(24, 3)
[HMR2] Keypoints 2D extracted: shape=(24, 2)
[HMR2] ✓ SMPL faces extracted: shape=(13776, 3)
```
**What it means**: All expected data extracted successfully

**If you see**:
```
[HMR2] No pred_keypoints_3d in output
[HMR2] No pred_keypoints_2d in output
[HMR2] HMR2 model has no 'smpl' attribute
```
**Problem**: Model output format unexpected. Check:
- HMR2 model version
- Model loading code
- Output structure

### 6. Keypoint Projection
```
[HMR2] Converting 3D joints to 2D keypoints...
[HMR2] ✓ All required data available for projection
[HMR2] Projected 24 keypoints
```
**What it means**: 3D joints successfully projected to 2D image coordinates

**If you see**:
```
[HMR2] ⚠ Using fallback orthographic projection (missing camera params)
[HMR2] Missing: cam_t=True, box_center=False, box_size=False
```
**Problem**: Camera parameters missing. Using fallback projection (less accurate)

### 7. Final Result
```
================================================================================
=== DETECT_POSE END (frame 0) ===
================================================================================
RESULT SUMMARY:
  Keypoints: 24
  Mesh vertices: 6890
  Mesh faces: 13776
  Has 3D: True
  Processing time: 523ms
  Model: 4d-humans-hmr2
================================================================================
```
**What it means**: Detection completed successfully with all expected data

**If you see**:
```
RESULT SUMMARY:
  Keypoints: 0
  Mesh vertices: 0
  Has 3D: False
  ERROR: HMR2 detection failed
```
**Problem**: Detection failed. Look for error messages above this section.

## Common Issues and Solutions

### Issue 1: "HMR2 returned None"
**Log pattern**:
```
[HMR2] Starting HMR2 detection
[HMR2] Model loaded successfully
[HMR2] ✗ HMR2 error: [some error message]
```

**Solutions**:
1. Check the error message for specifics
2. Verify image is valid (not corrupted)
3. Check GPU memory availability
4. Verify HMR2 model downloaded correctly

### Issue 2: "ViTDet found no people"
**Log pattern**:
```
[HMR2] Running ViTDet detection on 1920x1080 image
[HMR2] ViTDet raw output: 0 detections
[HMR2] ✗ ViTDet found no people, using full image
```

**Solutions**:
1. Use video with clearer person
2. Ensure person fills most of frame
3. Try different video quality
4. Check if person is partially visible

### Issue 3: "No pred_keypoints_3d in output"
**Log pattern**:
```
[HMR2] Extracting predictions from model output...
[HMR2] Vertices extracted: shape=(6890, 3)
[HMR2] No pred_keypoints_3d in output
```

**Solutions**:
1. Check HMR2 model version
2. Verify model output structure
3. May need to update model loading code
4. Check HMR2 documentation for output format

### Issue 4: "Batch moved to device: cpu"
**Log pattern**:
```
[HMR2] Batch moved to device: cpu
[HMR2] Model inference completed in 8.34s
```

**Problem**: Model running on CPU instead of GPU (very slow)

**Solutions**:
1. Check CUDA availability: `nvidia-smi`
2. Verify PyTorch CUDA support
3. Check GPU memory
4. Restart pose service

## How to Enable Debug Logging

The logging is already configured in `hybrid_pose_detector.py`:

```python
logging.basicConfig(
    level=logging.DEBUG,  # Change to DEBUG for more detail
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
```

To see DEBUG level logs:
1. Change `level=logging.DEBUG` in the code
2. Restart pose service
3. Re-run detection

## Log Output Locations

### WSL Terminal (Pose Service)
- Direct console output
- Shows all logs in real-time
- Best for debugging

### Backend Logs
- Check backend process output
- Shows pose service responses
- Shows connection status

## Interpreting Timing

```
[HMR2] Model inference completed in 0.45s
```

**Expected times**:
- First run: 2-5s (model loading + inference)
- Subsequent runs: 0.3-0.8s (inference only)
- Very slow (>5s): GPU issue or CPU fallback

## Key Metrics to Monitor

1. **Keypoint Count**: Should be 24 (SMPL joints)
2. **Mesh Vertices**: Should be 6890
3. **Mesh Faces**: Should be 13776
4. **Processing Time**: Should be < 1s per frame
5. **Device**: Should be "cuda" not "cpu"

## Example: Successful Detection

```
================================================================================
=== DETECT_POSE START (frame 0) ===
================================================================================
✓ Image decoded: 1920x1080
[HMR2] Starting HMR2 detection
[HMR2] Model loaded successfully
[HMR2] Image shape: 1920x1080
[HMR2] Loading ViTDet detector...
[HMR2] Running ViTDet detection on 1920x1080 image
[HMR2] ViTDet raw output: 1 detections
[HMR2] After filtering (class=0, score>0.3): 1 detections
[HMR2] ✓ ViTDet detected 1 person(s)
[HMR2] Largest box: [200.0, 100.0, 1200.0, 1000.0]
[HMR2] Final box with margin and square: (100, 0) to (1200, 1100), size=1100
[HMR2] Creating ViTDetDataset with 1 boxes
[HMR2] Running HMR2 model inference...
[HMR2] Processing batch 0
[HMR2] Batch moved to device: cuda
[HMR2] Model inference completed in 0.52s
[HMR2] Extracting predictions from model output...
[HMR2] Vertices extracted: shape=(6890, 3)
[HMR2] Camera translation: [0.05 0.02 0.8]
[HMR2] Joints 3D extracted: shape=(24, 3)
[HMR2] Keypoints 2D extracted: shape=(24, 2)
[HMR2] ✓ SMPL faces extracted: shape=(13776, 3)
[HMR2] Converting 3D joints to 2D keypoints...
[HMR2] ✓ All required data available for projection
[HMR2] Projected 24 keypoints
================================================================================
=== DETECT_POSE END (frame 0) ===
================================================================================
RESULT SUMMARY:
  Keypoints: 24
  Mesh vertices: 6890
  Mesh faces: 13776
  Has 3D: True
  Processing time: 523ms
  Model: 4d-humans-hmr2
================================================================================
```

## Next Steps

1. Upload a video and check the logs
2. Look for the patterns described above
3. Identify which step is failing
4. Use the solutions provided
5. Share logs if issues persist

---

**Last Updated**: December 19, 2025  
**Logging Level**: INFO (DEBUG available)
