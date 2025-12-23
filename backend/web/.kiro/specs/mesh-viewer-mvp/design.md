# Mesh Viewer MVP - Design Document

## Overview

The Mesh Viewer MVP is a web-based analysis tool for comparing snowboarding videos with extracted 3D pose mesh models. It provides coaches and athletes with multiple viewing modes, synchronized playback, camera controls, and body part tracking visualization. The system integrates video playback with 3D mesh rendering, maintaining frame-level synchronization while supporting various analysis modes.

## Architecture

### High-Level System Flow

```
User Loads Video/Mesh
    ↓
Backend Extracts Pose Data & Stores with Video
    ↓
Frontend Loads Unified Data Structure (Video + Mesh Frames)
    ↓
Display in Selected Mode (Side-by-Side, Overlay, Comparison, Single Scene)
    ↓
User Controls Playback (Play, Pause, Speed, Seek)
    ↓
Synchronized Update of Video & Mesh
    ↓
User Analyzes with Tracking Lines, Angles, Camera Controls
```

### Component Architecture

```
Frontend (React + Three.js)
├── MeshViewer.tsx (Main 3D Scene)
├── VideoPlayer.tsx (2D Video Display)
├── PlaybackControls.tsx (Play, Speed, Timeline)
├── CameraControls.tsx (Presets, Free Rotation)
├── MediaTabs.tsx (Tab Management)
├── TrackingVisualization.tsx (Tracking Lines, Angles)
├── MeshCustomization.tsx (Color, Opacity)
├── ToastNotification.tsx (User Feedback)
└── services/
    ├── meshDataService.ts (Data Fetching)
    ├── playbackService.ts (Sync & Timing)
    ├── trackingService.ts (Line Calculations)
    └── cameraService.ts (Camera Presets)

Backend (Node.js + MongoDB)
├── api/
│   ├── mesh-data.ts (GET /api/mesh-data/:videoId)
│   ├── upload.ts (POST /api/upload)
│   └── finalize.ts (POST /api/finalize-upload)
├── services/
│   ├── meshDataService.ts (MongoDB Operations)
│   ├── frameExtraction.ts (Pose Extraction)
│   └── videoProcessing.ts (Video + Mesh Sync)
└── models/
    └── MeshData.ts (Data Schema)
```

## Components and Interfaces

### Frontend Components

#### MeshViewer Component
Renders the 3D scene with mesh models, grid floor, and tracking lines.

```typescript
interface MeshViewerProps {
  meshes: MeshModel[];
  trackingLines: TrackingLine[];
  showAngles: boolean;
  cameraPreset: CameraPreset;
  gridVisible: boolean;
  backgroundColor: string;
}

interface MeshModel {
  id: string;
  frames: MeshFrame[];
  currentFrameIndex: number;
  color: THREE.Color;
  opacity: number;
  visible: boolean;
}

interface TrackingLine {
  keypointIndex: number;
  positions: THREE.Vector3[];
  color: THREE.Color;
  visible: boolean;
}
```

#### VideoPlayer Component
Displays 2D video with optional mesh overlay.

```typescript
interface VideoPlayerProps {
  videoUrl: string;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  overlayMesh?: MeshFrame;
  overlayOpacity: number;
}
```

#### PlaybackControls Component
Manages playback state and timeline scrubbing.

```typescript
interface PlaybackControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  playbackSpeed: PlaybackSpeed;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onSeek: (frame: number) => void;
}

type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;
```

#### CameraControls Component
Provides preset views and free rotation.

```typescript
interface CameraControlsProps {
  onPresetSelect: (preset: CameraPreset) => void;
  onRotation: (rotation: THREE.Euler) => void;
}

type CameraPreset = 'top' | 'front' | 'back' | 'left' | 'right';
```

#### MediaTabs Component
Manages multiple loaded media items.

```typescript
interface MediaTabsProps {
  tabs: MediaTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
}

interface MediaTab {
  id: string;
  name: string;
  type: 'video' | 'mesh' | 'combined';
  data: MeshSequence;
}
```

### Backend Data Models

#### Unified Data Structure (MeshSequence)
Combines video and mesh data with frame-level synchronization.

```typescript
interface MeshSequence {
  videoId: string;
  videoUrl: string;
  fps: number;
  videoDuration: number;
  totalFrames: number;
  frames: SyncedFrame[];
  metadata: {
    uploadedAt: Date;
    processingTime: number;
    extractionMethod: string;
  };
}

interface SyncedFrame {
  frameIndex: number;
  timestamp: number; // milliseconds
  videoFrameData?: {
    // Reference to video frame (can be extracted on demand)
    offset: number;
  };
  meshData: {
    keypoints: Keypoint[]; // 33 keypoints from MediaPipe
    skeleton: SkeletonConnection[];
    vertices: [number, number, number][]; // 3D positions
    faces: number[][]; // Triangle indices
  };
}

interface Keypoint {
  index: number;
  name: string;
  position: [number, number, number]; // x, y, z
  confidence: number;
}

interface SkeletonConnection {
  from: number; // keypoint index
  to: number;   // keypoint index
}
```

#### Frame Extraction and Synchronization
The backend processes video and mesh data together:

```typescript
interface FrameExtractionConfig {
  videoPath: string;
  fps: number;
  startFrame: number;
  endFrame: number;
}

interface ExtractionResult {
  frames: SyncedFrame[];
  fps: number;
  totalFrames: number;
  processingTimeMs: number;
}
```

## Data Models

### Frontend Types

```typescript
// Mesh frame with 3D data
interface MeshFrame {
  frameNumber: number;
  timestamp: number;
  keypoints: Array<{
    index: number;
    name: string;
    x: number;
    y: number;
    z: number;
    confidence: number;
  }>;
  vertices: Array<[number, number, number]>;
  faces: Array<number[]>;
  skeleton: Array<{ from: number; to: number }>;
}

// Tracking line for body part trajectory
interface TrackingLine {
  keypointIndex: number;
  keypointName: string;
  positions: Array<{ x: number; y: number; z: number }>;
  color: string;
  visible: boolean;
}

// Joint angle measurement
interface JointAngle {
  joint: string;
  angle: number; // degrees
  from: string; // parent keypoint
  to: string;   // child keypoint
}

// Playback state
interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: 0.25 | 0.5 | 1 | 2 | 4;
  fps: number;
}

// Camera state
interface CameraState {
  preset: 'top' | 'front' | 'back' | 'left' | 'right' | 'free';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  zoom: number;
}

// Mesh customization
interface MeshCustomization {
  color: string;
  opacity: number;
  showTrackingLines: boolean;
  showAngles: boolean;
  trackingLineColor?: string;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Synchronization Invariant
*For any* loaded video and mesh pair, at any given playback frame index, the video frame and mesh frame SHALL correspond to the same timestamp within ±1 frame tolerance.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: Playback Speed Consistency
*For any* playback speed setting, advancing N frames SHALL take exactly N/fps/speed seconds of real time, where fps is the video framerate and speed is the playback multiplier.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 3: Camera Centering Invariant
*For any* camera preset or free rotation, the model's world position SHALL remain at the origin (0, 0, 0) and SHALL NOT translate when the camera moves.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5**

### Property 4: Model Orientation Consistency
*For any* loaded model, the first frame's feet SHALL be positioned on the ground plane (y ≈ 0) and the head SHALL be oriented upward (positive y direction) after automatic orientation calculation.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 5: Grid Floor Stability
*For any* camera movement or model transformation, the grid floor SHALL remain stationary at y = 0 and SHALL NOT rotate or translate with the camera.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 6: Mesh Appearance Independence
*For any* mesh in a multi-mesh scene, changing the color or opacity of one mesh SHALL NOT affect the appearance of other meshes.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 7: Tracking Line Continuity
*For any* enabled tracking line, the line SHALL extend progressively as frames advance, and SHALL NOT have gaps or discontinuities between consecutive frames.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

### Property 8: Tab Independence
*For any* media tab, changing playback position, speed, or appearance settings in one tab SHALL NOT affect other tabs' settings or state.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 9: Joint Angle Accuracy
*For any* frame with angle mode enabled, the displayed angle between two connected joints SHALL match the calculated angle from the 3D keypoint positions within ±0.5 degrees.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 10: Zoom Invariant
*For any* zoom level adjustment using +/- hotkeys or mouse wheel, the model's center position SHALL remain at the screen center and SHALL NOT pan or translate.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

### Property 11: Timeline Scrubbing Accuracy
*For any* mouse wheel scroll action, the frame advancement SHALL be proportional to scroll distance, and the video and mesh SHALL update to the new frame without lag.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**

### Property 12: Unified Data Structure Synchronization
*For any* SyncedFrame in the MeshSequence, the frame's timestamp SHALL match the video frame timestamp at that index, and mesh keypoints SHALL correspond to that exact video frame.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**

### Property 13: 2D Overlay Synchronization
*For any* overlay mode with video and mesh, advancing the playback SHALL update both the video display and mesh overlay to the same frame index simultaneously.

**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

## Error Handling

### Video Loading Errors
- Display toast notification with error message
- Provide retry button
- Log error details for debugging

### Mesh Data Errors
- Handle missing keypoints gracefully
- Skip frames with invalid data
- Display warning in UI

### Synchronization Errors
- Detect frame misalignment
- Resync to nearest valid frame
- Log discrepancies

### Rendering Errors
- Fallback to wireframe if material fails
- Reduce mesh complexity if performance degrades
- Display performance warning

## Testing Strategy

### Unit Testing
- Test frame synchronization calculations
- Test camera preset transformations
- Test angle calculations
- Test tracking line generation
- Test playback speed calculations

### Property-Based Testing
- **Property 1**: Generate random frame indices and verify timestamp alignment
- **Property 2**: Generate random playback speeds and verify timing accuracy
- **Property 3**: Generate random camera rotations and verify model stays centered
- **Property 4**: Generate random models and verify orientation correctness
- **Property 5**: Generate random camera movements and verify grid stability
- **Property 6**: Generate random mesh customizations and verify independence
- **Property 7**: Generate random frame sequences and verify tracking line continuity
- **Property 8**: Generate random tab operations and verify independence
- **Property 9**: Generate random joint configurations and verify angle accuracy
- **Property 10**: Generate random zoom levels and verify centering
- **Property 11**: Generate random scroll inputs and verify frame accuracy
- **Property 12**: Generate random SyncedFrames and verify data structure consistency
- **Property 13**: Generate random overlay operations and verify synchronization

### Integration Testing
- Test full playback workflow (load → play → seek → pause)
- Test mode switching (side-by-side → overlay → comparison)
- Test multi-mesh scenarios
- Test camera control interactions
- Test tracking line visualization

### Performance Testing
- Measure frame rendering time
- Monitor memory usage with large mesh sequences
- Test playback smoothness at various speeds
- Benchmark camera rotation performance
