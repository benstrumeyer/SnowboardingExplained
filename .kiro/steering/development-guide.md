---
inclusion: always
---

# Development Guide

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- WSL2 (for Windows users running pose service)
- Git

### Installation

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   cd ../backend/pose-service && pip install -r requirements.txt
   ```

2. Set up environment:
   - Copy `.env.example` to `.env.local` in `backend/`
   - Configure Gemini API key if needed

3. See `INSTALL_DEPENDENCIES.md` for detailed setup

## Running Services

### Backend Server

```bash
cd backend
npm run dev
```

Runs on `http://localhost:3000`

### Mobile App

```bash
cd backend/mobile
npm run dev
```

Opens Expo DevTools

### Pose Service

```bash
cd backend/pose-service
python app.py
```

Runs on `http://localhost:5000`

### All Services

Use the provided batch files:
- `start-dev.bat`: Backend + Mobile
- `start-pose-service.bat`: Pose service
- `start-backend.bat`: Backend only

## Code Organization

### Backend (`backend/src/`)

- **server.ts**: Express server setup and routes
- **types.ts**: TypeScript interfaces and types
- **services/**: Business logic
  - `videoAnalysisPipelineImpl.ts`: Video processing orchestration
  - `pythonPoseService.ts`: Communication with pose service
  - `phaseDetector.ts`: Phase detection logic
  - `perfectPhaseService.ts`: Perfect phase management
- **utils/**: Helper functions
  - `phaseDetector.ts`: Phase detection utilities
  - `analysisLogger.ts`: Logging utilities
- **api/**: API endpoint handlers
  - `upload-video.ts`: Video upload handler
  - `video-details.ts`: Video metadata handler

### Mobile (`backend/mobile/src/`)

- **screens/**: Full-page components
  - `VideoUploadScreen.tsx`: Upload interface
  - `VideoAnalysisScreen.tsx`: Analysis results display
  - `TrickAnalysisScreen.tsx`: Trick-specific analysis
  - `FormAnalysisScreen.tsx`: Form analysis
- **components/**: Reusable UI components
  - `VideoAnalysisOverlay.tsx`: Mesh rendering
  - `AnalysisPanel.tsx`: Analysis data display
  - `FrameNavigationControls.tsx`: Frame navigation
- **services/**: API and data services
  - `api.ts`: HTTP client
  - `poseAnalysisService.ts`: Pose data fetching
  - `frameExtractionService.ts`: Frame image fetching
- **store/**: Redux state management
  - `slices/`: Redux slices for different domains
  - `thunks/`: Async Redux actions

### Pose Service (`backend/pose-service/`)

- **app.py**: Flask server and endpoints
- **video_processor.py**: Video frame extraction and processing
- **hybrid_pose_detector.py**: 3D pose estimation
- **mesh_renderer.py**: 3D mesh rendering
- **test_*.py**: Test scripts

## Common Development Tasks

### Adding a New API Endpoint

1. Create handler in `backend/api/`:
   ```typescript
   export async function handleNewEndpoint(req: Request, res: Response) {
     // Implementation
   }
   ```

2. Register in `backend/src/server.ts`:
   ```typescript
   app.post('/api/new-endpoint', handleNewEndpoint);
   ```

3. Add types to `backend/src/types.ts` if needed

4. Create service in `backend/src/services/` if complex logic

### Modifying Pose Service

1. Edit Python file in `backend/pose-service/`
2. Test with corresponding `test_*.py` script
3. Restart service: Stop and run `python app.py` again
4. Check logs for errors

### Updating Mobile UI

1. Edit component in `backend/mobile/src/`
2. Changes hot-reload in Expo
3. Test on device or emulator
4. Check console for errors

### Adding Redux State

1. Create slice in `backend/mobile/src/store/slices/`
2. Add to store in `backend/mobile/src/store/store.ts`
3. Create thunks in `backend/mobile/src/store/thunks/` if async
4. Use `useAppDispatch` and `useAppSelector` in components

## Debugging

### Backend

- Logs in `backend/logs/combined.log` and `error.log`
- Use `console.log()` for quick debugging
- Check network tab in browser DevTools

### Mobile

- Use Expo DevTools (press `i` for iOS, `a` for Android)
- React Native Debugger for advanced debugging
- Check console for errors and warnings

### Pose Service

- Check Flask console output
- Add print statements for debugging
- Use `test_*.py` scripts to isolate issues

## Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Pose service tests
cd backend/pose-service
python -m pytest test_*.py
```

### Manual Testing

1. Upload a short video (use `max_frames=15` for speed)
2. Monitor logs during processing
3. Verify results in mobile app
4. Check frame images display correctly

## Performance Tips

- Use `max_frames` parameter to limit processing during development
- Cache API responses when possible
- Use React.memo() for expensive components
- Profile with React DevTools Profiler

## Git Workflow

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and test
3. Commit with meaningful message: `git commit -m "description"`
4. Push: `git push origin feature/description`
5. Create pull request

## Useful Commands

```bash
# Backend
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests

# Mobile
npm run dev          # Start Expo
npm run build        # Build for production

# Pose Service
python app.py        # Start service
python test_*.py     # Run specific test
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Pose Service Won't Start

- Check Python version: `python --version`
- Verify dependencies: `pip list`
- Check logs for specific errors
- Try reinstalling: `pip install -r requirements.txt --force-reinstall`

### Mobile App Crashes

- Check console for error messages
- Clear cache: `npm start -- --clear`
- Restart Expo: `npm run dev`

## Resources

- See `STARTUP_ORDER.md` for service startup sequence
- See `INSTALL_DEPENDENCIES.md` for detailed setup
- See `docs/MCP_TOOLS_REFERENCE.md` for MCP tools
- See `.kiro/steering/wsl-integration.md` for WSL-specific tools
