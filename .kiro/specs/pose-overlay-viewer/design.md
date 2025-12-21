# Pose Overlay Viewer - Design Document

## Overview

A web-based 3D pose comparison tool that lets riders compare their movement against coaches or professionals by viewing two 3D mesh models side-by-side or overlaid, independent of camera angle and body size.

**Platform**: Web (React + Three.js)
**Deployment**: Vercel/Netlify
**Performance Target**: 60fps desktop, 30-60fps mobile web

---

## Architecture

### High-Level Flow

```
User loads web app
  ↓
Select two videos (rider + reference)
  ↓
Fetch mesh data from backend API
  ↓
Normalize coordinate spaces
  ↓
Render in Three.js scene
  ↓
Synchronized playback at normalized phase time
  ↓
User controls: play/pause/scrub, camera rotate/zoom/pan, mode toggle
```

### Component Architecture

```
App (main)
├── PoseOverlayViewer (main component)
│   ├── ThreeJsScene (Three.js setup)
│   │   ├── MeshRenderer (rider)
│   │   ├── MeshRenderer (reference)
│   │   └── Camera controller
│   ├── PlaybackControls
│   │   ├── Play/pause button
│   │   ├── Timeline scrubber
│   │   ├── Speed control
│   │   └── Frame counter
│   ├── VisibilityToggle
│   │   ├── Show/hide rider
│   │   ├── Show/hide reference
│   │   ├── Mode selector (side-by-side/overlay)
│   │   └── Opacity slider (overlay mode)
│   └── CameraControls
│       ├── Rotate (mouse drag)
│       ├── Zoom (mouse wheel)
│       ├── Pan (right-click drag)
│       └── Reset button
```

### Data Flow

```
Backend API
  ↓
GET /api/pose-overlay/mesh/:videoId/:phase
  ↓
Returns: {
  frames: [{frameNumber, vertices, faces, normals}, ...],
  bodyProportions: {height, armLength, ...},
  fps: 30,
  ...
}
  ↓
Frontend loads mesh data
  ↓
Normalize coordinate spaces (PCA-based alignment)
  ↓
Create Three.js geometries
  ↓
Render in scene
  ↓
Synchronized playback
```

---

## Components & Interfaces

### 1. PoseOverlayViewer (Main Component)

**Responsibilities**:
- Manage overall state (playback, mode, visibility)
- Coordinate between sub-components
- Handle user interactions

**State**:
```typescript
interface PoseOverlayViewerState {
  riderMesh: MeshSequence | null;
  referenceMesh: MeshSequence | null;
  normalizedTime: number; // [0, 1]
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1, 2
  mode: 'side-by-side' | 'overlay';
  inPlaceMode: boolean;
  showRider: boolean;
  showReference: boolean;
  referenceOpacity: number; // [0, 1]
  loading: boolean;
  error: string | null;
}
```

### 2. ThreeJsScene (Three.js Setup)

**Responsibilities**:
- Initialize Three.js scene, camera, renderer
- Create mesh geometries from data
- Update mesh poses each frame
- Handle camera controls

**Key Methods**:
```typescript
function initScene(container: HTMLElement): void
function loadMesh(meshData: MeshData, color: number): THREE.Mesh
function updateMeshPose(mesh: THREE.Mesh, frame: MeshFrame): void
function normalizeSkeletons(mesh1: THREE.Mesh, mesh2: THREE.Mesh): void
function render(): void
```

### 3. MeshRenderer (Mesh Rendering)

**Responsibilities**:
- Create geometry from mesh data
- Apply materials and colors
- Update vertex positions each frame

**Key Methods**:
```typescript
function createGeometry(meshData: MeshData): THREE.BufferGeometry
function createMaterial(color: number, opacity: number): THREE.Material
function updateVertices(geometry: THREE.BufferGeometry, vertices: number[][]): void
```

### 4. PlaybackControls (Playback UI)

**Responsibilities**:
- Play/pause/scrub controls
- Speed control
- Frame counter display

**Props**:
```typescript
interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number; // [0, 1]
  duration: number; // seconds
  speed: number;
  onPlayPause: () => void;
  onScrub: (time: number) => void;
  onSpeedChange: (speed: number) => void;
}
```

### 5. VisibilityToggle (Visibility Controls)

**Responsibilities**:
- Toggle mesh visibility
- Switch between modes
- Adjust opacity

**Props**:
```typescript
interface VisibilityToggleProps {
  showRider: boolean;
  showReference: boolean;
  mode: 'side-by-side' | 'overlay';
  referenceOpacity: number;
  onShowRiderChange: (show: boolean) => void;
  onShowReferenceChange: (show: boolean) => void;
  onModeChange: (mode: 'side-by-side' | 'overlay') => void;
  onOpacityChange: (opacity: number) => void;
}
```

### 6. CameraControls (Camera Interaction)

**Responsibilities**:
- Handle mouse/touch input
- Update camera position/rotation
- Provide reset functionality

**Key Methods**:
```typescript
function handleMouseDown(event: MouseEvent): void
function handleMouseMove(event: MouseEvent): void
function handleMouseUp(event: MouseEvent): void
function handleMouseWheel(event: WheelEvent): void
function resetCamera(): void
```

---

## Data Models

### MeshFrame

```typescript
interface MeshFrame {
  frameNumber: number;
  timestamp: number; // milliseconds
  vertices: number[][]; // [[x,y,z], [x,y,z], ...]
  faces: number[][]; // [[v0,v1,v2], [v0,v1,v2], ...]
  normals?: number[][]; // [[nx,ny,nz], ...]
}
```

### MeshSequence

```typescript
interface MeshSequence {
  id: string;
  videoId: string;
  trick: string;
  phase: string;
  frameStart: number;
  frameEnd: number;
  fps: number;
  frames: MeshFrame[];
  bodyProportions: {
    height: number;
    armLength: number;
    legLength: number;
    torsoLength: number;
    shoulderWidth: number;
    hipWidth: number;
  };
}
```

### BodyProportions

```typescript
interface BodyProportions {
  height: number;
  armLength: number;
  legLength: number;
  torsoLength: number;
  shoulderWidth: number;
  hipWidth: number;
}
```

---

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Mesh Alignment Consistency

**For any** two mesh sequences from different videos, after coordinate space normalization, both meshes should be centered at the origin and aligned to the same principal axes.

**Validates**: Requirements 1.1, 1.2 (coordinate normalization)

### Property 2: Synchronized Playback Alignment

**For any** two mesh sequences with different frame counts, when normalized to [0, 1] phase time, key moments (start, middle, end) should align temporally.

**Validates**: Requirements 1.3 (synchronized playback)

### Property 3: Mesh Rendering Correctness

**For any** mesh frame data, the rendered Three.js geometry should have the same number of vertices and faces as the input data.

**Validates**: Requirements 2.1 (mesh rendering)

### Property 4: Playback Time Consistency

**For any** playback state, the normalized time should always be in the range [0, 1], and scrubbing to a specific time should result in that exact normalized time.

**Validates**: Requirements 1.4 (playback controls)

### Property 5: Opacity Control Consistency

**For any** opacity value in overlay mode, the reference mesh should render with that exact opacity, and the rider mesh should always render at full opacity.

**Validates**: Requirements 1.5 (visibility controls)

### Property 6: Camera Control Responsiveness

**For any** camera control input (rotate, zoom, pan), the camera should update its position/rotation accordingly, and the scene should re-render with the new view.

**Validates**: Requirements 1.6 (camera controls)

### Property 7: Mode Switching Consistency

**For any** mode switch (side-by-side to overlay or vice versa), both meshes should remain visible and properly positioned in the new mode.

**Validates**: Requirements 1.7 (mode switching)

### Property 8: Body Proportion Scaling Accuracy

**For any** two mesh sequences with different body proportions, after scaling the reference to match the rider's proportions, the reference mesh should be proportionally smaller/larger as expected.

**Validates**: Requirements 2.2 (body proportion scaling)

---

## Error Handling

### Network Errors
- Handle failed mesh data fetches
- Show user-friendly error messages
- Provide retry functionality

### Rendering Errors
- Catch Three.js errors
- Fallback to simpler rendering if needed
- Log errors for debugging

### Data Validation
- Validate mesh data format
- Check for missing/invalid vertices or faces
- Handle edge cases (empty meshes, single frame, etc.)

---

## Testing Strategy

### Unit Tests
- Coordinate normalization (PCA alignment)
- Frame interpolation (smooth curves)
- Mesh scaling (proportion ratios)
- Time normalization (0-1 range)

### Integration Tests
- Load mesh data from API
- Render in Three.js
- Synchronized playback
- All controls work correctly

### Visual Tests
- Mesh alignment (visual inspection)
- Scaling accuracy (compare to reference)
- Camera controls (manual testing)
- Mode switching (visual verification)

### Performance Tests
- Rendering FPS (target: 60fps desktop, 30-60fps mobile)
- Memory usage (target: < 100MB)
- Load time (target: < 2 seconds)

---

## Deployment

### Build
- Vite for bundling
- TypeScript for type safety
- ESLint for code quality

### Hosting
- Vercel or Netlify
- Static site hosting
- CDN for fast delivery

### Environment Variables
```
VITE_API_URL=https://api.example.com
VITE_ENVIRONMENT=production
```

---

## Future Enhancements

### Phase 2: Advanced Features
- Numeric deltas overlay ("15° less knee extension")
- Velocity vectors visualization
- Acceleration visualization
- Symmetry analysis (left vs right)

### Phase 3: Advanced Visualization
- Heatmaps showing deviation areas
- Export comparison as video
- Multi-person comparison (3+ skeletons)
- Skeleton animation export

### Phase 4: Cross-Platform
- Mobile app integration (WebView)
- Electron desktop app
- VR/AR versions

---

## Success Criteria

### MVP
- [ ] Load two mesh sequences
- [ ] Render side-by-side in Three.js
- [ ] Synchronized playback at normalized phase time
- [ ] Play/pause/scrub controls work
- [ ] Camera rotation works
- [ ] 60fps on desktop, 30-60fps on mobile
- [ ] Responsive design

### Full Feature
- [ ] All MVP criteria met
- [ ] Overlay mode works correctly
- [ ] In-place mode removes translation
- [ ] Body proportion scaling works
- [ ] All controls intuitive
- [ ] Documentation complete
- [ ] Coaches validate usefulness
- [ ] No critical bugs

---

## Technical Decisions

### Why Web (React + Three.js)?
- Three.js is designed for web
- Better performance than React Native
- Easier development and debugging
- Cross-platform (desktop, tablet, mobile web)

### Why Vite?
- Fast build times
- Hot module replacement
- Optimized for modern browsers
- Great TypeScript support

### Why Three.js?
- Mature, well-documented library
- Excellent performance
- Large community and examples
- Perfect for 3D mesh rendering

### Why PCA for Alignment?
- Standard computer vision technique
- Handles different camera angles
- Mathematically sound
- Easy to test and validate

---

## File Structure

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
│   └── index.tsx
├── public/
│   └── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Next Steps

1. Review and approve this design
2. Create implementation task list
3. Begin Phase 1 implementation
4. Get coach feedback
5. Iterate based on feedback
