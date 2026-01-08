# Design Patterns

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Video Processing Pipeline

```
Video Upload → Extract Frames → 4D-Humans Pose → PHALP Tracking → Mesh Render → Save Videos → JSON Response
```

## Data Structures

### Upload Request
```typescript
{
  video: File;
  max_frames?: number;  // Optional: limit frames for testing
}
```

### Pose Response
```typescript
{
  jobId: string;
  status: 'processing' | 'complete' | 'error';
  result: {
    frames: Frame[];
    originalVideo: {
      filename: string;
      size: number;
    };
    meshOverlayVideo: {
      filename: string;
      size: number;
    };
    metadata: {
      fps: number;
      duration: number;
      resolution: [width, height];
      frameCount: number;
    };
  };
}
```

### Frame
```typescript
{
  frameNumber: number;
  timestamp: number;
  vertices: number[][];      // 6890 3D points
  faces: number[][];         // 13776 triangle indices
  camera: {
    tx: number;
    ty: number;
    tz: number;
    focal_length: number;
  };
  personId: number;
  tracked: boolean;          // PHALP tracked this frame
  confidence: number;
}
```

### Side-by-Side View Data
```typescript
{
  jobId: string;
  originalVideo: Binary;     // Original uploaded video
  meshOverlayVideo: Binary;  // track.py output with mesh overlay
  frames: Frame[];           // Mesh data for Three.js
  metadata: {
    fps: number;
    duration: number;
    resolution: [width, height];
    frameCount: number;
  };
}
```

## API Patterns

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pose/video` | POST | Upload video, get jobId |
| `/api/pose/job_status/:jobId` | GET | Check processing status |
| `/api/video/:jobId` | GET | Get video document with metadata |
| `/api/video/:jobId/original/stream` | GET | Stream original video |
| `/api/video/:jobId/overlay/stream` | GET | Stream mesh overlay video |
| `/api/video/:jobId/frame/:frameNumber` | GET | Get specific frame as image |

## Key Design Decisions

1. **Full Video Processing** - Process entire video at once (enables PHALP temporal tracking)
2. **PHALP Temporal Tracking** - Ensures motion consistency across frames
3. **Native FPS Playback** - Render at original video FPS
4. **Mesh-Based Rendering** - 3D mesh overlays in Three.js
5. **Async Processing** - Video processing happens asynchronously
6. **Side-by-Side View** - Left: video toggle (original/overlay), Right: Three.js mesh
7. **Frame Sync** - Both video and 3D mesh stay in perfect sync
8. **Video Storage** - Both videos saved to MongoDB with metadata

## Frontend Rendering

### PlaybackEngine Pattern (Source of Truth)

```typescript
// PlaybackEngine owns all timing
const engine = getGlobalPlaybackEngine();

// Global playback (video cells)
engine.play();           // emits play event
engine.pause();          // emits pause event
engine.setSpeed(speed);  // emits speedChanged event

// Independent mesh playback (mesh cells)
engine.registerMeshCell(cellId);
engine.meshPlay(cellId);           // emits meshPlay event
engine.meshPause(cellId);          // emits meshPause event
engine.meshFrameNext(cellId);      // emits meshFrameNext event
engine.meshFramePrev(cellId);      // emits meshFramePrev event
engine.meshSpeedChanged(cellId, speed); // emits meshSpeedChanged event
engine.setMeshPlaybackTime(cellId, time);

// All components listen to engine events
engine.addEventListener((event) => {
  if (event.type === 'frameUpdate') {
    // Update at 60fps based on engine.playbackTime
  } else if (event.type === 'meshPlay' && event.cellId === cellId) {
    // Start mesh playback
  } else if (event.type === 'meshFrameNext' && event.cellId === cellId) {
    // Advance mesh frame
  }
});
```

### Mesh Rendering (Geometry Reuse)

```typescript
// First frame: create geometry once
if (!meshRef.current) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(faces, 1));
  geometry.computeVertexNormals();
  meshRef.current = new THREE.Mesh(geometry, material);
}

// Every frame: only update position attribute
const posAttr = geometry.getAttribute('position');
posAttr.copyArray(frame.vertices);
posAttr.needsUpdate = true;
```

### MeshScrubber Pattern (Independent Playback)

```typescript
// MeshScrubber manages independent playback state
const meshPlaybackTimeRef = useRef(0);
const [isPlaying, setIsPlaying] = useState(false);
const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0);
const [controlMode, setControlMode] = useState<'orbit' | 'arcball'>('orbit');

// Listen to engine events for this mesh cell
engine.addEventListener((event) => {
  if (event.type === 'meshPlay' && event.cellId === cellId) {
    setIsPlaying(true);
  } else if (event.type === 'meshFrameNext' && event.cellId === cellId) {
    // Advance frame by frameIntervalMs
    meshPlaybackTimeRef.current = Math.min(maxTime, meshPlaybackTimeRef.current + frameIntervalMs);
  }
});

// RAF loop advances mesh time independently
if (isPlaying) {
  const deltaMs = now - lastMeshTimestamp.current;
  meshPlaybackTimeRef.current += deltaMs * speed;
  if (meshPlaybackTimeRef.current >= maxTime) {
    meshPlaybackTimeRef.current = meshPlaybackTimeRef.current % maxTime;
  }
}
```

### Control Mode Toggle (Orbit vs Arcball)

```typescript
// MeshScrubber button toggles control mode
<button onClick={() => {
  const newMode = controlMode === 'orbit' ? 'arcball' : 'orbit';
  onControlModeChange?.(newMode);
}}>
  {controlMode === 'orbit' ? 'Orbit' : 'Arcball'}
</button>

// MeshViewer uses controlMode in mouse handler
const onMouseMove = (e: MouseEvent) => {
  if (controlMode === 'orbit') {
    // Spherical coordinates: theta/phi/radius
    controlsRef.current.theta -= deltaX * 0.01;
    controlsRef.current.phi += deltaY * 0.01;
  } else {
    // Arcball: quaternion-based rotation
    const quat1 = new THREE.Quaternion();
    quat1.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * rotationSpeed);
    cameraDir.applyQuaternion(quat1);
  }
};
```

### Side-by-Side View Layout
```
┌─────────────────────────────────────────────────────┐
│ Left Panel (Video)      │ Right Panel (3D Mesh)     │
│ ┌───────────────────┐   │ ┌───────────────────────┐ │
│ │ [Original/Overlay]│   │ │ Three.js Canvas       │ │
│ │ Toggle Button     │   │ │ (Independent Playback)│ │
│ │                   │   │ │                       │ │
│ │ Video Player      │   │ │ 3D Mesh Visualization│ │
│ │ (Global Playback) │   │ │ (Independent Playback)│ │
│ └───────────────────┘   │ │ [Orbit/Arcball Toggle]│ │
│ CellNativeScrubber      │ └───────────────────────┘ │
│ [◄ Prev] [Play/Pause] [Next ►] [Speed] [Frame: 0/300]
│ MeshScrubber (Independent)                          │
│ [◄ Prev] [Play/Pause] [Next ►] [Speed] [Orbit/Arcball]
└─────────────────────────────────────────────────────┘
```

### Synchronization Strategy
- **PlaybackEngine** runs RAF loop at 60fps, maintains global and mesh playback times separately
- **MeshScrubber** manages independent mesh playback state with own RAF loop
- **CellNativeScrubber** syncs video.currentTime to global engine.playbackTime
- **useMeshSampler** listens to frameUpdate, reads mesh frame, updates geometry
- **Loop boundaries** - both video and mesh pause at end, seek to frame 0, resume together
- **Control modes** - toggle between orbit (spherical) and arcball (quaternion) without recreating controls
- **No React state** for 60fps updates - use refs and direct DOM manipulation

## Error Handling

- Backend: Try-catch with error logging
- Pose Service: Validate video format, handle missing frames
- Frontend: Retry logic, fallback UI states
- Video Sync: Fallback to frame-by-frame if streaming fails
