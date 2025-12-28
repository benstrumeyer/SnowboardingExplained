# Fix: Python Bytecode Cache Issue

## Problem Summary

You restarted the Flask wrapper, but the code changes didn't take effect. This is because:

1. **Code changes ARE in the file** ✅
   - `shell=True` is there (line 978)
   - `executable='/bin/bash'` is there (line 979)
   - `cmd[2]` is being used (line 987)

2. **But old bytecode is still loaded** ❌
   - Python caches compiled bytecode in `.pyc` files
   - When Flask wrapper restarted, it loaded the old `.pyc` file
   - Your code changes weren't compiled into the bytecode

3. **Result**: Flask wrapper is running OLD code despite file changes

## Solution: Clear Cache and Restart

### Option 1: Automated Script (Recommended)
```powershell
.\clear-cache-and-restart.ps1
```

### Option 2: Manual Steps
```powershell
# 1. Clear Python cache
wsl bash -c "find /home/ben/pose-service -name '*.pyc' -delete"
wsl bash -c "find /home/ben/pose-service -name '__pycache__' -type d -delete"

# 2. Kill Flask wrapper
wsl bash -c "pkill -9 python"

# 3. Wait
Start-Sleep -Seconds 2

# 4. Restart Flask wrapper
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

## Verification

After restart, check the logs for:

### ✅ Success Indicators
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: 'source /home/ben/pose-service/venv/bin/activate && ...'
[PROCESS]   shell: True
[PROCESS]   executable: /bin/bash
[PROCESS] ✓ Subprocess completed in 0.1s
[PROCESS] Exit code: 0
[TRACK.PY] Starting track.py...
```

### ❌ Failure Indicators (Old Code)
```
/bin/sh: 1: source: not found
```

This error means the old code is still running (using `/bin/sh` instead of `/bin/bash`).

## Why This Happens

Python's import system:
1. When you `import flask_wrapper_minimal_safe`, Python compiles it to bytecode
2. The bytecode is cached in `__pycache__/flask_wrapper_minimal_safe.cpython-39.pyc`
3. Next time you import, Python loads the cached bytecode (faster)
4. If you modify the `.py` file, the cached `.pyc` doesn't automatically update
5. You need to delete the `.pyc` file to force recompilation

## What Gets Cached

```
/home/ben/pose-service/
├── flask_wrapper_minimal_safe.py          (source code)
├── __pycache__/
│   └── flask_wrapper_minimal_safe.cpython-39.pyc  (cached bytecode)
├── 4D-Humans/
│   ├── track.py
│   └── __pycache__/
│       └── track.cpython-39.pyc
└── PHALP/
    └── __pycache__/
        └── ...
```

When you delete the `.pyc` files, Python recompiles from the `.py` source.

## Prevention

For development, you can:

1. **Use Python's `-B` flag** (don't write bytecode)
   ```bash
   python -B /home/ben/pose-service/flask_wrapper_minimal_safe.py
   ```

2. **Set PYTHONDONTWRITEBYTECODE** environment variable
   ```bash
   export PYTHONDONTWRITEBYTECODE=1
   python /home/ben/pose-service/flask_wrapper_minimal_safe.py
   ```

3. **Use a development server** with auto-reload
   ```bash
   flask --app flask_wrapper_minimal_safe run --reload
   ```

## Next Steps

1. **Run the cache clear script**: `.\clear-cache-and-restart.ps1`
2. **Wait for Flask to start** (should see startup logs)
3. **Test video upload** through web UI
4. **Check logs** for `[TRACK.PY]` prefix and `Exit code: 0`
5. **Verify success** - pose data should be extracted

## Expected Timeline

- Clear cache: 5 seconds
- Kill processes: 2 seconds
- Start Flask: 30-60 seconds (models load on first request)
- **Total**: ~1 minute

## Troubleshooting

### Flask still shows old error
- Verify cache was cleared: `wsl bash -c "find /home/ben/pose-service -name '*.pyc' | wc -l"` (should be 0)
- Verify process was killed: `wsl ps aux | wsl grep python` (should be empty)
- Try again with `-B` flag: `wsl python -B /home/ben/pose-service/flask_wrapper_minimal_safe.py`

### WSL connection issues
- Restart WSL: `wsl --shutdown`
- Then try again

### Flask won't start
- Check for port conflicts: `wsl netstat -tlnp | wsl grep 5000`
- Check for errors: `wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py 2>&1`

## Summary

The code changes are correct and in place. You just need to clear the Python bytecode cache so Flask wrapper loads the new code. This is a common issue when modifying Python files - the interpreter caches the compiled bytecode for performance.

**Action**: Run `.\clear-cache-and-restart.ps1` now!
