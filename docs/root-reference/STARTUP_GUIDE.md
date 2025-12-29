# Complete Startup Guide

This guide walks you through starting all services for SnowboardingExplained with 4D-Humans pose estimation.

## Quick Start (Automated)

Run the PowerShell script to start all services in separate terminals:

```powershell
cd C:\Users\benja\repos\SnowboardingExplained
.\start-all-services.ps1
```

This will automatically:
1. Start Flask wrapper (pose service) on port 5000
2. Start Node.js backend on port 5001
3. Start React frontend on port 3000
4. Start ngrok tunnel
5. Start Docker services (Redis + MongoDB)

## Manual Startup (5 Terminals)

If you prefer to start services manually, follow these steps:

### Terminal 1: Flask Wrapper (Pose Service)

```bash
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_safe.py"
```

**Expected output:**
```
[STARTUP] Starting 4D-Humans Flask wrapper (SAFE MODE)...
[STARTUP] Listening on 0.0.0.0:5000
[STARTUP] Models will be loaded on first /pose/hybrid request...
```

**Test it:**
```bash
curl http://localhost:5000/health
```

### Terminal 2: Node.js Backend

```bash
cd "C:\Users\benja\repos\SnowboardingExplained"
.\start-backend.bat
```

**Expected output:**
```
Backend server running on port 5001
```

### Terminal 3: React Frontend

```bash
cd "C:\Users\benja\repos\SnowboardingExplained\backend\web"
npm run dev
```

**Expected output:**
```
VITE v... ready in ... ms
➜  Local:   http://localhost:3000/
```

### Terminal 4: Docker Services (Optional - Skip ngrok for now)

```bash
docker run -d -p 6379:6379 redis
docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest
```

**Expected output:**
```
<container_id>
<container_id>
```

## Service Status

Once all services are running, you should have:

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Flask (Pose) | 5000 | http://localhost:5000/health | ✓ |
| Backend | 5001 | http://localhost:5001 | ✓ |
| Frontend | 3000 | http://localhost:3000 | ✓ |
| MongoDB | 27017 | localhost:27017 | ✓ |
| Redis | 6379 | localhost:6379 | ✓ |

## Testing the Setup

### 1. Check Flask Health

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "warming_up",
  "models": {
    "hmr2": "not_loaded",
    "phalp": "not_loaded"
  },
  "device": null,
  "ready": false,
  "error": null
}
```

### 2. Upload a Video

1. Open http://localhost:3000 in your browser
2. Click "Upload Video"
3. Select a video file (MP4, MOV, etc.)
4. Wait for processing to complete

### 3. Monitor Flask Logs

Watch the Flask terminal for model loading:

```
[POSE] First request - initializing models...
[INIT] Initializing models...
[INIT] Using device: cuda
[INIT] Importing HMR2 (this may take a moment)...
[INIT] ✓ HMR2 imported
[INIT] Loading HMR2 model...
[INIT] ✓ HMR2 model loaded
```

## Troubleshooting

### Flask wrapper hangs on startup

**Solution:** Use `flask_wrapper_safe.py` instead of `flask_wrapper.py`. The safe version avoids import hangs.

### Port already in use

```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### Models not loading

Check Flask logs for errors. Common issues:
- SMPL model not found
- CUDA not available
- Memory issues

### MongoDB connection error

Ensure MongoDB is running:
```bash
docker ps | grep mongo
```

If not running:
```bash
docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest
```

### Redis connection error

Ensure Redis is running:
```bash
docker ps | grep redis
```

If not running:
```bash
docker run -d -p 6379:6379 redis
```

## Performance Notes

- **First frame processing:** 30-60 seconds (models loading)
- **Subsequent frames:** 100-250ms per frame (GPU)
- **Memory usage:** ~4-6GB (GPU VRAM)
- **CPU usage:** 20-30% during processing

## Next Steps

1. **Upload a video** to test the full pipeline
2. **Monitor frame coverage** in the results
3. **Check mesh rendering** in the 3D viewer
4. **Verify frame interpolation** for missing poses

## Files

- `start-all-services.ps1` - Automated startup script
- `start-flask-wrapper.sh` - Flask wrapper startup script
- `flask_wrapper_safe.py` - Safe Flask wrapper (recommended)
- `flask_wrapper.py` - Original Flask wrapper
- `FLASK_WRAPPER_QUICKSTART.md` - Flask wrapper documentation

## Support

For issues, check:
1. Flask logs: Terminal 1
2. Backend logs: Terminal 2
3. Frontend logs: Terminal 3
4. Docker logs: `docker logs snowboard-mongo`
5. Redis logs: `docker logs <redis_container_id>`

## Stopping Services

To stop all services:

1. Press `Ctrl+C` in each terminal
2. Or run: `taskkill /F /IM python.exe /IM node.exe /IM ngrok.exe`
3. Stop Docker: `docker stop snowboard-mongo redis`
