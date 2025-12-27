# Pose Service Startup Fix

## Problem Found

You have **TWO different `app.py` files**:

1. **`SnowboardingExplained/pose-service/app.py`** ❌ WRONG
   - This is a stdin/stdout CLI tool
   - Reads JSON from stdin, writes to stdout
   - NOT an HTTP server
   - This is what you're currently running

2. **`SnowboardingExplained/backend/pose-service/app.py`** ✅ CORRECT
   - This is a Flask HTTP server
   - Listens on `http://localhost:5000`
   - Exposes `/pose/hybrid` endpoint
   - This is what the backend expects

## Solution

**Stop the current pose service** and start the correct one:

### In WSL Terminal

```bash
# Kill the current process
pkill -f "python app.py"

# Navigate to the correct directory
cd ~/SnowboardingExplained/backend/pose-service

# Start the Flask HTTP server
python app.py
```

You should see output like:
```
[STARTUP] Starting Flask server on 0.0.0.0:5000...
[STARTUP] Server is ready to accept requests
```

### Verify It's Working

In another terminal, test the health endpoint:
```bash
curl http://localhost:5000/health
```

You should get a response like:
```json
{
  "status": "ready",
  "models": {"hmr2": "loaded", "vitdet": "loaded"},
  "ready": true
}
```

## Why This Happened

The project has two pose service implementations:
- **`pose-service/`** - Original stdin/stdout CLI version (legacy)
- **`backend/pose-service/`** - New Flask HTTP server version (current)

The backend is configured to use the HTTP version, but you were running the CLI version.

## Next Steps

1. Start the correct Flask HTTP server
2. Restart the backend
3. Upload a video
4. The requests should now reach the pose service

The debug logging will show:
```
[4D-HUMANS] About to call axios.post...
[4D-HUMANS] Got response for frame 0: status 200 (took XXXms)
```
