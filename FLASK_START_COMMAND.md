# Flask Wrapper Start Command

## Quick Start (One Command)

```powershell
wsl bash -c "pkill -9 -f flask_wrapper_minimal_safe.py 2>/dev/null; sleep 1; find /home/ben/pose-service -name '*.pyc' -delete 2>/dev/null; find /home/ben/pose-service -name '__pycache__' -type d -delete 2>/dev/null; cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py 2>&1"
```

## What This Does

1. **Kills existing Flask processes** - `pkill -9 -f flask_wrapper_minimal_safe.py`
2. **Waits 1 second** - `sleep 1`
3. **Clears bytecode cache** - Deletes all `.pyc` files and `__pycache__` directories
4. **Activates venv** - `source venv/bin/activate`
5. **Starts Flask with `-B` flag** - Prevents bytecode caching
6. **Shows all logs** - `2>&1` redirects stderr to stdout

## Key Features

✅ **Shows logs in real-time** - All Flask output visible immediately
✅ **Ctrl+C works** - Properly terminates the process
✅ **No bytecode caching** - `-B` flag ensures code changes take effect immediately
✅ **Clean start** - Kills old processes and clears cache first

## Using the Script

Alternatively, use the PowerShell script:

```powershell
.\SnowboardingExplained\start-flask-clean.ps1
```

This is easier to remember and does the same thing.

## Troubleshooting

### Ctrl+C doesn't work
- The process should terminate with Ctrl+C now
- If it doesn't, open a new PowerShell window and run:
  ```powershell
  wsl bash -c "pkill -9 -f flask_wrapper_minimal_safe.py"
  ```

### Logs not showing
- Make sure you're using the command above (with `2>&1`)
- Check that Flask is actually starting: look for `[FLASK]` or `[PROCESS]` log lines

### "source: not found" error
- This means the old code is still running
- Run the command again - it will clear the cache and restart

### Port 5000 already in use
- Kill the process: `wsl bash -c "pkill -9 -f flask_wrapper_minimal_safe.py"`
- Wait 2 seconds
- Try again

## Expected Output

When you run the command, you should see:

```
[FLASK] Starting Flask wrapper...
[FLASK] Loading models...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: 'source /home/ben/pose-service/venv/bin/activate && ...'
[PROCESS]   shell: True
[PROCESS]   executable: /bin/bash
 * Running on http://127.0.0.1:5000
```

Then when you upload a video:

```
[PROCESS] ✓ Subprocess completed in X.Xs
[PROCESS] Exit code: 0
[TRACK.PY] Starting track.py...
```

## Next Steps

1. Run the command above
2. Wait for Flask to start (you'll see `Running on http://127.0.0.1:5000`)
3. Upload a video through the web UI
4. Check logs for successful processing
5. Press Ctrl+C to stop Flask when done

## Why `-B` Flag?

The `-B` flag tells Python not to write `.pyc` bytecode files. This ensures:
- Code changes take effect immediately
- No cache issues when restarting
- Slightly slower startup (negligible for development)

For production, you'd remove `-B` to get the performance benefit of bytecode caching.
