# Pose Overlay Viewer - Development Guide

## Project Structure

```
backend/
├── src/
│   ├── server.ts              # Express.js API server
│   ├── services/              # Business logic
│   │   ├── frameExtraction.ts
│   │   ├── pythonPoseService.ts
│   │   └── ...
│   └── utils/
├── api/
│   ├── upload-video-with-pose.ts  # Upload endpoint
│   ├── mesh-data.ts               # Mesh retrieval endpoint
│   └── job-status.ts              # Status endpoint
└── web/
    ├── src/
    │   ├── components/
    │   │   ├── VideoUploadModal.tsx
    │   │   ├── PoseOverlayViewer.tsx
    │   │   ├── MeshViewer.tsx
    │   │   ├── PlaybackControls.tsx
    │   │   ├── MeshControls.tsx
    │   │   └── ...
    │   ├── services/
    │   │   ├── meshDataService.ts
    │   │   └── mockMeshData.ts
    │   ├── hooks/
    │   │   ├── useThreeJsScene.ts
    │   │   └── useSynchronizedPlayback.ts
    │   ├── types/
    │   │   └── index.ts
    │   └── main.tsx
    ├── public/
    │   └── videoplayback-*.mov  # Test videos
    └── README.md
```

## Key Files

### Backend

**server.ts**
- Main Express.js server
- Defines API endpoints
- Handles video upload and mesh data storage

**frameExtraction.ts**
- Extracts frames from video files
- Uses FFmpeg for video processing
- Caches frames in memory

**pythonPoseService.ts**
- Communicates with Python pose service
- Sends frames for mesh extraction
- Parses mesh data responses

### Frontend

**VideoUploadModal.tsx**
- Video file selection UI
- Upload progress tracking
- Polling for job completion

**PoseOverlayViewer.tsx**
- Main component orchestrating the viewer
- Loads rider and reference meshes
- Manages playback state

**MeshViewer.tsx**
- Three.js scene setup
- Renders mesh geometry
- Handles camera controls

**meshDataService.ts**
- Polls backend for mesh data
- Implements retry logic
- Prevents duplicate loads

## Development Workflow

### Adding a New Feature

1. **Identify the Layer**
   - Frontend: Add component or service
   - Backend: Add endpoint or service
   - Both: Coordinate changes

2. **Create the Implementation**
   ```bash
   # Frontend component
   touch backend/web/src/components/NewComponent.tsx
   
   # Backend service
   touch backend/src/services/newService.ts
   ```

3. **Add Types**
   ```typescript
   // backend/web/src/types/index.ts
   export interface NewType {
     // ...
   }
   ```

4. **Test Locally**
   ```bash
   # Run all services
   npm run dev  # in each directory
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   ```

### Debugging

**Frontend Debugging**
```bash
# Enable React DevTools
# Open browser DevTools (F12)
# Check Console tab for errors
# Use React DevTools extension
```

**Backend Debugging**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check logs in console
# Use VS Code debugger
```

**Pose Service Debugging**
```bash
# Check Python logs
python app.py

# Test endpoint directly
curl -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```

## Testing

### Manual Testing

1. **Upload Video**
   - Click "Upload Rider" button
   - Select test video from `backend/web/public/`
   - Monitor upload progress

2. **Verify Mesh Data**
   - Check browser console for videoId
   - Verify mesh renders in 3D viewer
   - Test playback controls

3. **Test Controls**
   - Play/pause animation
   - Scrub through frames
   - Rotate mesh with mouse
   - Toggle visibility

### Automated Testing

```bash
# Frontend tests
cd backend/web
npm run test

# Backend tests
cd backend
npm run test
```

## Code Style

### TypeScript

```typescript
// Use strict typing
interface Props {
  videoId: string;
  onLoad: (data: MeshSequence) => void;
}

// Use const for immutability
const handleUpload = async (file: File) => {
  // ...
};

// Use arrow functions
const processFrame = (frame: Frame): ProcessedFrame => {
  // ...
};
```

### React Components

```typescript
// Use functional components
export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<StateType>(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Logging

```typescript
// Use consistent logging format
console.log(`[COMPONENT] Message with context`);
console.warn(`[COMPONENT] Warning message`);
console.error(`[COMPONENT] Error message`);

// Backend logging
logger.info(`[ENDPOINT] Request received`, { videoId, role });
logger.error(`[ENDPOINT] Error occurred`, { error: err.message });
```

## Performance Optimization

### Frontend

- **Code Splitting**: Lazy load Three.js
- **Memoization**: Use React.memo for expensive components
- **Virtualization**: Virtualize long lists if needed
- **Compression**: Gzip mesh data

### Backend

- **Caching**: Cache mesh data in memory
- **Streaming**: Stream large responses
- **Compression**: Gzip API responses
- **Pooling**: Reuse database connections

### Pose Service

- **Batching**: Process multiple frames in parallel
- **GPU**: Use GPU acceleration
- **Caching**: Cache model in memory
- **Optimization**: Profile and optimize hot paths

## Common Tasks

### Add a New API Endpoint

1. **Create handler in server.ts**
   ```typescript
   app.get('/api/new-endpoint/:id', (req, res) => {
     const { id } = req.params;
     // Handle request
     res.json({ data: 'response' });
   });
   ```

2. **Add logging**
   ```typescript
   console.log(`[NEW-ENDPOINT] Request for id: ${id}`);
   ```

3. **Test with curl**
   ```bash
   curl http://localhost:3001/api/new-endpoint/123
   ```

### Add a New Frontend Component

1. **Create component file**
   ```typescript
   // backend/web/src/components/NewComponent.tsx
   export const NewComponent: React.FC<Props> = (props) => {
     return <div>{/* JSX */}</div>;
   };
   ```

2. **Add to parent component**
   ```typescript
   import { NewComponent } from './NewComponent';
   
   export const ParentComponent = () => {
     return <NewComponent {...props} />;
   };
   ```

3. **Test in browser**
   - Hot reload should update automatically
   - Check browser console for errors

### Update Mesh Data Format

1. **Update types**
   ```typescript
   // backend/web/src/types/index.ts
   export interface MeshFrame {
     // Add new fields
   }
   ```

2. **Update backend**
   ```typescript
   // backend/src/server.ts
   const meshData = {
     frames: meshSequence.map(frame => ({
       // Include new fields
     }))
   };
   ```

3. **Update frontend**
   ```typescript
   // backend/web/src/components/MeshViewer.tsx
   const renderMesh = (frame: MeshFrame) => {
     // Use new fields
   };
   ```

## Troubleshooting Development Issues

### Hot Reload Not Working

```bash
# Restart dev server
npm run dev

# Clear cache
rm -rf node_modules/.vite
```

### Type Errors

```bash
# Regenerate types
npm run build

# Check tsconfig.json
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Memory Issues

```bash
# Increase Node.js heap
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

## Getting Help

1. Check existing issues in git history
2. Review logs for error messages
3. Test with minimal reproduction
4. Ask team members for guidance
5. Document findings for future reference
