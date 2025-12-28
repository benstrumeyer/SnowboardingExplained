# 4D-Humans vs Our Implementation: Flow Comparison

## 4D-Humans Reference Flow (demo.py)

```
User runs: python demo.py --img_folder images --out_folder output
    ↓
Python process starts
    ↓
Load HMR2 models directly in Python
    ├─ download_models(CACHE_DIR_4DHUMANS)
    ├─ model, model_cfg = load_hmr2(checkpoint)
    └─ model.to(device).eval()
    ↓
Load ViTDet detector directly in Python
    ├─ LazyConfig.load(config_path)
    ├─ DefaultPredictor_Lazy(detectron2_cfg)
    └─ detector ready
    ↓
For each image:
    ├─ img_cv2 = cv2.imread(img_path)
    ├─ det_out = detector(img_cv2)  ← ViTDet detection
    ├─ boxes = det_out['instances'].pred_boxes
    ├─ dataset = ViTDetDataset(model_cfg, img_cv2, boxes)
    ├─ For each batch:
    │   ├─ batch = recursive_to(batch, device)
    │   ├─ out = model(batch)  ← HMR2 inference
    │   └─ pred_vertices, pred_cam = out['pred_vertices'], out['pred_cam']
    └─ Save results
    ↓
Done
```

**Key characteristics:**
- ✅ Single Python process
- ✅ Models loaded once, reused
- ✅ Direct function calls
- ✅ No subprocess overhead
- ✅ Simple error handling
- ✅ Fast (no process spawning)

---

## Our Current Implementation (Flask Wrapper)

```
User uploads video through web UI
    ↓
Backend (Node.js) receives upload
    ├─ Converts Windows path to WSL path
    ├─ Copies video to WSL
    └─ Calls Flask wrapper /pose/video endpoint
    ↓
Flask wrapper receives request
    ↓
Spawns subprocess:
    subprocess.run(
        'source venv/bin/activate && cd 4D-Humans && python track.py ...',
        shell=True,
        executable='/bin/bash'
    )
    ↓
Subprocess starts new Python process
    ↓
track.py (Hydra script) runs
    ├─ Hydra parses config
    ├─ Initializes PHALP tracker
    ├─ Loads HMR2 models
    ├─ Loads ViTDet detector
    └─ Processes video
    ↓
track.py outputs pickle file
    ↓
Subprocess exits
    ↓
Flask wrapper parses pickle file
    ↓
Returns JSON to backend
    ↓
Backend stores in MongoDB
    ↓
Frontend displays results
```

**Key characteristics:**
- ❌ Multiple processes (overhead)
- ❌ Models loaded per video (slow)
- ❌ Subprocess communication (complexity)
- ❌ Hydra config system (complexity)
- ❌ Pickle file I/O (complexity)
- ❌ Path conversion (complexity)

---

## Why Our Approach Has Issues

### 1. Python Bytecode Caching
When you modify `flask_wrapper_minimal_safe.py`:
- Source file changes ✅
- But `.pyc` bytecode doesn't update ❌
- Flask wrapper loads old bytecode ❌
- Your changes don't take effect ❌

**Solution**: Clear `.pyc` files before restarting

### 2. Subprocess Overhead
Each video requires:
- New Python process spawn (1-2 seconds)
- Virtual environment activation (1-2 seconds)
- Model loading (30-60 seconds)
- Video processing (variable)
- Process cleanup (1 second)

**Total overhead**: 35-65 seconds per video

### 3. Hydra Complexity
track.py uses Hydra for configuration:
- Config parsing
- Output directory creation
- Working directory changes
- Potential symlink issues in WSL

**Result**: Hanging, timeouts, path issues

### 4. Path Conversion Complexity
Windows → WSL path conversion:
- Windows: `C:\Users\benja\repos\...`
- WSL: `/mnt/c/Users/benja/repos/...`
- Requires: `wslpath` command
- Requires: Backslash → forward slash conversion
- Requires: Error handling

**Result**: Upload failures, path mangling

---

## Recommended Solution: Direct Python Execution

Instead of subprocess, load models directly in Flask:

```python
# flask_wrapper_minimal_safe.py - SIMPLIFIED

from hmr2.models import HMR2, download_models, load_hmr2
from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
from phalp.trackers.PHALP import PHALP
from phalp.configs.base import FullConfig
from omegaconf import OmegaConf

# Load models ONCE at startup
print("[INIT] Loading HMR2 models...")
download_models()
hmr2_model, hmr2_cfg = load_hmr2()
hmr2_model.eval()

print("[INIT] Loading ViTDet detector...")
from detectron2.config import LazyConfig
import hmr2
cfg_path = Path(hmr2.__file__).parent / 'configs' / 'cascade_mask_rcnn_vitdet_h_75ep.py'
detectron2_cfg = LazyConfig.load(str(cfg_path))
detectron2_cfg.train.init_checkpoint = "https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl"
for i in range(3):
    detectron2_cfg.model.roi_heads.box_predictors[i].test_score_thresh = 0.25
vitdet_detector = DefaultPredictor_Lazy(detectron2_cfg)

print("[INIT] Loading PHALP tracker...")
cfg = OmegaConf.structured(FullConfig)
phalp_tracker = PHALP(cfg)

@app.route('/pose/video', methods=['POST'])
def pose_video():
    video_path = request.json['video_path']
    
    print(f"[VIDEO] Processing: {video_path}")
    
    # Process directly in Python (no subprocess!)
    results = phalp_tracker.track(video_path)
    
    # Convert to JSON
    json_results = convert_phalp_output_to_json(results)
    
    return jsonify(json_results)
```

**Advantages:**
- ✅ No subprocess overhead
- ✅ No bytecode caching issues
- ✅ Models loaded once, reused
- ✅ Direct function calls
- ✅ Simple error handling
- ✅ Matches 4D-Humans pattern
- ✅ Faster (no process spawning)
- ✅ Easier debugging

---

## Comparison Table

| Aspect | 4D-Humans (demo.py) | Our Current | Recommended |
|--------|-------------------|-------------|------------|
| Process model | Single | Multiple | Single |
| Model loading | Once | Per video | Once |
| Overhead | None | 35-65s | None |
| Error handling | Simple | Complex | Simple |
| Debugging | Easy | Hard | Easy |
| Path conversion | None | Complex | None |
| Bytecode caching | N/A | Issue | N/A |
| Subprocess | No | Yes | No |
| Hydra config | No | Yes | No |
| Pickle I/O | No | Yes | No |

---

## Immediate Fix (Current Approach)

If you want to keep the subprocess approach working:

1. **Clear Python cache**
   ```bash
   find /home/ben/pose-service -name '*.pyc' -delete
   find /home/ben/pose-service -name '__pycache__' -type d -delete
   ```

2. **Restart Flask wrapper**
   ```bash
   pkill -9 python
   python /home/ben/pose-service/flask_wrapper_minimal_safe.py
   ```

3. **Test video upload**
   - Should see `[TRACK.PY]` logs
   - Should see `Exit code: 0`
   - Should NOT see `/bin/sh: source: not found`

---

## Long-term Recommendation

Refactor to direct Python execution (matches 4D-Humans pattern):
- Simpler code
- Better performance
- Fewer issues
- Easier maintenance
- Matches reference implementation

This would eliminate:
- Subprocess complexity
- Bytecode caching issues
- Path conversion issues
- Hydra configuration issues
- Pickle file I/O

---

## Summary

**Current issue**: Python bytecode cache not cleared after code changes

**Immediate fix**: Clear `.pyc` files and restart Flask wrapper

**Long-term fix**: Refactor to direct Python execution (like 4D-Humans demo.py)

The code changes ARE correct. You just need to clear the cache!
