# Pose Overlay Viewer - Web App

3D pose comparison tool for snowboarders built with React, Three.js, Vite, and Tailwind CSS.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

## Project Structure

```
src/
├── components/          # React components
│   ├── PoseOverlayViewer.tsx
│   ├── PlaybackControls.tsx
│   ├── MeshControls.tsx
│   ├── VisibilityToggle.tsx
│   ├── CameraControls.tsx
│   ├── AdvancedControls.tsx
│   ├── FrameNavigationControls.tsx
│   └── HelpOverlay.tsx
├── hooks/              # Custom React hooks
│   ├── useSynchronizedPlayback.ts
│   └── useThreeJsScene.ts
├── services/           # API and utility services
│   ├── meshDataService.ts
│   └── coordinateNormalization.ts
├── utils/              # Utility functions
│   ├── skeletonScaler.ts
│   └── inPlaceMotion.ts
├── types/              # TypeScript types
│   └── index.ts
├── index.css           # Tailwind CSS
├── App.tsx
└── main.tsx
```

## Features

### Phase 1: MVP ✅
- **Dual Rendering Modes**: Side-by-side and overlay visualization
- **Synchronized Playback**: Both meshes play at the same speed
- **Frame Offset Controls**: Adjust each mesh independently (±10 frames)
- **Per-Mesh Rotation**: Rotate meshes on X, Y, Z axes (±180°)
- **Camera Controls**: Rotate, zoom, and pan the view
- **Interactive Controls**: Play/pause, scrub, speed control (0.5x, 1x, 2x)

### Phase 2: Enhanced Features ✅
- **Overlay Mode**: Render both meshes in same 3D space with opacity control
- **In-Place Motion Mode**: Remove global translation, keep rotation and joint movement
- **Frame-by-Frame Navigation**: Arrow keys and dedicated buttons
- **Keyboard Shortcuts**: Space (play/pause), Arrow keys (frame nav), R (reset), M (toggle mode), H (help)
- **Improved Camera**: Zoom limits, pan limits, smooth transitions, touch support
- **Help System**: Interactive help overlay with shortcuts and tips

### Phase 3: Body Proportion Scaling ✅
- **Skeleton Scaler**: Scale meshes by body proportion ratios
- **Scale Toggle**: "Scale to Rider" checkbox with visual feedback
- **Proportion Validation**: Detect and warn when mismatch > 15%
- **Scale Factor Display**: Show current scale ratio

### Phase 4: Polish & Optimization ✅
- **Tailwind CSS**: Modern, responsive UI design
- **Performance**: Efficient rendering and state management
- **Error Handling**: Graceful error states with retry
- **Loading States**: Animated loading indicator
- **Mobile Responsive**: Touch-friendly controls
- **Documentation**: Complete user and developer guides

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← → | Previous/Next Frame |
| R | Reset Camera |
| M | Toggle View Mode |
| H | Show Help |

## Mouse Controls

| Action | Control |
|--------|---------|
| Rotate | Drag |
| Zoom | Scroll |
| Pan | Right-click drag |

## API Integration

The app expects the backend to provide mesh data via:

```
GET /api/pose-overlay/mesh/:videoId/:phase
```

Response format:

```json
{
  "id": "mesh-1",
  "videoId": "video-1",
  "trick": "backside-360",
  "phase": "takeoff",
  "frameStart": 0,
  "frameEnd": 120,
  "fps": 30,
  "frames": [
    {
      "frameNumber": 0,
      "timestamp": 0,
      "vertices": [[x, y, z], ...],
      "faces": [[v0, v1, v2], ...],
      "normals": [[nx, ny, nz], ...]
    }
  ],
  "bodyProportions": {
    "height": 1.7,
    "armLength": 0.7,
    "legLength": 0.9,
    "torsoLength": 0.5,
    "shoulderWidth": 0.4,
    "hipWidth": 0.35
  }
}
```

## Testing

```bash
npm run test
npm run test:run
```

## Deployment

Deploy to Vercel or Netlify:

```bash
npm run build
```

Then deploy the `dist` folder.

## Styling

Built with Tailwind CSS for a modern, responsive design. Custom color scheme:
- Primary: Blue (#3b82f6)
- Secondary: Orange (#f97316)
- Dark theme optimized for video viewing

## Documentation

See `PHASES_COMPLETE.md` for detailed information about all implemented phases and features.

## License

MIT
