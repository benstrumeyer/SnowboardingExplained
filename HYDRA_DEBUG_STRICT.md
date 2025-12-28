# Strict Hydra Debug - Isolating the Hang

## Problem
Subprocess times out after 180 seconds with NO output from track.py. The `[TRACK.PY]` logging never appears, which means track.py isn't even starting.

## Hypothesis
Hydra is hanging during initialization when trying to create output directories in WSL with symlinked paths.

## Fix Applied
Changed the command to pass Hydra args BEFORE video.source:

**BEFORE (WRONG):**
```bash
python track.py video.source=/path/to/video.mov hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.
```

**AFTER (CORRECT):**
```bash
python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=/path/to/video.mov
```

**Why this matters:**
- Hydra parses arguments left-to-right
- Hydra config args should come BEFORE application args
- Passing them after video.source might cause Hydra to ignore them

## Testing Strategy

### Test 1: Basic Python in venv
```bash
source ~/pose-service/venv/bin/activate && python --version
```
**Expected:** Python version prints immediately
**If hangs:** Venv activation is broken

### Test 2: Hydra import
```bash
source ~/pose-service/venv/bin/activate && python -c "import hydra; print(f'Hydra {hydra.__version__}')"
```
**Expected:** Hydra version prints immediately
**If hangs:** Hydra import is broken

### Test 3: track.py --help (no Hydra config)
```bash
cd ~/pose-service/4D-Humans
source ~/pose-service/venv/bin/activate && python track.py --help
```
**Expected:** Help text prints immediately
**If hangs:** track.py imports are broken

### Test 4: track.py with Hydra flags (no video)
```bash
cd ~/pose-service/4D-Humans
source ~/pose-service/venv/bin/activate && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. --help
```
**Expected:** Help text prints immediately
**If hangs:** Hydra flags aren't working

### Test 5: track.py with video.source (actual command)
```bash
cd ~/pose-service/4D-Humans
source ~/pose-service/venv/bin/activate && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=/tmp/pose-videos/test.mov
```
**Expected:** `[TRACK.PY]` logging appears within 5 seconds
**If hangs:** This is where the hang occurs

## Run the Debug Script
```bash
cd SnowboardingExplained
python test-hydra-only.py
```

This will run all 5 tests and tell you exactly where the hang is occurring.

## Expected Output
```
================================================================================
HYDRA-ONLY DEBUG TEST
================================================================================

[TEST 1] Basic Python execution in venv
  ✓ Python version: Python 3.10.12

[TEST 2] Hydra import test
  ✓ Hydra 1.3.x

[TEST 3] track.py --help (basic execution)
  ✓ Completed in 2.3s
  Output (first 200 chars): usage: track.py [-h] ...

[TEST 4] track.py with Hydra flags (no video)
  ✓ Completed in 2.1s
  Output (first 200 chars): usage: track.py [-h] ...

[TEST 5] track.py with video.source (actual command)
  ✓ Completed in 45.2s
  (or ✗ TIMEOUT if it hangs)

================================================================================
HYDRA DEBUG TEST COMPLETE
================================================================================
```

## If Test 5 Hangs
This means the issue is NOT with Hydra flags, but with:
1. **PHALP initialization** - Loading the tracker
2. **HMR2 initialization** - Loading the model
3. **ViTDet initialization** - Loading the detector
4. **Video loading** - Reading the video file
5. **GPU memory** - Running out of VRAM

In that case, we need to add logging to track.py to see which step is hanging.

## Comparison with 4D-Humans
✅ 4D-Humans README shows:
```bash
python track.py video.source="example_data/videos/gymnasts.mp4"
```

✅ Our command now matches this pattern (with Hydra flags added):
```bash
python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source="/path/to/video.mov"
```

## Next Steps
1. Run `test-hydra-only.py` to identify where the hang occurs
2. If Test 5 hangs, add more logging to track.py to identify which component is hanging
3. If all tests pass, the issue is in the Flask wrapper or subprocess handling
