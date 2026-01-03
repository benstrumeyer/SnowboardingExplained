# UI Controls Revamp Implementation Tasks

## Architecture Overview

High-performance deterministic playback with three layers:
1. **PlaybackEngine** - Master clock, owns all timing (non-React)
2. **Zustand Store** - Thin UI bridge, read-only from React
3. **React Components** - UI layer only, never drive timing
4. **Per-Scene RAF Samplers** - Independent samplers for video/mesh (non-React)

## Phase 1: PlaybackEngine Core

### Task 1.1: Create PlaybackEngine Class
- Create `backend/web/src/engine/PlaybackEngine.ts`
- Implement master RAF loop (one global loop)
- Implement play/pause/seek/setSpeed methods
- Implement listener subscription system
- Implement scene registration and local time computation
- Export singleton `globalPlaybackEngine`

### Task 1.2: Create SceneConfig Interface
- Define `SceneConfig` with sceneId, offset, windowStart, windowDuration
- Implement sliding window time computation
- Add scene registration/unregistration methods
- Ensure deterministic frame selection

### Task 1.3: Implement Drift Correction
- Add drift detection between video and mesh
- Implement threshold-based correction (±50ms)
- Apply correction only when drift exceeds threshold
- Preserve smooth playback during correction

## Phase 2: Zustand Store Refactor

### Task 2.1: Refactor GridStore to Thin Bridge
- Remove per-frame state (currentFrame, playbackState)
- Keep only: playbackTime, isPlaying, playbackSpeed
- Keep UI state: gridRows, gridColumns, windowPositions, collapsedStates
- Add actions that dispatch to PlaybackEngine (play, pause, seek, setSpeed)
- Ensure store is read-only from React perspective

### Task 2.2: Remove Playback Logic from Store
- Remove setCellFrame, setCellPlaying, setCellSpeed actions
- Remove updateCellPlayback method
- Remove sync logic from store (move to PlaybackEngine)
- Keep only UI state management

## Phase 3: Video Cell Sampler

### Task 3.1: Create useVideoSampler Hook
- Create `backend/web/src/hooks/useVideoSampler.ts`
- Subscribe to PlaybackEngine
- Compute local time using getSceneLocalTime
- Set video.currentTime directly via DOM ref
- Implement drift correction for video
- Clean up subscription on unmount

### Task 3.2: Update VideoToggleDisplay Component
- Accept videoRef as prop
- Remove React state for frame management
- Use useVideoSampler hook
- Render current frame from video element
- Handle original/overlay toggle without affecting playback

### Task 3.3: Integrate Video Sampler into GridCell
- Pass videoRef to VideoToggleDisplay
- Register scene with PlaybackEngine on mount
- Unregister scene on unmount
- Ensure sampler runs independently of React renders

## Phase 4: Mesh Cell Sampler

### Task 4.1: Create useMeshSampler Hook
- Create `backend/web/src/hooks/useMeshSampler.ts`
- Subscribe to PlaybackEngine
- Compute local time using getSceneLocalTime
- Sample mesh frame data for current time
- Update GPU via uniforms (not React props)
- Clean up subscription on unmount

### Task 4.2: Preload Mesh Data
- Create `backend/web/src/services/MeshDataLoader.ts`
- Load mesh frames as typed arrays on component mount
- Store as frame-indexed arrays (no allocations during RAF)
- Support optional interpolation between frames
- Cache loaded data for reuse

### Task 4.3: Update MeshViewer Component
- Accept meshDataRef as prop
- Remove React state for frame management
- Use useMeshSampler hook
- Update Three.js uniforms with sampled data
- Render mesh without per-frame prop updates

### Task 4.4: Integrate Mesh Sampler into GridCell
- Pass meshDataRef to MeshViewer
- Register scene with PlaybackEngine on mount
- Unregister scene on unmount
- Ensure sampler runs independently of React renders

## Phase 5: FrameScrubber Refactor

### Task 5.1: Update FrameScrubber Component
- Accept cellId instead of currentFrame prop
- Implement scrubbing strategy:
  - On drag start: pause playback
  - On drag: seek to frame via PlaybackEngine
  - On drag end: resume playback
- Display current time from PlaybackEngine (read-only)
- Never manage frame state locally

### Task 5.2: Implement Scrubbing Logic
- Create `backend/web/src/services/ScrubManager.ts`
- Handle pause on scrub start
- Handle seek on scrub move
- Handle resume on scrub end
- Ensure single frame render during scrub

## Phase 6: WindowedControls Refactor

### Task 6.1: Update WindowedControls Component
- Remove playback state management
- Keep only UI state (position, collapsed)
- Dispatch play/pause to PlaybackEngine
- Dispatch speed changes to PlaybackEngine
- Keep sync toggle in Zustand (UI state)

### Task 6.2: Integrate PlaybackEngine Dispatch
- Add play button that calls playbackEngine.play()
- Add pause button that calls playbackEngine.pause()
- Add speed slider that calls playbackEngine.setSpeed()
- Ensure UI reflects PlaybackEngine state via Zustand subscription

## Phase 7: GridCell Refactor

### Task 7.1: Simplify GridCell Component
- Remove playback state management
- Keep only UI rendering
- Register/unregister scene with PlaybackEngine
- Use useVideoSampler for video cells
- Use useMeshSampler for mesh cells
- Render FrameScrubber with cellId

### Task 7.2: Remove Prop Drilling
- Remove onStateChange, onSharedControlsChange props
- Remove cellState playback properties
- Keep only UI state props (position, collapsed)
- Dispatch all actions to PlaybackEngine

## Phase 8: SharedControls Refactor

### Task 8.1: Update SharedControls Component
- Dispatch play/pause to PlaybackEngine
- Dispatch speed changes to PlaybackEngine
- Dispatch camera preset to Zustand (UI state)
- Read playbackTime from PlaybackEngine (read-only)

### Task 8.2: Implement Sync Logic
- When sync is ON: all synced cells follow PlaybackEngine
- When sync is OFF: cells use independent offsets
- Implement via SceneConfig offset parameter
- No special sync logic needed (sliding window handles it)

## Phase 9: Integration and Testing

### Task 9.1: Update App.tsx
- Initialize PlaybackEngine singleton
- Render GridLayout with PlaybackEngine context
- Ensure PlaybackEngine persists across re-renders
- Handle cleanup on unmount

### Task 9.2: Test Multi-Scene Synchronization
- Load 2+ videos in grid
- Verify all play/pause together
- Verify scrubbing affects all synced cells
- Verify independent cells maintain offset

### Task 9.3: Test Mesh + Video Sync
- Load video in one cell, mesh in another
- Verify frame positions stay in sync
- Test scrubbing both together
- Test overlay video sync with mesh

### Task 9.4: Performance Testing
- Verify 60fps playback with 4 cells
- Verify no frame drops during scrubbing
- Verify drift correction is smooth
- Profile RAF loop overhead

## Implementation Order

1. **Phase 1** - PlaybackEngine core (foundation)
2. **Phase 2** - Zustand refactor (thin bridge)
3. **Phase 3** - Video sampler (video playback)
4. **Phase 4** - Mesh sampler (3D playback)
5. **Phase 5** - FrameScrubber refactor (scrubbing)
6. **Phase 6** - WindowedControls refactor (UI dispatch)
7. **Phase 7** - GridCell refactor (simplify)
8. **Phase 8** - SharedControls refactor (sync)
9. **Phase 9** - Integration and testing (validation)

## Key Principles

- **React is UI-only**: Never drive timing from React state
- **PlaybackEngine owns time**: One master clock, all scenes read from it
- **Per-scene samplers**: Each scene has independent RAF, reads from PlaybackEngine
- **Zustand is thin**: Only UI state, read-only from React
- **Deterministic**: Time is an index, not accumulated delta
- **No per-frame allocations**: All data preloaded, GPU updates via uniforms
- **Drift correction**: Threshold-based, smooth, transparent to user

