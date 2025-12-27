# Implement the Fix Now

## The Problem (In One Sentence)

Windows Node.js can't reach WSL services via `localhost:5000` - you need to use the WSL IP address instead.

## The Fix (3 Steps)

### Step 1: Get Your WSL IP

Open WSL terminal and run:
```bash
hostname -I
```

You'll see something like:
```
172.31.224.1 172.17.0.1
```

**Copy the first number** (e.g., `172.31.224.1`)

### Step 2: Update .env.local

Open `SnowboardingExplained/backend/.env.local` and find this line:
```bash
POSE_SERVICE_URL=http://172.31.224.1:5000
```

Replace `172.31.224.1` with **your actual WSL IP from Step 1**.

Example - if your WSL IP is `172.30.100.50`, change it to:
```bash
POSE_SERVICE_URL=http://172.30.100.50:5000
```

### Step 3: Restart Backend

In PowerShell:
```powershell
# Kill the backend
pkill -f "npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Restart it
npm run dev
```

## Verify It Works

1. Make sure Flask is running in WSL:
   ```bash
   cd ~/SnowboardingExplained/backend/pose-service
   python app.py
   ```

2. Upload a video through the web UI

3. Check the backend console for this log:
   ```
   [4D-HUMANS] Got response for frame 0: status 200 (took XXXms)
   ```

If you see this, **it's working!** 🎉

## What to Expect

### Before Fix
```
[4D-HUMANS] Starting request for frame 0   
[4D-HUMANS] URL: http://localhost:5000/pose/hybrid
[4D-HUMANS] Image base64 length: 323680    
[4D-HUMANS] Timeout: 120000ms
[hangs for 120 seconds, then times out]
```

### After Fix
```
[4D-HUMANS] Starting request for frame 0   
[4D-HUMANS] URL: http://172.31.224.1:5000/pose/hybrid
[4D-HUMANS] Image base64 length: 323680    
[4D-HUMANS] Timeout: 120000ms
[4D-HUMANS] About to call axios.post...
[4D-HUMANS] Got response for frame 0: status 200 (took 2500ms)
```

## If It Still Doesn't Work

### Check 1: Is Flask Running?

In PowerShell:
```powershell
curl http://172.31.224.1:5000/health
```

Should return:
```json
{"status":"ready","models":{"hmr2":"loaded","vitdet":"loaded"},"ready":true}
```

If you get "Connection refused" or timeout:
- Flask isn't running
- Or the IP is wrong
- Or Windows Firewall is blocking it

### Check 2: Is the IP Correct?

Run this in WSL again:
```bash
hostname -I
```

Make sure you're using the right IP in `.env.local`.

### Check 3: Windows Firewall

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Node.js and make sure it's checked for "Private"
4. Click OK

### Check 4: Flask Logs

In WSL, look at Flask output. You should see:
```
POST /pose/hybrid HTTP/1.1
```

If you don't see this, the request isn't reaching Flask.

## Why This Happened

- Flask runs on WSL (a Linux virtual machine)
- Node.js runs on Windows
- They have different network interfaces
- `localhost` on Windows doesn't reach WSL
- You need to use the WSL IP address to bridge them

## That's It!

Once you update the IP and restart, it should work. The pose service will start receiving requests and processing frames.

For more details, see `ROOT_CAUSE_AND_FIX.md`.
