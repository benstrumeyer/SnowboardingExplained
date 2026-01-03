# UI Controls Revamp Design

## Overview

A flexible grid-based viewer system where each cell independently displays either a video or 3D mesh scene. Each cell has its own windowed controls, independent playback, and optional synchronization with shared group controls. A frame scrubber at the bottom of each cell enables coaches to quickly adjust start positions for side-by-side comparison.

## Architecture

### High-Performance Deterministic Playback Model

This architecture separates concerns into three layers:

1. **PlaybackEngine** (Non-React) - Master clock, owns all timing
2. **Zustand Store** (Thin Bridge) - UI state only, read-only from React
3. **React Components** (UI Layer) - Render UI, never drive timing

```
┌─────────────────────────────────────────────────────────────┐
│              PlaybackEngine (Master Clock)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ playbackTime (authoritative)                            ││
│  │ isPlaying, playbackSpeed                                ││
│  │ Master RAF loop (one global loop)                       ││
│  │ Drift correction, seek logic                            ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Zustand Store (UI Bridge)                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ playbackTime (read-only from React)                     ││
│  │ isPlaying, playbackSpeed (UI state)                     ││
│  │ gridRows, gridColumns, UI positions                     ││
│  │ NO per-frame data, NO mesh data, NO vertex updates      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    React UI Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │     Sidebar      │  │      Grid Layout Container       │ │
│  ├──────────────────┤  ├──────────────────────────────────┤ │
│  │ Upload Videos    │  │  ┌──────────────┐ ┌──────────────┐│ │
│  │ Grid Config      │  │  │   Cell 1     │ │   Cell 2     ││ │
│  │ Shared Controls  │  │  │ ┌──────────┐ │ │ ┌──────────┐ ││ │
│  │ Models List      │  │  │ │Windowed  │ │ │ │Windowed  │ ││ │
│  └──────────────────┘  │  │ │Controls  │ │ │ │Controls  │ ││ │
│                        │  │ └──────────┘ │ │ └──────────┘ ││ │
│                        │  │              │ │              ││ │
│                        │  │  Content     │ │  Content     ││ │
│                        │  │  (Video or   │ │  (Video or   ││ │
│                        │  │   3D Scene)  │ │   3D Scene)  ││ │
│                        │  │              │ │              ││ │
│                        │  │ ┌──────────┐ │ │ ┌──────────┐ ││ │
│                        │  │ │ Scrubber │ │ │ │ Scrubber │ ││ │
│                        │  │ └──────────┘ │ │ └──────────┘ ││ │
│                        │  └──────────────┘ └──────────────┘│ │
│                        │  ┌──────────────┐ ┌──────────────┐│ │
│                        │  │   Cell 3     │ │   Cell 4     ││ │
│                        │  │   (empty)    │ │   (empty)    ││ │
│                        │  └──────────────┘ └──────────────┘│ │
│                        └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         Per-Scene RAF Samplers (Non-React)                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ VideoCell RAF:                                          ││
│  │   Read playbackTime from PlaybackEngine                 ││
│  │   Compute: localTime = clamp(playbackTime - offset)    ││
│  │   Set video.currentTime = localTime                    ││
│  │                                                         ││
│  │ MeshCell RAF:                                           ││
│  │   Read playbackTime from PlaybackEngine                 ││
│  │   Compute: localTime = clamp(playbackTime - offset)    ││
│  │   Sample mesh frame data for localTime                 ││
│  │   Upload to GPU via uniforms                           ││
│  │   Render Three.js scene                                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### PlaybackEngine (Master Clock)

Owns all timing logic, lives outside React:

```typescript
class PlaybackEngine {
  private playbackTime: number;
  private isPlaying: boolean;
  private playbackSpeed: number;
  private rafId: number | null;
  private listeners: Set<PlaybackListener>;
  private scenes: Map<string, SceneConfig>;

  play(): void
  pause(): void
  seek(time: number): void
  setSpeed(speed: number): void
  getPlaybackTime(): number
  getSceneLocalTime(sceneId: string): number
  subscribe(listener: PlaybackListener): () => void
}
```

**Responsibilities:**
- Owns master RAF loop (one global loop for all scenes)
- Maintains authoritative `playbackTime`
- Handles play/pause/seek/speed
- Notifies listeners of time changes
- Computes per-scene local time using sliding window

### Sliding Window Model

Each scene has independent timing with synchronized playback:

```typescript
interface SceneConfig {
  sceneId: string;
  offset: number;           // When this scene starts relative to master time
  windowStart: number;      // First frame index in this scene
  windowDuration: number;   // Total duration of this scene
}

// Per-scene computation:
localTime = clamp(
  playbackTime - sceneOffset,
  windowStart,
  windowStart + windowDuration
)
```

This enables:
- Independent scene start times
- Synchronized playback across all scenes
- Fast scrubbing without recomputation
- Deterministic frame selection

### Zustand Store (Thin Bridge)

Store only UI state, never per-frame data:

```typescript
interface GridStore {
  // Playback state (read-only from React)
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;

  // UI state
  gridRows: number;
  gridColumns: number;
  cells: CellUIState[];
  windowPositions: Map<string, { x: number; y: number }>;
  collapsedStates: Map<string, boolean>;

  // Actions (dispatch to PlaybackEngine)
  play(): void;
  pause(): void;
  seek(time: number): void;
  setSpeed(speed: number): void;
}
```

**What NOT to store:**
- Per-frame values
- Mesh data
- Vertex updates
- Frame indices
- Animation state

### Per-Scene RAF Samplers

Each scene runs its own RAF as a sampler loop (NOT a clock):

**VideoCell Sampler:**
```typescript
function videoSampler(cellId: string, videoRef: HTMLVideoElement) {
  const loop = () => {
    const playbackTime = playbackEngine.getPlaybackTime();
    const localTime = playbackEngine.getSceneLocalTime(cellId);
    
    videoRef.currentTime = localTime / 1000; // Convert ms to seconds
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
```

**MeshCell Sampler:**
```typescript
function meshSampler(cellId: string, scene: THREE.Scene) {
  const loop = () => {
    const playbackTime = playbackEngine.getPlaybackTime();
    const localTime = playbackEngine.getSceneLocalTime(cellId);
    
    const frameIndex = Math.floor(localTime / frameInterval);
    const meshData = preloadedMeshData[frameIndex];
    
    // Update GPU via uniforms (not React props)
    updateMeshUniforms(scene, meshData);
    
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
```

**Key Rules:**
- Never accumulate delta time
- Never write to playbackTime
- Only read from PlaybackEngine
- Render immediately after sampling

## Components and Interfaces

### PlaybackEngine

Master clock that owns all timing logic.

```typescript
interface PlaybackState {
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

interface SceneConfig {
  sceneId: string;
  offset: number;
  windowStart: number;
  windowDuration: number;
}

class PlaybackEngine {
  play(): void;
  pause(): void;
  seek(time: number): void;
  setSpeed(speed: number): void;
  getPlaybackTime(): number;
  getState(): PlaybackState;
  getSceneLocalTime(sceneId: string): number;
  registerScene(config: SceneConfig): void;
  unregisterScene(sceneId: string): void;
  subscribe(listener: PlaybackListener): () => void;
}
```

### GridLayout Component
Manages the grid configuration and cell rendering.

```typescript
interface GridLayoutProps {
  rows: number;
  columns: number;
  cells: CellState[];
  onCellUpdate: (cellId: string, state: CellState) => void;
  onGridResize: (rows: number, columns: number) => void;
  sharedControls: SharedControlState;
}

interface CellState {
  id: string;
  contentType: 'empty' | 'video' | 'mesh';
  videoId?: string;
  modelId?: string;
  isSynced: boolean;
  windowedControlsPosition: { x: number; y: number };
  isWindowedControlsCollapsed: boolean;
  nametag?: string;
}
```

### GridCell Component
Individual cell that displays content. Does NOT manage timing—only renders UI and delegates to PlaybackEngine.

```typescript
interface GridCellProps {
  cellId: string;
}

// Cell responsibilities:
// - Render UI (windowed controls, scrubber, content area)
// - Register with PlaybackEngine on mount
// - Unregister on unmount
// - Delegate timing to PlaybackEngine
// - Never drive playback from React state
```

### VideoCell Sampler
Non-React RAF loop that samples video playback.

```typescript
function useVideoSampler(
  cellId: string,
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const unsubscribe = playbackEngine.subscribe(() => {
      const localTime = playbackEngine.getSceneLocalTime(cellId);
      videoRef.current!.currentTime = localTime / 1000;
    });

    return unsubscribe;
  }, [cellId, enabled]);
}
```

### MeshCell Sampler
Non-React RAF loop that samples mesh data and updates GPU.

```typescript
function useMeshSampler(
  cellId: string,
  sceneRef: React.RefObject<THREE.Scene>,
  meshDataRef: React.RefObject<MeshFrameData[]>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !sceneRef.current || !meshDataRef.current) return;

    const unsubscribe = playbackEngine.subscribe(() => {
      const localTime = playbackEngine.getSceneLocalTime(cellId);
      const frameIndex = Math.floor(localTime / frameInterval);
      const meshData = meshDataRef.current![frameIndex];

      updateMeshUniforms(sceneRef.current!, meshData);
    });

    return unsubscribe;
  }, [cellId, enabled]);
}
```

### WindowedControls Component
Draggable control panel for each cell. Dispatches to PlaybackEngine, never manages timing.

```typescript
interface WindowedControlsProps {
  cellId: string;
  onLoadVideo: () => void;
  onLoadModel: () => void;
  isVideoCell: boolean;
}
```

### FrameScrubber Component
Scrubber bar at the bottom of each cell. Dispatches seek to PlaybackEngine.

```typescript
interface FrameScrubberProps {
  cellId: string;
  totalFrames: number;
  onSeek: (frame: number) => void;
}

// Scrubbing strategy:
// 1. On drag start: pause playback
// 2. On drag: seek to frame (PlaybackEngine.seek)
// 3. On drag end: resume playback
```

### MeshNametag Component
3D text label displayed above mesh models, visible from all camera angles.

```typescript
interface MeshNametagProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  text: string;
  position?: [number, number, number];
  fontSize?: number;
  color?: string;
}
```

### NametagControls Component
Input field in windowed controls for managing mesh nametag text.

```typescript
interface NametagControlsProps {
  onNametagChange: (text: string) => void;
  onColorChange?: (color: string) => void;
}
```

### SharedControls Component
Global controls in sidebar for synced cells. Dispatches to PlaybackEngine.

```typescript
interface SharedControlState {
  currentFrame: number;
  playbackSpeed: number;
  cameraPreset: 'top' | 'front' | 'back' | 'left' | 'right';
  isPlaying: boolean;
}

interface SharedControlsProps {
  state: SharedControlState;
  onStateChange: (newState: SharedControlState) => void;
}
```

### GridConfigControls Component
Sidebar controls for grid configuration.

```typescript
interface GridConfigControlsProps {
  rows: number;
  columns: number;
  onGridChange: (rows: number, columns: number) => void;
}
```

## Data Models

### Cell Content Types

**Video Cell:**
- Original video file
- Mesh overlay video file
- Current playback frame
- Video metadata (fps, duration, resolution)
- Toggle state (original/overlay)

**Mesh Cell:**
- 3D mesh data (vertices, faces)
- Camera parameters
- Current frame index
- Animation state

### Synchronization Model

When a cell is synced:
- Cell's `currentFrame` is controlled by `SharedControlState.currentFrame`
- Cell's `playbackSpeed` is controlled by `SharedControlState.playbackSpeed`
- Cell's `cameraPreset` is controlled by `SharedControlState.cameraPreset`
- Cell's `isPlaying` is controlled by `SharedControlState.isPlaying`

When a cell is not synced:
- Cell maintains independent playback state
- Scrubber adjustments only affect that cell
- Shared controls do not affect the cell

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Position Consistency

**For any** cell with video or mesh content, when the scrubber is adjusted to frame N, the cell's playback SHALL immediately display frame N without delay or desynchronization.

**Validates: Requirements 13.2, 13.3, 13.7**

### Property 2: Sync State Isolation

**For any** non-synced cell, adjusting its scrubber or playback controls SHALL NOT affect any other cell's playback state or frame position.

**Validates: Requirements 6.5, 13.11**

### Property 3: Synced Cell Coherence

**For any** synced cell, when the shared group controls change, the cell's playback state SHALL immediately update to match the shared state within one frame render cycle.

**Validates: Requirements 6.3, 6.4, 6.6**

### Property 4: Overlay Video Synchronization

**For any** video cell displaying mesh overlay video, the overlay video frame position SHALL always match the 3D mesh scene frame position at all times (playing, paused, or scrubbing).

**Validates: Requirements 5.7, 5.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8**

### Property 5: Scrubber Accuracy

**For any** cell with a scrubber, clicking or dragging the scrubber to position P SHALL result in the cell displaying frame at position P (within ±1 frame tolerance due to rounding).

**Validates: Requirements 13.2, 13.3, 13.7**

### Property 6: Grid Resize Preservation

**For any** grid resize operation, cells that remain in the grid after resizing SHALL maintain their content, playback state, and windowed controls position.

**Validates: Requirement 1.3**

### Property 7: Video Mode Preservation

**For any** video cell, toggling between original and overlay modes SHALL preserve the current frame position and playback state (playing/paused).

**Validates: Requirements 5.4, 5.5, 5.6**

### Property 8: Windowed Controls Draggability

**For any** windowed controls panel, dragging it to position (X, Y) SHALL result in the panel being repositioned to (X, Y) and remaining at that position until dragged again.

**Validates: Requirement 3.2**

### Property 9: Mesh Nametag Visibility

**For any** Three.js mesh scene with a nametag, the nametag text SHALL remain visible and readable from all camera angles (top, front, back, left, right) without being obscured by the mesh.

**Validates: Requirements 16.3, 16.4, 16.7, 16.8**

## Error Handling

- **Invalid Frame Position**: If scrubber is adjusted to a frame beyond total frames, clamp to `totalFrames - 1`
- **Missing Video File**: Display error message and disable video cell
- **Missing Mesh Data**: Display error message and disable mesh cell
- **Sync State Conflict**: If shared controls change while cell is being manually adjusted, prioritize manual adjustment until user releases control
- **Grid Resize with Content**: Preserve cell content when grid is resized; only clear content when cells are removed

