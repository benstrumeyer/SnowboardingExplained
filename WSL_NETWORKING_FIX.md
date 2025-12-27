# WSL Networking Fix - Pose Service Connection

## Problem Identified

**Root Cause:** Node.js running on Windows cannot reach WSL services via `localhost:5000`. 

When you connect to `http://localhost:5000` from Windows Node.js, it tries to connect to Windows localhost, not WSL localhost. The Flask service is running on WSL, so the connection fails silently (hangs).

**Evidence from logs:**
```
[4D-HUMANS] Starting request for frame 0   
[4D-HUMANS] URL: http://localhost:5000/pose/hybrid
[4D-HUMANS] Image base64 length: 323680    
[4D-HUMANS] Timeout: 120000ms
```

Logs stop here - the axios.post() call never completes because the connection can't be established.

## Solution

Use the WSL IP address instead of `localhost`.

### Step 1: Find Your WSL IP Address

In your WSL terminal, run:
```bash
hostname -I
```

You'll see output like:
```
172.31.224.1 172.17.0.1
```

The first IP (e.g., `172.31.224.1`) is your WSL IP address.

### Step 2: Update .env.local

Edit `SnowboardingExplained/backend/.env.local` and replace:

```bash
# OLD (doesn't work from Windows)
POSE_SERVICE_URL=http://localhost:5000

# NEW (use your WSL IP from Step 1)
POSE_SERVICE_URL=http://172.31.224.1:5000
```

Replace `172.31.224.1` with your actual WSL IP from Step 1.

### Step 3: Restart Backend

```bash
# Kill the backend
pkill -f "npm run dev"

# Restart it
npm run dev
```

### Step 4: Test

Upload a video. You should now see in the logs:
```
[4D-HUMANS] About to call axios.post...
[4D-HUMANS] Got response for frame 0: status 200 (took XXXms)
```

## Why This Works

- **Windows Node.js** → **WSL IP:5000** → **Flask on WSL**
- The WSL IP is accessible from Windows
- The Flask server listens on `0.0.0.0:5000` which accepts connections from any interface

## Firewall Note

If you still get connection refused after this fix, check Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Make sure Node.js is allowed for both Private and Public networks

## Alternative: Use WSL2 Localhost Forwarding

If you're on WSL2, you can also enable localhost forwarding in `.wslconfig`:

```ini
[interop]
appendWindowsPath = true
```

Then restart WSL:
```bash
wsl --shutdown
```

But using the WSL IP directly is more reliable.

## Verification

To verify the connection works:

From Windows PowerShell:
```powershell
curl http://172.31.224.1:5000/health
```

You should get:
```json
{"status":"ready","models":{"hmr2":"loaded","vitdet":"loaded"},"ready":true}
```

If you get "Connection refused" or timeout, the Flask service isn't running or the IP is wrong.
