# Quick Fix: Pose Service Not Receiving Requests

## TL;DR

The pose service isn't receiving requests because **Windows Node.js can't reach WSL via `localhost:5000`**.

**Fix:** Use WSL IP address instead.

## 3-Step Fix

### 1. Find WSL IP (in WSL terminal)
```bash
hostname -I
```
Copy the first IP (e.g., `172.31.224.1`)

### 2. Update .env.local
Edit `SnowboardingExplained/backend/.env.local`:
```bash
# Replace this:
POSE_SERVICE_URL=http://localhost:5000

# With this (use YOUR WSL IP from step 1):
POSE_SERVICE_URL=http://172.31.224.1:5000
```

### 3. Restart Backend
```bash
# Kill backend
pkill -f "npm run dev"

# Restart
npm run dev
```

## Verify It Works

Upload a video. Check logs for:
```
[4D-HUMANS] Got response for frame 0: status 200
```

If you see this, it's working!

## Why This Happened

- Flask service runs on WSL (`0.0.0.0:5000`)
- Node.js runs on Windows
- Windows `localhost` ≠ WSL `localhost`
- Need to use WSL IP address to bridge the gap

## Still Not Working?

1. **Verify Flask is running:**
   ```bash
   curl http://172.31.224.1:5000/health
   ```
   Should return JSON with `"status":"ready"`

2. **Check Windows Firewall:**
   - Allow Node.js through firewall
   - Or allow port 5000

3. **Verify IP is correct:**
   - Run `hostname -I` again in WSL
   - Make sure you're using the right IP

## Full Details

See `WSL_NETWORKING_FIX.md` for complete explanation and troubleshooting.
