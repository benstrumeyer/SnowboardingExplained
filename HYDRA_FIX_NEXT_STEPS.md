# Hydra Fix - Next Steps for Debugging

## Current Status

✓ **Fix is in place:**
- Hydra arguments are in CORRECT order (verified)
- Enhanced logging is in place (verified)
- 36 sys.stdout.flush() calls added (verified)

✗ **But subprocess still times out:**
- Flask logs show subprocess starting
- NO output from track.py (not even `[TRACK.PY]` logging)
- Socket hang up after 180 seconds
- This means track.py is NOT executing at all

## The Real Problem

The subprocess is hanging BEFORE track.py even starts printing. This could be:

1. **Venv activation failing silently**
2. **Python not starting**
3. **Hydra hanging during import (before our logging)**
4. **Something else in the bash command**

## How to Debug This

### Step 1: Run Simple Tests (5 minutes)
```bash
python SnowboardingExplained/test-bash-python-simple.py
```

This will test:
- Can bash run Python?
- Can bash run Python with flush?
- Can bash run track.py --help?
- Can bash run track.py with Hydra flags?

**Expected output:**
```
✓ Completed in X.Xs
Exit code: 0
Output: ...
```

**If any test times out:**
- That's where the hang is occurring
- We need to investigate that specific step

### Step 2: Run Full Diagnosis (5 minutes)
```bash
python SnowboardingExplained/diagnose-subprocess-hang.py
```

This runs the EXACT command from Flask and shows:
- All stdout output
- All stderr output
- Whether `[TRACK.PY]` logging appears
- Exit code

**Expected output:**
```
✓ Subprocess completed in X.Xs
Exit code: 0
Stdout length: XXX chars
[TRACK.PY] logging found!
```

**If timeout:**
```
✗ TIMEOUT after 30s
  Subprocess is hanging - no output received
```

## What to Look For

### If Test 1 Times Out
- Venv activation is broken
- Check: `source ~/pose-service/venv/bin/activate && python --version`

### If Test 2 Times Out
- Python itself is hanging
- Check: `python --version` directly

### If Test 3 Times Out
- track.py imports are hanging
- Check: `python track.py --help` directly

### If Test 4 Times Out
- Hydra flags are causing the hang
- Check: `python track.py hydra.job.chdir=false --help`

### If Diagnosis Times Out
- The exact Flask command is hanging
- Need to add more logging to track.py

## Next Actions

1. **Run `test-bash-python-simple.py`** to identify which step is hanging
2. **Run `diagnose-subprocess-hang.py`** to see the exact output
3. **Based on results, investigate that specific step**
4. **Add more logging if needed**

## Key Insight

The fact that we're getting NO output at all (not even `[TRACK.PY]` logging) means the hang is happening BEFORE track.py starts executing. This is different from the original Hydra directory bug, which would have caused a hang DURING Hydra initialization.

The Hydra argument order fix was correct, but there's a DIFFERENT issue preventing track.py from even starting.

## Files to Run

1. **`test-bash-python-simple.py`** - Tests each step individually
2. **`diagnose-subprocess-hang.py`** - Tests the exact Flask command
3. **`verify-hydra-fix.py`** - Verifies the fix is still in place

## Expected Timeline

- Test 1: 5 minutes
- Test 2: 5 minutes
- Analysis: 5 minutes
- **Total: 15 minutes to identify the real issue**

Once we know which step is hanging, we can fix it directly.
