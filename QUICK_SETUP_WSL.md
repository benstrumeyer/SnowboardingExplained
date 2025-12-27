# Quick Setup: Backend + WSL Pose Service

## TL;DR

### Terminal 1: Start WSL Pose Service
```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python app.py
```

### Terminal 2: Configure & Start Backend
```bash
cd SnowboardingExplained/backend

# Create .env.local
cat > .env.local << 'EOF'
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=120000
EOF

# Start backend
npm run dev
```

### Terminal 3: Test
```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

## What This Does

1. **WSL Pose Service** - Listens on http://localhost:5000
2. **Backend** - Connects via HTTP, no local Python needed
3. **ProcessPoolManager** - Queues requests, limits concurrency
4. **HTTP Wrapper** - Sends frames to WSL service

## Configuration

### .env.local

```env
# Enable HTTP mode
USE_HTTP_POSE_SERVICE=true

# WSL service URL
POSE_SERVICE_URL=http://localhost:5000

# Timeout (milliseconds)
POSE_SERVICE_TIMEOUT=120000

# Optional: Debug logging
POSE_SERVICE_DEBUG=true
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connection refused | Start WSL service: `python app.py` |
| Timeout errors | Increase `POSE_SERVICE_TIMEOUT` |
| No module 'cv2' in WSL | `pip install -r requirements.txt` |
| Models not found | `python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"` |

## Expected Output

**WSL Service:**
```
[INFO] Starting pose service on http://localhost:5000
[INFO] Processing frame 0
[INFO] Processing frame 1
...
```

**Backend:**
```
[POSE_SERVICE_CLIENT] Initialized with URL: http://localhost:5000
ProcessPoolManager initialized with mode: HTTP
[UPLOAD] Submitting 31 frames to process pool
[UPLOAD] Successfully processed 31/31 frames
```

## That's It!

The backend will now use the WSL pose service for all frame processing.
