# Ready to Test - Complete Setup

All services are now configured and ready to run. Here's what you need to do:

## Step 1: Start All Services

Run this PowerShell command to start everything automatically:

```powershell
cd C:\Users\benja\repos\SnowboardingExplained
.\start-all-services.ps1
```

This will open 5 terminals:
1. **Flask Wrapper** (Pose Service) - Port 5000
2. **Node.js Backend** - Port 5001
3. **React Frontend** - Port 3000
4. **ngrok Tunnel** - For external access
5. **Docker Services** - Redis + MongoDB

## Step 2: Verify Services Are Running

Run the test script:

```powershell
.\test-all-services.ps1
```

Expected output:
```
Flask (Pose Service): OK
Backend API: OK
Frontend: OK
MongoDB: OK
Redis: OK

Passed: 5/5
✓ All services are running!
```

## Step 3: Upload a Video

1. Open http://localhost:3000 in your browser
2. Click "Upload Video"
3. Select a video file (MP4, MOV, AVI, etc.)
4. Wait for processing

## What Happens During Upload

1. **Video Upload** → Backend receives video
2. **Frame Extraction** → Frames extracted from video
3. **Pose Estimation** → Flask wrapper processes each frame with 4D-Humans
4. **Mesh Generation** → 3D mesh created for each frame
5. **Storage** → Results stored in MongoDB
6. **Display** → 3D mesh rendered in browser

## Monitoring Progress

### Flask Terminal (Terminal 1)

Watch for model loading on first request:
```
[POSE] First request - initializing models...
[INIT] Initializing models...
[INIT] Using device: cuda
[INIT] Importing HMR2 (this may take a moment)...
[INIT] ✓ HMR2 imported
[INIT] Loading HMR2 model...
[INIT] ✓ HMR2 model loaded
```

Then watch for frame processing:
```
[POSE] Processing frame 0...
[POSE] Processing frame 1...
[POSE] Processing frame 2...
```

### Backend Terminal (Terminal 2)

Watch for API requests:
```
POST /api/upload - 200 OK
POST /api/pose/process - 200 OK
```

### Frontend Terminal (Terminal 3)

Watch for build and dev server:
```
VITE v... ready in ... ms
➜  Local:   http://localhost:3000/
```

## Performance Expectations

- **First frame:** 30-60 seconds (models loading)
- **Subsequent frames:** 100-250ms per frame
- **Total for 100 frames:** ~20-30 seconds
- **Memory:** 4-6GB GPU VRAM

## Troubleshooting

### Flask wrapper not responding

Check if it's still loading models:
```bash
curl http://localhost:5000/health
```

If it returns `warming_up`, wait for models to load.

### Port already in use

```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### Video upload fails

1. Check backend logs (Terminal 2)
2. Ensure MongoDB is running: `docker ps | grep mongo`
3. Ensure Redis is running: `docker ps | grep redis`

### Mesh not rendering

1. Check browser console for errors (F12)
2. Check backend logs for mesh generation errors
3. Verify MongoDB has mesh data: `docker exec snowboard-mongo mongosh -u admin -p password`

## Next Steps After Testing

1. **Verify frame coverage** - Check that all frames were processed
2. **Test mesh rendering** - Rotate and zoom the 3D mesh
3. **Check frame interpolation** - Verify smooth playback
4. **Monitor performance** - Check GPU usage and processing times

## Files Created

- `start-all-services.ps1` - Automated startup
- `test-all-services.ps1` - Service verification
- `start-flask-wrapper.sh` - Flask startup script
- `flask_wrapper_safe.py` - Safe Flask wrapper
- `STARTUP_GUIDE.md` - Detailed startup instructions
- `READY_TO_TEST.md` - This file

## Quick Reference

| Command | Purpose |
|---------|---------|
| `.\start-all-services.ps1` | Start all services |
| `.\test-all-services.ps1` | Test all services |
| `curl http://localhost:5000/health` | Check Flask status |
| `docker ps` | Check Docker containers |
| `docker logs snowboard-mongo` | MongoDB logs |
| `docker logs <redis_id>` | Redis logs |

## Support

If you encounter issues:

1. Check the relevant terminal for error messages
2. Review `STARTUP_GUIDE.md` for troubleshooting
3. Check Flask logs for model loading issues
4. Verify all ports are available
5. Ensure Docker is running

## Ready?

Run this to get started:

```powershell
cd C:\Users\benja\repos\SnowboardingExplained
.\start-all-services.ps1
```

Then open http://localhost:3000 and upload a video!
