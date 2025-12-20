# WSL Pose Service Startup Guide

## Problem
When you run `wsl -d Ubuntu bash -c "command"`, the bash shell exits after the command completes, killing the service. The mobile app can't connect because the service isn't running.

## Solution: Use `nohup` to Keep Service Running

### Option 1: Quick Start (Recommended)
Use the provided batch file:
```bash
start-pose-service-wsl.bat
```

This script:
- Kills any existing service on port 5000
- Starts the service in background with `nohup`
- Checks if it's running
- Shows you how to view logs and stop the service

### Option 2: Manual Command
```bash
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && nohup python app.py > /tmp/pose-service.log 2>&1 &"
```

This command:
- `nohup` - Keeps process running even if terminal closes
- `> /tmp/pose-service.log` - Redirects stdout to log file
- `2>&1` - Redirects stderr to same log file
- `&` - Runs in background

### Option 3: Keep Terminal Open
If you want to see logs in real-time:
```bash
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"
```

Keep this terminal window open. The service will run as long as the terminal is open.

## Monitoring the Service

### Check if service is running
```bash
wsl -d Ubuntu bash -c "curl -s http://localhost:5000/health | python -m json.tool"
```

### View logs (real-time)
```bash
wsl -d Ubuntu tail -f /tmp/pose-service.log
```

### View last 50 lines of logs
```bash
wsl -d Ubuntu tail -50 /tmp/pose-service.log
```

### Check which process is using port 5000
```bash
wsl -d Ubuntu bash -c "lsof -ti:5000"
```

## Stopping the Service

### Kill service on port 5000
```bash
wsl -d Ubuntu bash -c "lsof -ti:5000 | xargs kill -9"
```

### Or kill by process ID
```bash
wsl -d Ubuntu kill -9 <PID>
```

## Testing the Service

### Health check
```bash
curl -s http://localhost:5000/health | python -m json.tool
```

Expected response:
```json
{
  "status": "ready",
  "service": "pose-detection-wsl",
  "hybrid_available": true,
  "models": {
    "hmr2": "loaded",
    "vitdet": "loaded"
  },
  "ready": true,
  "timestamp": 1703000000.0
}
```

### Warmup models (optional, happens automatically)
```bash
curl -X POST http://localhost:5000/warmup
```

## Mobile App Connection

The mobile app connects to: `172.24.183.130:5000`

This is the WSL IP address. Make sure:
1. Service is running with `nohup` (not just in a terminal)
2. Health check returns `"ready": true`
3. Mobile app is on same network as Windows machine

## Troubleshooting

### Service crashes immediately
Check logs:
```bash
wsl -d Ubuntu tail -50 /tmp/pose-service.log
```

Common issues:
- Port 5000 already in use: Kill existing process
- Model loading failed: Check GPU memory
- Import errors: Check venv is activated

### Mobile app can't connect
1. Check service is running: `curl http://localhost:5000/health`
2. Check WSL IP: `wsl -d Ubuntu hostname -I`
3. Check firewall: Windows Defender may block port 5000
4. Check network: Mobile app must be on same network

### GPU out of memory
The pose detection workers use GPU memory. If you see CUDA errors:
1. Reduce number of workers (default is 2, which is recommended)
2. Close other GPU-intensive applications
3. Check GPU memory: `wsl -d Ubuntu nvidia-smi`

## Architecture

The service uses a two-tier parallelization approach:

**Tier 1: Pose Detection (2 workers)**
- Each worker loads HMR2 model (~2-3GB GPU memory)
- Workers process frames in parallel
- 2 workers recommended (GPU-intensive)

**Tier 2: Mesh Rendering (4 workers)**
- Separate process pool for rendering
- Uses CPU+OpenGL, not GPU
- Can scale to 8 workers if needed

Combined: ~2.8x speedup vs sequential processing

## Performance

Expected performance on typical video:
- 300 frames @ 30fps = 10 seconds of video
- Sequential: ~60 seconds
- Parallel (2 pose + 4 mesh): ~20-25 seconds
- Speedup: ~2.5-3x

Actual performance depends on:
- GPU model (RTX 3060 vs RTX 4090)
- CPU cores available
- Video resolution
- System load
