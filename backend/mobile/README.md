# Snowboarding Coach Mobile App

React Native mobile app for getting AI-powered snowboarding coaching advice.

## Setup

1. Install dependencies (already done):
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
- **iOS:** Press `i` or scan QR code with Camera app
- **Android:** Press `a` or scan QR code with Expo Go app
- **Web:** Press `w`

## How It Works

1. User enters trick name and issues
2. App sends request to backend API
3. AI generates coaching response with video references
4. User can tap videos to watch on YouTube

## Configuration

Edit `src/config.ts` to change API URL:
- Development: `http://localhost:3000`
- Production: Your Vercel URL

## MVP Features

✅ Simple question flow (trick + issues)
✅ AI coaching response
✅ Video references with thumbnails
✅ Direct links to YouTube videos
✅ Clean ChatGPT-style UI

## Next Steps

- Add more question flow options
- Save chat history
- Add voice input
- Offline mode
- Progress tracking
