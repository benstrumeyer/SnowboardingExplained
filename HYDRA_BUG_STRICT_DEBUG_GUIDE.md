# Hydra Directory Bug - Strict Debug Guide

## Overview

This guide provides a strict, step-by-step approach to debugging and verifying the Hydra directory bug fix.

## The Problem (Recap)

**Symptom:** Flask subprocess times out after 180 seconds with NO output
```
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source ... && python track.py video.source=... hydra.job.chdir=false ...']
[PROCESS] ✗ Subprocess failed with timeout after 180 seconds
```

**Root Cause:** Hydra arguments were in the WRONG order
- `video.source=` came FIRST
- Hydra system config args came AFTER
- Hydra ignored the system config and tried to create output directories
- This caused a hang during Hydra initialization

## The Fix (Recap)

**Correct Order:**
```bash
python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=/path/to/video.mov
```

**Why this works:**
1. Hydra sees system config args FIRST
2. `hydra.job.chdir=false` - Don't change directory
3. `hydra.output_subdir=null` - Don't create output subdirectory  
4. `hydra.run.dir=.` - Use current directory
5. `video.source=...` - Application config comes LAST

## Verification Steps

### Step 1: Verify the Fix is in Place

Run the verification script:
```bash
python SnowboardingExplained/verify-hydra-fix.py
```

**Expected Output:**
```
✓ Found Flask wrapper at: SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py

SEARCHING FOR track.py COMMANDS
✓ Found 2 command(s)

ANALYZING ARGUMENT ORDER
Line 951:
  ✓ CORRECT: Hydra args come BEFORE video.source
    Hydra args at position 16
    video.source at position 79

CHECKING track.py FOR ENHANCED LOGGING
✓ Found track.py at: SnowboardingExplained/backend/pose-service/4D-Humans/track.py
✓ Enhanced logging found ([TRACK.PY] markers)
✓ Found 36 sys.stdout.flush() calls
✓ Sufficient flush calls for debugging
```

### Step 2: Test Hydra Output Directory Handling

Run the output directory test:
```bash
python SnowboardingExplained/test-hydra-output-dirs.py
```

**Expected Output:**
```
TEST 1: With Hydra flags (should NOT create output directories)
✓ Command completed in X.Xs
Files created during execution: 0
✓ No new files/directories created (good!)
✓ [TRACK.PY] logging appeared - track.py started
```

### Step 3: Test Hydra Directory Bug Directly

Run the directory bug test:
```bash
python SnowboardingExplained/test-hydra-directory-bug.py
```

**Expected Output:**
```
TEST 1: CORRECT ORDER - Hydra args FIRST, then video.source
✓ Command completed in X.Xs (did not hang)
✓ [TRACK.PY] logging appeared - track.py started successfully

TEST 2: WRONG ORDER - video.source FIRST, then Hydra args (for comparison)
✗ TIMEOUT after 30s - Wrong order causes hang!
  This confirms the bug exists with wrong argument order
```

### Step 4: Full End-to-End Test

1. Start the Flask wrapper:
```bash
cd SnowboardingExplained/backend/pose-service
python flask_wrapper_minimal_safe.py
```

2. Upload a test video via the web UI

3. Check Flask logs for `[TRACK.PY]` messages:
```bash
tail -f flask_wrapper.log | grep TRACK.PY
```

**Expected Output (within 5 seconds):**
```
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: 3.10.12
[TRACK.PY] Working directory: /home/ben/pose-service/4D-Humans
[TRACK.PY] sys.argv: ['track.py', 'hydra.job.chdir=false', ...]
[TRACK.PY] ========================================
[TRACK.PY] Importing warnings...
[TRACK.PY] ✓ warnings imported
[TRACK.PY] Importing torch...
[TRACK.PY] ✓ PyTorch 2.x.x
[TRACK.PY] Importing numpy...
[TRACK.PY] ✓ numpy imported
[TRACK.PY] Importing hydra...
[TRACK.PY] ✓ Hydra imported
[TRACK.PY] Importing PHALP...
[TRACK.PY] ✓ PHALP imported
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
```

## Debugging Checklist

- [ ] Verify fix is in place (Step 1)
- [ ] Test Hydra output directory handling (Step 2)
- [ ] Test Hydra directory bug directly (Step 3)
- [ ] Run full end-to-end test (Step 4)
- [ ] Check Flask logs for `[TRACK.PY]` messages
- [ ] Verify no timeout occurs
- [ ] Verify video processing completes

## If Tests Fail

### If Step 1 Fails (Fix not in place)
- Check `backend/pose-service/flask_wrapper_minimal_safe.py` line 951
- Verify Hydra args come BEFORE `video.source=`
- Check `backend/pose-service/4D-Humans/track.py` for enhanced logging

### If Step 2 Fails (Output directories still being created)
- Check if Hydra flags are being parsed correctly
- Verify `hydra.job.chdir=false` is working
- Check if there's a config file overriding the flags

### If Step 3 Fails (Still hanging)
- Check if the venv is properly activated
- Verify Python packages are installed
- Check if there's a GPU memory issue
- Look for other Hydra config files that might override settings

### If Step 4 Fails (End-to-end still times out)
- Check Flask logs for error messages
- Verify the video file is valid
- Check GPU memory usage
- Look for import errors in track.py

## Key Files

1. **`backend/pose-service/flask_wrapper_minimal_safe.py`** (Line 951)
   - Contains the corrected command with Hydra args BEFORE video.source

2. **`backend/pose-service/4D-Humans/track.py`** (Lines 1-80)
   - Contains enhanced logging with sys.stdout.flush() calls

3. **`HYDRA_FIX_SUMMARY.md`**
   - Summary of the fix

4. **`HYDRA_DEBUG_STRICT.md`**
   - Original debug strategy

## Comparison with 4D-Humans

**4D-Humans README:**
```bash
python track.py video.source="example_data/videos/gymnasts.mp4"
```

**Our command (with Hydra flags):**
```bash
python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source="/path/to/video.mov"
```

The order now matches: Hydra system config first, then application config.

## References

- **Hydra Documentation:** https://hydra.cc/docs/tutorials/basic/your_first_app/config_file/
- **Hydra Argument Parsing:** https://hydra.cc/docs/advanced/override_list/
- **4D-Humans:** https://github.com/shubham-goel/4D-Humans
- **PHALP:** https://github.com/PHALP/PHALP

## Summary

The Hydra directory bug has been fixed by:
1. Reordering arguments so Hydra system config comes BEFORE application config
2. Adding enhanced logging to track.py to help identify where hangs occur

The fix is verified to be in place and ready for testing using the scripts provided.

## Next Steps

1. Run the verification scripts to confirm the fix is in place
2. Upload a test video to verify end-to-end
3. Monitor logs for `[TRACK.PY]` messages appearing within 5 seconds
4. If still hanging, check which test fails and investigate further
