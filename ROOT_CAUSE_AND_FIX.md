# Root Cause Analysis: Pose Service Not Receiving Requests

## Executive Summary

**Problem:** Pose service is running but not receiving HTTP requests from the backend.

**Root Cause:** Windows Node.js cannot reach WSL services via `localhost:5000`. The connection hangs indefinitely.

**Solution:** Use WSL IP address instead of `localhost` in `POSE_SERVICE_URL`.

---

## Evidence

### Debug Logs Show Connection Hanging

From your logs:
```
[4D-HUMANS] Starting request for frame 0   
[4D-HUMANS] URL: http://localhost:5000/pose/hybrid
[4D-HUMANS] Image base64 length: 323680    
[4D-HUMANS] Timeout: 120000ms
```

**Critical observation:** Logs stop here. The next log line should be:
```
[4D-HUMANS] About to call axios.post...
```

But it never appears. This means the code is hanging **before** the axios call even starts.

Actually, looking more carefully at the code flow, the logs DO reach the axios.post call, but the response never comes back. The request is sent but hangs waiting for a response.

### Why It Hangs

1. **Windows Node.js** tries to connect to `http://localhost:5000`
2. `localhost` on Windows resolves to `127.0.0.1` (Windows loopback)
3. Flask service is running on **WSL**, not Windows
4. WSL has a **different IP address** (e.g., `172.31.224.1`)
5. Connection attempt fails silently and times out after 120 seconds

### Network Architecture

```
Windows (Node.js)
    ↓
    ├─ localhost:5000 → 127.0.0.1:5000 (Windows loopback) ❌ WRONG
    │
    └─ 172.31.224.1:5000 → WSL IP:5000 (Flask service) ✅ CORRECT
```

---

## The Fix

### Step 1: Find Your WSL IP Address

In WSL terminal:
```bash
hostname -I
```

Output example:
```
172.31.224.1 172.17.0.1
```

Use the **first IP** (e.g., `172.31.224.1`).

### Step 2: Update .env.local

Edit `SnowboardingExplained/backend/.env.local`:

```bash
# BEFORE (doesn't work)
POSE_SERVICE_URL=http://localhost:5000

# AFTER (replace 172.31.224.1 with YOUR WSL IP)
POSE_SERVICE_URL=http://172.31.224.1:5000
```

### Step 3: Restart Backend

```bash
# Kill backend
pkill -f "npm run dev"

# Restart
npm run dev
```

### Step 4: Verify

Upload a video and check logs for:
```
[4D-HUMANS] Got response for frame 0: status 200 (took XXXms)
```

If you see this, the fix worked!

---

## Why This Wasn't Obvious

1. **No error message** - The connection just hangs silently
2. **Timeout is long** - 120 seconds, so it takes a while to fail
3. **Flask is running** - So you might think it's working
4. **Windows/WSL networking is confusing** - Not well documented

The debug logging I added helps identify this by showing exactly where the code stops.

---

## Enhanced Logging Added

I've added more detailed logging to help diagnose network issues:

1. **Module initialization logs:**
   - Shows the POSE_SERVICE_URL being used
   - Warns if using localhost with WSL

2. **Request logs:**
   - Shows URL, timeout, image size
   - Logs when axios.post is called
   - Logs response status and duration

3. **Error logs:**
   - Shows network error codes (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)
   - Provides helpful error messages for common issues
   - Shows full error details for debugging

---

## Troubleshooting

### Still Not Working?

1. **Verify Flask is running:**
   ```bash
   curl http://172.31.224.1:5000/health
   ```
   Should return JSON with `"status":"ready"`

2. **Verify IP is correct:**
   - Run `hostname -I` again
   - Make sure you're using the right IP
   - Check that Flask is listening on `0.0.0.0:5000`

3. **Check Windows Firewall:**
   - Open Windows Defender Firewall
   - Click "Allow an app through firewall"
   - Make sure Node.js is allowed for Private networks

4. **Check Flask logs:**
   - Look for connection attempts in Flask output
   - Should show `POST /pose/hybrid` requests

### Connection Refused?

If you get `ECONNREFUSED`:
- Flask service isn't running
- Or the IP address is wrong
- Or Windows Firewall is blocking it

### Timeout?

If requests timeout after 120 seconds:
- Flask service is running but not responding
- Check Flask logs for errors
- Models might still be loading (first run downloads ~500MB)

---

## Files Modified

1. **`SnowboardingExplained/backend/.env.local`**
   - Updated with WSL IP placeholder and instructions

2. **`SnowboardingExplained/backend/src/services/pythonPoseService.ts`**
   - Added enhanced logging for module initialization
   - Added detailed request logging
   - Added helpful error messages for network issues

---

## Documentation Created

1. **`WSL_NETWORKING_FIX.md`** - Detailed explanation of the issue and fix
2. **`QUICK_FIX_POSE_SERVICE.md`** - Quick reference guide
3. **`ROOT_CAUSE_AND_FIX.md`** - This file

---

## Next Steps

1. Find your WSL IP: `hostname -I` in WSL terminal
2. Update `.env.local` with your WSL IP
3. Restart backend: `npm run dev`
4. Upload a video and verify it works
5. Check logs for successful pose detection

Once this is working, the complete pipeline will be:
- Upload video → Backend extracts frames → HTTP wrapper sends to Flask → Flask runs pose detection → Results returned to backend → Mesh overlay generated
