# Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Redis (for caching)
- Expo CLI (for mobile development)
- Google Gemini API key

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

### 3. Start Redis

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis
```

### 4. Run Backend

```bash
npm run dev
```

Backend will be available at `http://localhost:3000`

## Data Pipeline Setup

### 1. Install Dependencies

```bash
cd data-pipeline
npm install
```

### 2. Scrape Transcripts

```bash
npm run scrape
```

This will:
- Fetch all videos from Snowboarding Explained channel
- Download transcripts
- Save to `data/transcripts/`

### 3. Generate Embeddings

```bash
npm run embeddings
```

This will:
- Process all transcripts
- Generate vector embeddings
- Save to `data/embeddings/`

### 4. Build Index

```bash
npm run build-index
```

This creates the searchable index at `data/index.json`

## Mobile App Setup

### 1. Install Expo CLI

```bash
npm install -g expo-cli
```

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Configure API URL

Edit `mobile/src/config.ts`:

```typescript
export const API_URL = 'http://localhost:3000'; // Development
// export const API_URL = 'https://your-api.com'; // Production
```

### 4. Start Development Server

```bash
npm start
```

### 5. Run on Device/Simulator

- **iOS:** Press `i` in terminal or scan QR code with Expo Go app
- **Android:** Press `a` in terminal or scan QR code with Expo Go app

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Mobile Tests

```bash
cd mobile
npm test
```

## Deployment

### Backend (Railway/Render)

1. Push code to GitHub
2. Connect to Railway/Render
3. Set environment variables
4. Deploy

### Mobile (Expo EAS)

```bash
cd mobile
eas build --platform ios
eas build --platform android
eas submit
```

## Troubleshooting

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### Gemini API Errors

- Verify API key is correct
- Check quota limits
- Ensure billing is enabled

### Mobile App Not Connecting

- Check API_URL is correct
- Ensure backend is running
- Check network connectivity
- Try clearing Expo cache: `expo start -c`

## Development Workflow

1. Start Redis
2. Start backend: `cd backend && npm run dev`
3. Start mobile: `cd mobile && npm start`
4. Make changes and test
5. Commit and push

## Useful Commands

```bash
# Backend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
npm test             # Run tests

# Data Pipeline
npm run scrape       # Scrape new transcripts
npm run embeddings   # Generate embeddings
npm run build-index  # Build search index
npm run update       # Update with new videos

# Mobile
npm start            # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run build        # Build for production
```
