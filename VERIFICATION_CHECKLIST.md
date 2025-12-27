# Verification Checklist

## Pre-Setup

- [ ] WSL installed with Python 3.8+
- [ ] Node.js 16+ installed on Windows
- [ ] MongoDB running
- [ ] Test video file available

## Pose Service Setup (WSL)

- [ ] Navigate to `pose-service` directory
- [ ] Virtual environment exists: `ls venv/`
- [ ] Virtual environment activated: `(venv)` in prompt
- [ ] Dependencies installed: `pip list | grep opencv-python`
- [ ] Models downloaded: `ls .models/` shows `hmr2` and `vitpose`
- [ ] `.env.local` file exists with correct configuration
- [ ] Pose service starts: `python app.py`
- [ ] Service listens on `http://localhost:5000`

## Backend Setup (Windows)

- [ ] Navigate to `backend` directory
- [ ] Node modules installed: `ls node_modules/`
- [ ] `.env.local` file exists with correct configuration
- [ ] `USE_HTTP_POSE_SERVICE=true` is set
- [ ] `POSE_SERVICE_URL=http://localhost:5000` is set
- [ ] Backend starts: `npm run dev`
- [ ] Backend listens on `http://localhost:3001`

## Frontend Setup (Windows)

- [ ] Navigate to `backend/web` directory
- [ ] Node modules installed: `ls node_modules/`
- [ ] Frontend starts: `npm run dev`
- [ ] Frontend accessible at `http://localhost:5173`

## Integration Testing

### Test 1: Service Health Check

**Pose Service:**
```bash
curl http://localhost:5000/health
```
Expected: `200 OK` response

**Backend:**
```bash
curl http://localhost:3001/api/health
```
Expected: `200 OK` response

### Test 2: Single Frame Upload

```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

Expected response:
```json
{
  "success": true,
  "videoId": "v_...",
  "role": "rider",
  "message": "Video uploaded. Pose extraction started in background."
}
```

### Test 3: Check Logs

**Pose Service logs should show:**
```
[INFO] Processing frame 0
[INFO] Processing frame 1
...
```

**Backend logs should show:**
```
[UPLOAD] Submitting X frames to process pool
[UPLOAD] Successfully processed X/X frames
Pose detection completed
```

### Test 4: Verify MongoDB

```bash
mongosh
use snowboarding_explained
db.mesh_data.findOne()
```

Should return pose data for the uploaded video.

## Performance Verification

- [ ] Single frame processes in ~2-3 seconds
- [ ] 31 frames process in ~40-50 seconds
- [ ] No "write EOF" errors
- [ ] No "Connection refused" errors
- [ ] No timeout errors

## Configuration Verification

### Pose Service (.env.local)

```env
HOST=0.0.0.0
PORT=5000
MODEL_CACHE_DIR=.models
LOG_LEVEL=INFO
DEBUG=false
```

- [ ] File exists at `pose-service/.env.local`
- [ ] All variables set correctly

### Backend (.env.local)

```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=120000
MAX_CONCURRENT_PROCESSES=2
PORT=3001
NODE_ENV=development
```

- [ ] File exists at `backend/.env.local`
- [ ] All variables set correctly
- [ ] `USE_HTTP_POSE_SERVICE=true`
- [ ] `POSE_SERVICE_URL=http://localhost:5000`

## Troubleshooting Checklist

If tests fail, check:

### Pose Service Issues

- [ ] Python virtual environment activated
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] Models downloaded: `python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"`
- [ ] Port 5000 not in use: `lsof -i :5000`
- [ ] Check logs for errors

### Backend Issues

- [ ] Node modules installed: `npm install`
- [ ] `.env.local` configured correctly
- [ ] Pose service running and accessible
- [ ] Port 3001 not in use: `lsof -i :3001`
- [ ] Check logs for errors

### MongoDB Issues

- [ ] MongoDB running: `mongosh`
- [ ] Database exists: `use snowboarding_explained`
- [ ] Collections exist: `db.getCollectionNames()`

## Success Criteria

✅ All checks pass if:
1. Pose service starts without errors
2. Backend connects to pose service
3. Frontend loads successfully
4. Video upload completes
5. Pose data saved to MongoDB
6. No "write EOF" or connection errors
7. Processing time matches expected performance

## Next Steps

If all checks pass:
1. System is ready for production use
2. You can upload videos and process them
3. Results are stored in MongoDB
4. Frontend can display results

If any checks fail:
1. Review the troubleshooting section
2. Check the relevant documentation
3. Verify configuration files
4. Check service logs
5. Ensure all prerequisites are met

## Support

For issues:
1. Check `START_HERE.md`
2. Review `COMPLETE_SETUP.md`
3. Check service logs
4. Verify configuration files
5. Ensure all services are running
