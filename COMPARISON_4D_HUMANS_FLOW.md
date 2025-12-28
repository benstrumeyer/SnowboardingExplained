# Comparison: Our Implementation vs 4D-Humans Reference Flow

## The Problem
Flask wrapper restarted but code didn't update. The issue is that Python keeps the old bytecode in memory.

## 4D-Humans Reference Flow

### 1. demo.py (Direct Python Execution)
```python
# demo.py - runs directly in Python process
from hmr2.models import HMR2, download_models, load_hmr2
from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy

# Load models directly in Python
download_models(CACHE_DIR_4DHUMANS)
model, model_cfg = load_hmr2(args.checkpoint)

# Load ViTDet detector
detector = DefaultPredictor_Lazy(detectron2_cfg)

# Process images
for img_path in img_paths:
    img_cv2 = cv2.imread(str(img_path))
    det_out = detector(img_cv2)  # ViTDet detection
    # ... run HMR2 on detected boxes
```

**Key points:**
- Models loaded IN-PROCESS
- No subprocess calls
- Direct Python execution
- ViTDet detector loaded once, reused

### 2. track.py (Hydra-based Script)
```python
# track.py - runs as standalone script with Hydra
@hydra.main(config_path="configs", config_name="base", version_base=None)
def main(cfg: DictConfig):
    # Initialize PHALP tracker
    phalp_tracker = PHALP(cfg)
    
    # Process video
    phalp_tracker.track(video_path)
    
    # Save output
    phalp_tracker.save()
```

**Key points:**
- Hydra config system
- Standalone script execution
- Video-level processing
- Outputs to pickle file

## Our Implementation

### Current Approach (Flask Wrapper)
```python
# flask_wrapper_minimal_safe.py
def process_video_subprocess(video_path):
    # Build bash command
    cmd = ['bash', '-c', f'source {venv} && cd {track_py_dir} && python track.py ...']
    
    # Execute subprocess
    result = subprocess.run(cmd[2], shell=True, executable='/bin/bash')
    
    # Parse output pickle
    pkl_data = parse_pkl_to_json(pkl_path)
```

**Issues:**
1. Subprocess execution adds complexity
2. Python bytecode caching in Flask process
3. Hydra output directory issues
4. Path conversion complexity

## The Real Issue: Python Bytecode Caching

When you restart Flask wrapper:
1. Old Python process (PID 262) is killed
2. New Python process starts
3. BUT: Python imports are cached in `.pyc` files
4. The new process loads the OLD bytecode from cache

**Solution**: Clear Python cache before restarting

```bash
# Clear all Python cache
find /home/ben/pose-service -name "*.pyc" -delete
find /home/ben/pose-service -name "__pycache__" -type d -delete

# Then restart Flask wrapper
python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

## Recommended Fix: Simplify to Direct Python Execution

Instead of subprocess, load models directly in Flask:

```python
# flask_wrapper_minimal_safe.py - SIMPLIFIED
from hmr2.models import HMR2, download_models, load_hmr2
from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
from phalp.trackers.PHALP import PHALP

# Load models ONCE at startup
download_models()
hmr2_model, hmr2_cfg = load_hmr2()
vitdet_detector = DefaultPredictor_Lazy(detectron2_cfg)
phalp_tracker = PHALP(cfg)

@app.route('/pose/video', methods=['POST'])
def pose_video():
    video_path = request.json['video_path']
    
    # Process directly in Python (no subprocess)
    results = phalp_tracker.track(video_path)
    
    # Return results
    return jsonify(results)
```

**Advantages:**
- No subprocess overhead
- No bytecode caching issues
- Direct model access
- Simpler error handling
- Matches 4D-Humans demo.py pattern

## Current Code Status

### ✅ Code Changes ARE in Place
- `shell=True` is in flask_wrapper_minimal_safe.py (line 978)
- `executable='/bin/bash'` is in flask_wrapper_minimal_safe.py (line 979)
- `cmd[2]` is being used correctly (line 987)

### ❌ Problem: Old Bytecode Still Loaded
- Flask wrapper process is running OLD code
- Python bytecode cache not cleared
- Need to clear `.pyc` files and `__pycache__` directories

## Solution Steps

### Step 1: Clear Python Cache
```bash
wsl bash -c "find /home/ben/pose-service -name '*.pyc' -delete"
wsl bash -c "find /home/ben/pose-service -name '__pycache__' -type d -delete"
```

### Step 2: Kill Flask Wrapper
```bash
wsl bash -c "pkill -9 python"
```

### Step 3: Restart Flask Wrapper
```bash
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

### Step 4: Test
Upload a video and check logs for:
- `[TRACK.PY]` prefix (proves track.py is executing)
- `Exit code: 0` (success)
- No `/bin/sh: source: not found` error

## Why This Happens

Python caches compiled bytecode in `.pyc` files for performance. When you modify a `.py` file:
1. The source code changes
2. But the `.pyc` bytecode doesn't automatically update
3. Python loads the old `.pyc` file
4. Your changes don't take effect

**This is why restarting the process alone doesn't work** - you need to clear the cache.

## Long-term Solution

For production, consider:
1. **Direct Python execution** (no subprocess) - matches 4D-Humans pattern
2. **Docker containers** - isolates Python environment
3. **Separate processes** - each with fresh Python interpreter
4. **Systemd service** - manages process lifecycle

The subprocess approach adds unnecessary complexity. The 4D-Humans reference implementation loads models directly in Python, which is simpler and more reliable.
