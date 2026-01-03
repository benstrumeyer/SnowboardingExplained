# UI Controls Revamp Design

## Overview

A flexible grid-based viewer system where each cell independently displays either a video or 3D mesh scene. Each cell has its own windowed controls, independent playback, and optional synchronization with shared group controls. A frame scrubber at the bottom of each cell enables coaches to quickly adjust start positions for side-by-side comparison.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App Container                         │
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
```

## Components and Interfaces

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
  playbackState: PlaybackState;
  isSynced: boolean;
  windowedControlsPosition: { x: number; y: number };
  isWindowedControlsCollapsed: boolean;
}

interface PlaybackState {
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number;
  totalFrames: number;
  videoMode?: 'original' | 'overlay';
}
```

### GridCell Component
Individual cell that displays content and manages its own state.

```typescript
interface GridCellProps {
  cellId: string;
  cellState: CellState;
  sharedControls: SharedControlState;
  onStateChange: (newState: CellState) => void;
  onSharedControlsChange: (controls: SharedControlState) => void;
}
```

### WindowedControls Component
Draggable control panel for each cell.

```typescript
interface WindowedControlsProps {
  cellId: string;
  cellState: CellState;
  position: { x: number; y: number };
  isCollapsed: boolean;
  onPositionChange: (pos: { x: number; y: number }) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onLoadVideo: () => void;
  onLoadModel: () => void;
  onSyncToggle: (synced: boolean) => void;
}
```

### FrameScrubber Component
Scrubber bar at the bottom of each cell for frame navigation.

```typescript
interface FrameScrubberProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onFrameChange: (frame: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}
```

### MeshNametag Component
3D text label displayed above mesh models, visible from all camera angles.

```typescript
interface MeshNametagProps {
  text: string;
  position: THREE.Vector3;
  camera: THREE.Camera;
  scene: THREE.Scene;
}
```

### NametagControls Component
Input field in windowed controls for managing mesh nametag text.

```typescript
interface NametagControlsProps {
  nametag: string;
  onNametagChange: (text: string) => void;
  isVisible: boolean;
}
```

### SharedControls Component
Global controls in sidebar for synced cells.

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

