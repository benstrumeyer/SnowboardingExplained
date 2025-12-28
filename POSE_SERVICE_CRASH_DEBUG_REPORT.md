# Pose Service Crash Debug Report

**Date:** December 28, 2025  
**Status:** CRITICAL - Process killed during ViTDet model loading  
**Exit Code:** 9 (SIGKILL)

## Crash Summary

The pose service crashed while loading the ViTDet detection model from Detectron2. The process was forcefully terminated (SIGKILL) after ~21 seconds of attempting to download and initialize the model.

### Timeline

```
10:03:25 - HMR2 checkpoint loading starts
10:04:42 - HMR2 checkpoint loaded successfully (~77 seconds)
10:04:43 - PHALP Predictor model loading starts
10:05:04 - ViTDet detection model loading starts
          - Attempting to download: https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl
10:05:25 - PROCESS KILLED (exit code 9)
```

**Duration:** ~21 seconds from ViTDet load start to crash

## Root Cause Analysis

### Exit Code 9 = SIGKILL

Exit code 9 indicates the process was forcefully terminated by the OS. This happens when:

1. **Out of Memory (OOM)** - Most likely cause
   - ViTDet model is ~2.7GB
   - HMR2 already loaded (~2GB)
   - Total GPU memory: 8.6GB
   - Available at start: 8.6GB
   - But downloading + loading simultaneously can spike memory usage

2. **WSL Memory Pressure**
   - WSL has 8GB RAM limit
   - Python process may have exceeded system memory limits
   - OOM killer triggered

3. **GPU Memory Exhaustion**
   - ViTDet model download happens in memory first
   - Then model initialization loads to GPU
   - Peak memory usage could exceed 8.6GB

### Evidence

- **No exception message** - Indicates low-level OS kill, not Python exception
- **No stderr output** - Process terminated before error could be logged
- **Timing** - Crash occurs during model download/initialization, not during inference
- **GPU memory was available** - But downloading large model files can cause memory spikes

## Detailed Log Analysis

### What Worked

✅ Python imports (all successful)
✅ CUDA availability check (8.6GB available)
✅ HMR2 model loading (~2GB)
✅ HMR2 checkpoint loading (PyTorch Lightning upgrade)
✅ Texture map loading
✅ Pyrender initialization
✅ PHALP Predictor model loading
✅ Detectron2 import and config loading

### What Failed

❌ ViTDet model download/initialization
   - Last log: `[DetectionCheckpointer] Loading from https://...model_final_f05665.pkl`
   - No subsequent logs
   - Process killed immediately after

## Memory Analysis

### Estimated Memory Usage at Crash Point

```
HMR2 model (GPU):        ~2.0 GB
HMR2 checkpoint:         ~0.5 GB
Texture maps:            ~0.2 GB
PHALP Predictor:         ~1.5 GB
ViTDet download buffer:  ~2.7 GB (being downloaded)
Python overhead:         ~0.5 GB
─────────────────────────────────
Total estimated:         ~7.4 GB (within 8.6GB limit)
```

However, during download and model initialization, peak memory could spike to 9-10GB, exceeding the 8.6GB available.

## Solutions

### Option 1: Reduce Memory Footprint (Recommended)

**Use CPU-only mode for ViTDet detection:**
```python
# In track.py or PHALP config
detectron2_cfg.model.device = 'cpu'  # Load detection model on CPU
```

**Pros:**
- Frees up GPU memory for HMR2 and PHALP
- Detection is fast enough on CPU for video processing
- Minimal performance impact

**Cons:**
- Slightly slower detection (~100-200ms per frame)

### Option 2: Increase WSL Memory

**Edit ~/.wslconfig:**
```ini
[wsl2]
memory=16GB
swap=4GB
```

**Pros:**
- Allows full GPU model loading
- No code changes needed

**Cons:**
- Requires more system RAM
- May impact other applications

### Option 3: Sequential Model Loading

**Load models one at a time with cleanup:**
```python
# Load HMR2
hmr2_model = load_hmr2()
# Process some frames
# Then load ViTDet
vitdet_detector = load_vitdet()
```

**Pros:**
- Avoids peak memory spike
- Works with current memory limits

**Cons:**
- More complex implementation
- Slower startup

### Option 4: Use Lighter Detection Model

**Replace ViTDet with faster detector:**
- YOLOv8 (much smaller, ~100MB)
- MobileNet-based detector
- Faster R-CNN (smaller variant)

**Pros:**
- Significantly lower memory usage
- Faster inference

**Cons:**
- May need to retrain or fine-tune
- Different detection quality

## Recommended Fix

**Immediate:** Use CPU-only mode for ViTDet detection

**Implementation:**
1. Modify PHALP config to use CPU for detection
2. Keep HMR2 and PHALP on GPU
3. Test with video upload

**Expected Result:**
- Detection runs on CPU (~100-200ms per frame)
- GPU freed for HMR2/PHALP inference
- No OOM crashes
- Overall pipeline still fast enough

## Testing Plan

1. **Test 1:** CPU-only ViTDet
   - Upload small video (< 1MB)
   - Monitor memory usage
   - Check detection quality

2. **Test 2:** Increase WSL memory
   - Set memory=16GB
   - Upload same video
   - Compare performance

3. **Test 3:** Sequential loading
   - Load HMR2 first
   - Process frames
   - Load ViTDet on demand

## Next Steps

1. Implement CPU-only ViTDet mode
2. Test with video upload
3. Monitor memory usage during processing
4. Verify detection quality is acceptable
5. If still crashes, increase WSL memory to 16GB

## Files to Modify

- `SnowboardingExplained/backend/pose-service/4D-Humans/track.py` - Add CPU detection mode
- `~/.wslconfig` - Increase memory if needed
- `SnowboardingExplained/backend/src/api/pose-video.ts` - Add memory monitoring logs

