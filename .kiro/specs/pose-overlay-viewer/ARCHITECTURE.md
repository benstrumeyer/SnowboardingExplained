# Pose Overlay Viewer - Architecture

## Overview

This document describes the complete architecture of the Pose Overlay Viewer web application after incorporating user feedback about individual mesh controls and frame offset adjustment.

---

## Component Hierarchy

```
App
└── PoseOverlayViewer (main component)
    ├── ThreeJsScene (Three.js setup)
    │   ├── MeshRenderer (rider mesh)
    │   │   ├── Load mesh data
    │   │   ├── Create geometry
    │   │   ├── Apply material (blue)
    │   │   └── Update pose each frame
    │   ├── MeshRenderer (reference mesh)
    │   │   ├── Load mesh data
    │   │   ├── Create geometry
    │   │   ├── Apply material (orange, semi-transparent)
    │   │   └── Update pose each frame
    │   └── Camera controller
    │       ├── Handle mouse input
    │       ├── Update camera position/rotation
    │       └── Render scene
    ├── PlaybackControls (global controls)
    │   ├── Play/pause button
    │   ├── Timeline scrubber
    │   ├── Speed control (0.5x, 1x, 2x)
    │   ├── Frame counter
    │   └── Duration display
    ├── MeshControls (rider)
    │   ├── Show/hide toggle
    │   ├── Frame offset slider (±N frames)
    │   └── Frame counter
    ├── MeshControls (reference)
    │   ├── Show/hide toggle
    │   ├── Frame offset slider (±N frames)
    │   └── Frame counter
    ├── VisibilityToggle
    │   ├── Mode selector (side-by-side/overlay)
    │   └── Opacity slider (overlay mode)
    └── CameraControls
        ├── Rotate button
        ├── Zoom button
        ├── Pan button
        └── Reset button
```

---

## State Management

### PoseOverlayViewerState

```typescript
interface PoseOverlayViewerState {
  // Mesh data
  riderMesh: MeshSequence | null;
  referenceMesh: MeshSequence | null;
  
  // Global playback
  isPlaying: boolean;
  currentFrame: number; // Absolute frame number
  playbackSpeed: number; // 0.5, 1, 2
  
  // Per-mesh offsets
  riderFrameOffset: number; // ±N frames
  referenceFrameOffset: number; // ±N frames
  
  // Visibility
  showRider: boolean;
  showReference: boolean;
  
  // View mode
  mode: 'side-by-side' | 'overlay';
  inPlaceMode: boolean;
  referenceOpacity: number; // [0, 1]
  
  // UI state
  loading: boolean;
  error: string | null;
}
```

---

## Component Specifications

### PlaybackControls

**Responsibilities**:
- Global play/pause button
- Global timeline scrubber
- Speed control (0.5x, 1x, 2x)
- Frame counter display

**Props**:
```typescript
interface PlaybackControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  onPlayPause: () => void;
  onScrub: (frame: number) => void;
  onSpeedChange: (speed: number) => void;
}
```

### MeshControls

**Responsibilities**:
- Per-mesh visibility toggle
- Per-mesh frame offset slider
- Per-mesh frame counter

**Props**:
```typescript
interface MeshControlsProps {
  meshName: 'rider' | 'reference';
  isVisible: boolean;
  frameOffset: number;
  currentFrame: number;
  color: 'blue' | 'orange';
  onVisibilityChange: (visible: boolean) => void;
  onFrameOffsetChange: (offset: number) => void;
}
```

### ThreeJsScene

**Responsibilities**:
- Initialize Three.js scene, camera, renderer
- Create mesh geometries from data
- Update mesh poses each frame based on frame offsets
- Handle camera controls
- Render loop

**Key Methods**:
```typescript
function initScene(container: HTMLElement): void
function loadMesh(meshData: MeshSequence, color: number): THREE.Mesh
function updateMeshPose(mesh: THREE.Mesh, frame: MeshFrame): void
function getDisplayFrames(state: PoseOverlayViewerState): {riderFrame, referenceFrame}
function render(): void
```

---

## Playback Logic

### Frame Calculation

```typescript
function getDisplayFrames(state: PoseOverlayViewerState) {
  const riderFrame = state.currentFrame + state.riderFrameOffset;
  const referenceFrame = state.currentFrame + state.referenceFrameOffset;
  
  return {
    riderFrame: clamp(riderFrame, 0, state.riderMesh.frames.length - 1),
    referenceFrame: clamp(referenceFrame, 0, state.referenceMesh.frames.length - 1),
  };
}
```

### Playback Loop

```typescript
function playbackLoop(state: PoseOverlayViewerState, deltaTime: number) {
  if (!state.isPlaying) return;
  
  const frameAdvance = (state.playbackSpeed * deltaTime) / (1000 / state.fps);
  const newFrame = state.currentFrame + frameAdvance;
  
  const maxFrames = Math.max(
    state.riderMesh.frames.length - state.riderFrameOffset,
    state.referenceMesh.frames.length - state.referenceFrameOffset
  );
  
  if (newFrame >= maxFrames) {
    state.isPlaying = false;
    state.currentFrame = maxFrames - 1;
  } else {
    state.currentFrame = newFrame;
  }
  
  const { riderFrame, referenceFrame } = getDisplayFrames(state);
  updateMeshPose(riderMesh, state.riderMesh.frames[riderFrame]);
  updateMeshPose(referenceMesh, state.referenceMesh.frames[referenceFrame]);
}
```

---

## Services

### meshDataService
- Fetch mesh data from backend API
- Cache mesh data locally
- Handle network errors

### coordinateNormalization
- Normalize coordinate spaces using PCA
- Center meshes at origin
- Align principal axes

### cameraController
- Handle mouse/touch input
- Update camera position/rotation
- Provide reset functionality

---

## Hooks

### useSynchronizedPlayback

**Responsibilities**:
- Manage playback state (playing, currentFrame, speed)
- Manage per-mesh frame offsets
- Sync both meshes to same playback speed
- Handle play/pause/scrub
- Update meshes each frame

**Methods**:
```typescript
function play(): void
function pause(): void
function scrub(frame: number): void
function setSpeed(speed: number): void
function setFrameOffset(meshName: 'rider' | 'reference', offset: number): void
```

### useThreeJsScene
- Initialize Three.js scene, camera, renderer
- Create mesh geometries
- Update mesh poses each frame
- Handle window resize

### useMeshData
- Fetch mesh data from API
- Handle loading/error states
- Cache data locally

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREE.JS CANVAS                              │
│  [Rider Mesh]          [Reference Mesh]                         │
│  (Blue)                (Orange, semi-transparent)               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GLOBAL PLAYBACK CONTROLS                                        │
│ [Play] [Pause] [Scrub ─────●─────] [Speed: 1x]                │
│ Frame: 50/120                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ RIDER MESH CONTROLS                                             │
│ ☑ Show  [Offset: 0 ◄─────●─────► +5]  [Frame: 50]             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ REFERENCE MESH CONTROLS                                         │
│ ☑ Show  [Offset: -5 ◄─────●─────► +5]  [Frame: 45]            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ VIEW CONTROLS                                                   │
│ [Side-by-side] [Overlay] [Opacity: 50%]                        │
│ [↻ Rotate] [+ Zoom] [↔ Pan] [⟲ Reset]                         │
└─────────────────────────────────────────────────────────────────┘
```

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
│   │   ├── MeshControls.tsx
│   │   ├── VisibilityToggle.tsx
│   │   └── CameraControls.tsx
│   ├── services/
│   │   ├── meshDataService.ts
│   │   ├── coordinateNormalization.ts
│   │   └── cameraController.ts
│   ├── hooks/
│   │   ├── useSynchronizedPlayback.ts
│   │   ├── useThreeJsScene.ts
│   │   └── useMeshData.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── index.tsx
├── tests/
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Summary

The architecture provides a clean separation of concerns with:
- Global playback controls for synchronized playback
- Per-mesh controls for individual frame offset adjustment
- Three.js scene management for 3D rendering
- Reusable services for data fetching and coordinate normalization
- Custom hooks for state management and scene setup

