# Pose Overlay Viewer - Project Structure

## Where Does This Live?

The Pose Overlay Viewer is a **separate web application** from the mobile app. It should be created in a new directory:

```
SnowboardingExplained/
├── backend/
│   ├── mobile/                    # Existing React Native mobile app
│   │   ├── src/
│   │   ├── App.tsx
│   │   └── ...
│   │
│   ├── web/                       # NEW: Pose Overlay Viewer web app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   ├── App.tsx
│   │   │   └── index.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── ...
│   │
│   ├── src/                       # Existing backend services
│   │   ├── api/
│   │   ├── services/
│   │   └── ...
│   │
│   └── pose-service/              # Existing pose extraction service
│       └── ...
│
└── .kiro/specs/pose-overlay-viewer/  # This spec
    ├── design.md
    ├── tasks.md
    └── ...
```

## Why Separate?

1. **Different Tech Stack**: Web app uses React + Three.js, mobile app uses React Native
2. **Different Deployment**: Web app deploys to Vercel/Netlify, mobile app deploys to app stores
3. **Different Performance Requirements**: Web app needs 60fps 3D rendering, mobile app is UI-focused
4. **Different Build Process**: Web app uses Vite, mobile app uses Metro bundler
5. **Easier to Maintain**: Separate codebases, separate dependencies, separate CI/CD

## Shared Resources

The web app will **share** these with the existing backend:

1. **Backend API** (`backend/src/api/`)
   - Existing `pose-overlay.ts` endpoint (to be created)
   - Returns mesh data, body proportions, etc.

2. **Database** 
   - Mesh data stored in existing database
   - Body proportions stored in existing database

3. **Pose Service** (`backend/pose-service/`)
   - Existing mesh extraction (HMR2)
   - Existing pose data

## Deployment

### Mobile App
- Deployed to: App Store, Google Play
- Runs on: iOS, Android devices
- Tech: React Native

### Web App (Pose Overlay Viewer)
- Deployed to: Vercel or Netlify
- Runs on: Desktop browsers, mobile browsers
- Tech: React + Three.js
- URL: `https://pose-overlay.example.com` (or similar)

## Integration Path

### Phase 1: Standalone Web App
- Build and deploy web app independently
- Coaches access via URL
- No integration with mobile app

### Phase 2: Mobile Integration (Optional, Later)
- Embed web app in React Native via WebView
- Or build separate native mobile app
- Or just use mobile web (no app needed)

## File Structure for Web App

```
backend/web/
├── src/
│   ├── components/
│   │   ├── PoseOverlayViewer.tsx
│   │   ├── ThreeJsScene.tsx
│   │   ├── MeshRenderer.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── VisibilityToggle.tsx
│   │   └── CameraControls.tsx
│   ├── services/
│   │   ├── meshDataService.ts
│   │   ├── coordinateNormalization.ts
│   │   ├── meshInterpolation.ts
│   │   └── cameraController.ts
│   ├── hooks/
│   │   ├── useSynchronizedPlayback.ts
│   │   ├── useThreeJsScene.ts
│   │   └── useMeshData.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── public/
│   └── index.html
├── tests/
│   ├── coordinateNormalization.test.ts
│   ├── meshInterpolation.test.ts
│   └── ...
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

## Dependencies

### Web App Dependencies
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "three": "^r150",
    "axios": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^3.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

## Environment Variables

```
# .env.example
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

## Getting Started

### Setup
```bash
cd backend/web
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Deploy
```bash
# Vercel
vercel deploy

# Netlify
netlify deploy
```

## Summary

- **Location**: `backend/web/` (new directory)
- **Tech**: React + Three.js + Vite
- **Deployment**: Vercel/Netlify
- **Shared**: Backend API, database, pose service
- **Separate**: Codebase, dependencies, build process, deployment

This keeps the web app completely separate from the mobile app while sharing the backend infrastructure.
