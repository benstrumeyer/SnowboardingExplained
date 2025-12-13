# Mobile App Setup Guide

## Quick Start

### 1. Get Your Machine's IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your network adapter (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
```
Look for `inet` address

### 2. Update Mobile App Configuration

Edit `backend/mobile/src/config.ts`:

```typescript
export const API_URL = 'http://YOUR_MACHINE_IP:3001';
```

Replace `YOUR_MACHINE_IP` with your actual IP address from step 1.

### 3. Start Backend Server

```bash
cd SnowboardingExplained/backend
npm run dev
```

You should see:
```
🚀 Video Coaching API running on port 3001
```

### 4. Start Mobile App

```bash
cd SnowboardingExplained/backend/mobile
npm start
```

You should see the Expo QR code in the terminal.

### 5. Connect with Expo Go

1. Install **Expo Go** app on your phone (iOS App Store or Google Play)
2. Open Expo Go
3. Scan the QR code from the terminal
4. Wait for the app to load

### 6. Test Health Check

When the app loads, you should see a health check screen showing:
- ✅ Backend is running and healthy!
- Server uptime

## Troubleshooting

### "Backend connection failed"

**Problem:** The app can't reach the backend

**Solutions:**
1. Check backend is running: `npm run dev` in backend folder
2. Verify IP address is correct: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Ensure phone and computer are on **same WiFi network**
4. Try pinging your machine from phone: Open browser and go to `http://YOUR_IP:3001/api/health`
5. Check firewall isn't blocking port 3001

### "QR code scan times out"

**Problem:** Expo Go can't connect to Metro bundler

**Solutions:**
1. Ensure you're on the same WiFi network
2. Try using LAN connection instead of tunnel:
   - In Expo terminal, press `w` for web
   - Then press `s` to switch connection mode
3. Restart Expo: `npm start` again

### "Module not found" errors

**Problem:** Dependencies not installed

**Solutions:**
```bash
cd backend/mobile
npm install
npm start
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Expo Go (Phone)                 │
│  ┌─────────────────────────────────┐   │
│  │   React Native App              │   │
│  │   - Video Upload Screen         │   │
│  │   - Analysis Overlay            │   │
│  │   - Chat Interface              │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ HTTP (WiFi)
               │ http://YOUR_IP:3001
               ▼
┌─────────────────────────────────────────┐
│    Backend Server (Your Computer)       │
│  ┌─────────────────────────────────┐   │
│  │   Express.js API                │   │
│  │   - Video Upload Handler        │   │
│  │   - Frame Extraction            │   │
│  │   - Pose Estimation             │   │
│  │   - LLM Trick Detection         │   │
│  │   - Chat Service                │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## API Endpoints

All endpoints are prefixed with `http://YOUR_IP:3001/api`

- `GET /health` - Health check
- `POST /video/upload` - Upload video for analysis
- `GET /video/:videoId/frames` - Get video frames
- `POST /chat/session` - Create chat session
- `POST /chat/message` - Send message to coach
- `GET /knowledge/search` - Search knowledge base

## Environment Variables

Create `.env` file in `backend/` folder:

```
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

## Logs

### Backend Logs
Check the terminal where you ran `npm run dev` in the backend folder.

### Mobile Logs
In Expo Go app, shake your phone to open the developer menu and view logs.

## Next Steps

1. Upload a snowboarding video
2. Watch the system analyze the trick
3. Chat with the AI coach for feedback
4. Get personalized coaching tips
