# Subprocess Crash Diagnosis Plan

## Current Situation

**Problem:** Flask subprocess crashes with "socket hang up" (ECONNRESET) after ~46 seconds
**Key Finding:** NO `[TRACK.PY]` logging messages appear at all
**Implication:** track.py is crashing BEFORE it can print its first logging statement

## Root Cause Analysis

The fact that NO `[TRACK.PY]` messages appear means one of these is happening:

1. **track.py process is not starting** - Python can't spawn the subprocess
2. **track.py crashes during import** - One of the imports fails before print statements
3. **track.py hangs during Hydra initialization** - Hydra config loading hangs
4. **Python executable not found** - PATH issue or Python not available

## What We Know

✅ **Flask wrapper is working** - It's calling subprocess.run correctly
✅ **Logging infrastructure is in place** - Both Flask and track.py have comprehensive logging
✅ **Streaming mode is enabled** - `cfg.video.extract_video = False` is set
✅ **Import error handling is in place** - track.py has try/except around imports

❌ **track.py is not printing anything** - Not even the first print statement
❌ **Process times out after ~46 seconds** - Suggests it's hanging, not crashing immediately

## Diagnostic Steps

### Step 1: Test track.py Directly (5 minutes)

Run the diagnostic script to test if track.py can start:

```bash
cd ~/repos/SnowboardingExplained
python test-track-py-directly.py
```

This will:
- Test if track.py exists
- Try to run track.py with a timeout
- Check individual imports
- Show any errors

**Expected output:**
- If successful: Shows process output and exit code
- If timeout: Shows partial output before timeout
- If error: Shows which import fails

### Step 2: Check Flask Logs (5 minutes)

If Flask is running, check the logs:

```bash
# In WSL
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

Look for:
- `[PROCESS] About to call subprocess.run` - Flask is calling subprocess
- `[PROCESS] Starting subprocess with` - Flask is about to run track.py
- `[TRACK.PY]` - track.py is printing (should appear if process starts)
- `[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT` - Process timed out

### Step 3: Check Python Environment (5 minutes)

```bash
# In WSL
which python
python --version
python -c "import sys; print(sys.path)"
```

Check if:
- Python is available
- Python version is correct (3.8+)
- sys.path includes necessary directories

### Step 4: Test Individual Imports (10 minutes)

```bash
# In WSL
cd ~/pose-service/4D-Humans
python -c "import warnings; print('✓ warnings')"
python -c "import torch; print(f'✓ torch {torch.__version__}')"
python -c "from phalp.trackers.PHALP import PHALP; print('✓ PHALP')"
python -c "from hmr2.models import load_hmr2; print('✓ HMR2')"
```

This will identify which import is failing.

### Step 5: Test Hydra Configuration (10 minutes)

```bash
# In WSL
cd ~/pose-service/4D-Humans
python -c "
import hydra
from hydra.core.config_store import ConfigStore
from omegaconf import DictConfig
from phalp.configs.base import FullConfig

print('✓ Hydra imports OK')

# Try to load config
cs = ConfigStore.instance()
cs.store(name='config', node=FullConfig)
print('✓ ConfigStore OK')
"
```

This will check if Hydra configuration works.

### Step 6: Test track.py Startup (10 minutes)

```bash
# In WSL
cd ~/pose-service/4D-Humans
timeout 10 python track.py video.source=/tmp/test.mov 2>&1 | head -50
```

This will:
- Run track.py with a 10-second timeout
- Show the first 50 lines of output
- Identify where it hangs or crashes

## Expected Outcomes and Next Steps

### Outcome A: track.py Starts and Prints Messages ✅

**Logs show:**
```
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: 3.10.x
```

**Next steps:**
1. Look for where it stops printing
2. Check if it reaches `✓ ALL IMPORTS SUCCESSFUL`
3. Check if it reaches `✓ Streaming mode enabled`
4. If it hangs during PHALP tracking, check GPU memory

### Outcome B: track.py Doesn't Print Anything ❌

**Logs show:**
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['python', 'track.py', 'video.source=/tmp/pose-videos/v_*.mov']
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
```

No `[TRACK.PY]` messages at all.

**Possible causes:**
1. Python executable not found
2. Working directory is wrong
3. sys.path is wrong
4. track.py file is corrupted or missing

**Next steps:**
1. Check if `python` command works: `which python`
2. Check if track.py exists: `ls -la ~/pose-service/4D-Humans/track.py`
3. Try running with full path: `python ~/pose-service/4D-Humans/track.py`
4. Check if working directory is correct

### Outcome C: Import Error ❌

**Logs show:**
```
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Importing torch...
[TRACK.PY] ✗✗✗ IMPORT ERROR ✗✗✗
[TRACK.PY] Error type: ModuleNotFoundError
[TRACK.PY] Error message: No module named 'torch'
```

**Next steps:**
1. Identify which module is missing
2. Install the missing module: `pip install torch`
3. Verify installation: `python -c "import torch; print(torch.__version__)"`
4. Re-run track.py

### Outcome D: Hydra Configuration Error ❌

**Logs show:**
```
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
[TRACK.PY] main() called
[TRACK.PY] ✗✗✗ ERROR IN main() ✗✗✗
[TRACK.PY] Error type: ConfigAttributeError
[TRACK.PY] Error message: Key 'video' not found in config
```

**Next steps:**
1. Check PHALP configuration files
2. Verify config structure matches expectations
3. Check if config files are in the right location
4. Review PHALP documentation for config requirements

### Outcome E: GPU/CUDA Error ❌

**Logs show:**
```
[TRACK.PY] ✓ Streaming mode enabled
[TRACK.PY] Creating HMR2_4dhuman tracker...
[TRACK.PY] ✗✗✗ ERROR IN main() ✗✗✗
[TRACK.PY] Error type: RuntimeError
[TRACK.PY] Error message: CUDA out of memory
```

**Next steps:**
1. Check GPU memory: `nvidia-smi`
2. Clear GPU cache: `python -c "import torch; torch.cuda.empty_cache()"`
3. Reduce batch size or video resolution
4. Check if other processes are using GPU

## Timeline

- **Now:** Run diagnostic script
- **5 min:** Check Flask logs
- **10 min:** Check Python environment
- **15 min:** Test individual imports
- **25 min:** Test Hydra configuration
- **35 min:** Test track.py startup
- **45 min:** Analyze results and identify issue
- **60+ min:** Implement fix based on issue

## Success Criteria

✅ track.py starts and prints `[TRACK.PY]` messages
✅ All imports succeed
✅ Streaming mode is enabled
✅ PHALP tracking starts
✅ Process completes without timeout
✅ Exit code is 0
✅ Mesh data is returned to Node.js

## Key Files

- `SnowboardingExplained/backend/pose-service/4D-Humans/track.py` - Main script with logging
- `SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py` - Flask wrapper
- `SnowboardingExplained/test-track-py-directly.py` - Diagnostic script
- `/tmp/pose-service-logs/pose-service-*.log` - Flask logs (in WSL)

## Important Notes

- All logging uses `flush=True` to ensure output is captured
- Streaming mode is set with `cfg.video.extract_video = False`
- Timeout is 180 seconds (3 minutes)
- Process should complete in 60-120 seconds for typical videos
- GPU memory should stay relatively constant with streaming mode

## Questions to Answer

1. Does `[TRACK.PY] track.py STARTED` appear in logs?
2. Does `[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL` appear?
3. Does `[TRACK.PY] ✓ Streaming mode enabled` appear?
4. Does `[TRACK.PY] Starting PHALP tracking...` appear?
5. Does `[TRACK.PY] ✓ Tracking completed` appear?
6. What is the exit code?
7. Is there an error message?
8. How long does each stage take?
9. What is GPU memory usage?

## Next Action

Run the diagnostic script and report findings:

```bash
cd ~/repos/SnowboardingExplained
python test-track-py-directly.py
```

Then check Flask logs and answer the questions above.
