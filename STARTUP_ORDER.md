# Startup Order - Critical for System to Work

The three services must be started in this specific order:

## 1. Start Pose Service (Port 5000) - FIRST
This takes ~70+ seconds to warm up (HMR2 ~51s + ViTDet ~20s)

```bash
cd SnowboardingExplained/backend/pose-service
python app.py
```

**Wait for this message:**
```
[WARMUP] HMR2 loaded in XX.Xs
[WARMUP] ViTDet loaded in XX.Xs
```

Once you see both models loaded, the pose service is ready.

## 2. Start Backend API (Port 3001) - SECOND
Only start this after pose service is running

```bash
cd SnowboardingExplained/backend
npm run dev
```

**Wait for this message:**
```
[STARTUP] ✓ Pose service is responding
[STARTUP] Pose service status: { status: 'ready', ... }
🚀 Video Coaching API running on port 3001
```

## 3. Start Mobile App (Port 19000) - THIRD
Only start this after backend is running

```bash
cd SnowboardingExplained/backend/mobile
npx expo start --clear
```

## Why This Order?

- **Pose Service First**: Takes longest to warm up. Backend will check its health on startup.
- **Backend Second**: Initializes database and checks pose service health. Mobile app will call backend endpoints.
- **Mobile App Third**: Calls backend and pose service directly. Needs both to be ready.

## Troubleshooting

### "Pose service is offline" in mobile app
- Check if pose service is running: `http://172.24.183.130:5000/health`
- Check if backend can reach it: `http://localhost:3001/api/pose/health`
- Make sure pose service finished warming up (both models loaded)

### Backend won't start
- Make sure pose service is running first
- Check `.env.local` has correct `POSE_SERVICE_URL=http://172.24.183.130:5000`
- Check backend logs for connection errors

### Mobile app can't upload video
- Make sure all 3 services are running
- Mobile app uploads directly to pose service at `http://localhost:5000`
- Backend is not in the upload path (mobile bypasses ngrok timeout)

## Architecture

```
Mobile App (Expo, port 19000)
    ↓
    ├→ Backend API (port 3001) - for chat, knowledge base
    └→ Pose Service (port 5000) - for video upload & processing
         (running in WSL at 172.24.183.130:5000)
```

The mobile app calls the pose service directly to avoid ngrok's 30-second timeout.
