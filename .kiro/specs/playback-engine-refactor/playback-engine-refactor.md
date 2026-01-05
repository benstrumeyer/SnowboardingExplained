# Spec: PlaybackEngine Event-Based Architecture Refactor

**Status:** In Progress  
**Priority:** Critical  
**Owner:** Playback System  

## Overview

Refactor the playback system to use an event-based architecture where the PlaybackEngine is the single source of truth for all timing and playback state. This eliminates React scheduling jitter and ensures frame-accurate, deterministic sync across all scenes and videos.

**Critical:** The PlaybackEngine must be the authoritative timing source while leveraging the native `<video>` element for smooth playback. Mesh frame sync uses frame indexing (fast) while video uses RAF-based time seeking (smooth).

**Scope:** Frontend-only refactor. NO backend changes. All modifications are in `backend/web/src/`. No unit tests or documentation required. Focus: Perfect synchronization and shared controls that control everything.

## Core Principle

**Any value that affects time advancement or frame execution is owned by the PlaybackEngine.**

- `playbackTime` - Engine state
- `isPlaying` - Engine state
- `playbackSpeed` - Engine state
- Scrubbing state - Engine state

React and Zustand are observers and controllers only, never timing authorities.

## PlaybackEngine Responsibilities

### Owns
- `playbackTime` - Current playback position in milliseconds
- `isPlaying` - Whether playback is active
- `playbackSpeed` - Playback speed multiplier (can be negative for reverse)
- `isReversing` - Whether playback direction is reversed
- `isLooping` - Whether playback loops at end (default: true)
- Scrubbing state - Seeking/scrubbing operations
- Frame index mapping - Maps time to frame indices for mesh

### Advances Time
- Only when `isPlaying === true`
- Runs at RAF cadence (60fps)
- Deterministic frame advancement
- Supports forward and reverse playback
- Handles speed multipliers (including negative for reverse)

### Exposes State
- Direct property reads: `engine.playbackTime`, `engine.isPlaying`, `engine.playbackSpeed`, `engine.isReversing`, `engine.isLooping`
- Frame index calculation: `engine.getFrameIndex(time)` - Fast O(1) lookup for mesh
- Event-based notifications for state changes
- No per-frame state updates

## Event-Based API

### Events Emitted

Events are coarse-grained and only emitted on state changes, NOT every RAF tick:

```typescript
type PlaybackEvent =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'timeSet'; time: number }
  | { type: 'speedChanged'; speed: number }
  | { type: 'reverseToggled'; isReversing: boolean }
  | { type: 'loopToggled'; isLooping: boolean }
  | { type: 'windowChange'; sceneId: string };
```

### Engine Methods

```typescript
engine.play()
  // Sets isPlaying = true
  // Emits { type: 'play' }

engine.pause()
  // Sets isPlaying = false
  // Emits { type: 'pause' }

engine.seek(time: number)
  // Sets playbackTime = time
  // Emits { type: 'timeSet'; time }

engine.setSpeed(speed: number)
  // Sets playbackSpeed = speed (can be negative for reverse)
  // Emits { type: 'speedChanged'; speed }

engine.toggleReverse()
  // Toggles isReversing state
  // Adjusts playbackSpeed sign accordingly
  // Emits { type: 'reverseToggled'; isReversing }

engine.toggleLoop()
  // Toggles isLooping state
  // Default is true (looping enabled on first play)
  // Emits { type: 'loopToggled'; isLooping }

engine.reverseVideo()
  // Individual reverse for video only
  // Uses time seeking via RAF calculations

engine.reverseMesh()
  // Individual reverse for mesh only
  // Uses frame index lookup (fast)

engine.getFrameIndex(time: number): number
  // Fast O(1) lookup: returns frame index for given time
  // Formula: Math.floor(timeMs / frameIntervalMs) % totalFrames
  // Centralizes frame math, guarantees mesh + trails + annotations align
  // Used by mesh sampler for frame-accurate indexing

engine.addEventListener(listener: PlaybackEventListener): () => void
  // Subscribe to events
  // Returns unsubscribe function
```

## Consumer Patterns

### Scenes and Videos (Frame-Driven)

```typescript
// In engine RAF loop:
const updateFrame = () => {
  if (isPlaying) {
    playbackTime += deltaTime * playbackSpeed;
  }
  
  // Sync video with drift tolerance (stays in sync with RAF)
  if (videoRef.current && isPlaying) {
    const targetTime = playbackTime / 1000;
    const currentTime = videoRef.current.currentTime;
    const drift = Math.abs(currentTime - targetTime);
    
    // Only seek if drift exceeds 1 frame (16.67ms at 60fps)
    if (drift > 0.0167) {
      videoRef.current.currentTime = targetTime;
    }
  }
  
  // Mesh uses frame indexing (instant, deterministic)
  const frameIndex = engine.getFrameIndex(playbackTime);
  updateMesh(frameIndex);
  
  rafId = requestAnimationFrame(updateFrame);
};
```

**Key Rules:**
- Engine RAF loop is the single timing authority
- Video syncs with drift tolerance (stays within 1 frame)
- Mesh uses frame indexing (always perfectly synced)
- Read `engine.playbackTime` directly each RAF frame
- Never infer play state from other sources
- Never write to engine state directly

### React UI (Event-Driven)

```typescript
// Subscribe to events for UI updates
const unsubscribe = engine.addEventListener((event) => {
  if (event.type === 'play') {
    setIsPlaying(true);
  } else if (event.type === 'pause') {
    setIsPlaying(false);
  } else if (event.type === 'speedChanged') {
    setSpeed(event.speed);
  }
});

// Send commands to engine
const handlePlayClick = () => engine.play();
const handlePauseClick = () => engine.pause();
const handleSeek = (time) => engine.seek(time);
```

**Key Rules:**
- Subscribe to events for display updates
- Mirror engine state in React for UI rendering
- Send commands (play, pause, seek) to engine
- Never drive time or frame updates
- Never write to engine state directly

## Implementation Tasks

### Task 1: Fix PlaybackEngine Syntax Errors
- [ ] Fix semicolon syntax errors in event type definitions
- [ ] Verify all methods compile correctly
- [ ] Test engine instantiation

### Task 2: Update useMeshSampler Hook
- [ ] Replace `engine.subscribe()` with `engine.addEventListener()`
- [ ] Read `engine.playbackTime` directly in RAF loop
- [ ] Remove dependency on Zustand playback state
- [ ] Ensure frame-accurate mesh updates

### Task 3: Create useVideoPlaybackSync Hook
- [ ] Register video elements with engine
- [ ] Listen to play/pause events
- [ ] Sync video currentTime with engine.playbackTime
- [ ] Handle video seeking and scrubbing
- [ ] Unregister on unmount

### Task 4: Update VideoToggleDisplay Component
- [ ] Call `engine.registerVideoElement()` when video loads
- [ ] Call `engine.unregisterVideoElement()` on unmount
- [ ] Keep native video controls enabled
- [ ] Allow independent video scrubbing

### Task 5: Update gridStore
- [ ] Remove playback state from Zustand (playbackTime, isPlaying, playbackSpeed)
- [ ] Replace `engine.subscribe()` with `engine.addEventListener()`
- [ ] Keep only UI/grid state in Zustand
- [ ] Update play/pause/seek methods to call engine directly

### Task 6: Update SharedPlaybackControls
- [ ] Subscribe to engine events for UI display
- [ ] Call engine methods for play/pause/seek/speed
- [ ] Display current time from engine.playbackTime
- [ ] No state management, only event listening

## Why This Architecture

### Avoids React Scheduling Jitter
- React state updates are batched and scheduled
- Engine runs at deterministic RAF cadence
- Consumers read state directly, not wait for React updates

### Keeps Frame Loop Deterministic
- Single RAF loop in engine
- All timing decisions made in one place
- No competing RAF loops or state updates

### Prevents Per-Frame State Updates
- Events only emitted on state changes
- No per-frame Zustand updates
- Consumers read state directly instead

### Video Stays Synced with RAF
- Engine is the timing authority
- Video syncs with drift tolerance (within 1 frame)
- Only seeks when drift exceeds 16.67ms (1 frame at 60fps)
- Native video element handles smooth rendering

### Mesh Always Perfectly Synced
- Frame indexing is deterministic and instant
- No calculation overhead
- Guarantees mesh + trails + annotations align
- Works with reverse playback (negative speed)

## Reverse Playback Implementation

Reverse is elegantly simple because `playbackSpeed` can be negative:

```typescript
// In engine RAF loop
const updateFrame = () => {
  if (isPlaying) {
    // playbackSpeed can be negative for reverse
    playbackTime += deltaTime * playbackSpeed;
    
    // Handle looping
    if (isLooping) {
      if (playbackTime >= duration) {
        playbackTime = playbackTime % duration;
      } else if (playbackTime < 0) {
        playbackTime = duration + (playbackTime % duration);
      }
    } else {
      // Clamp to valid range (no loop)
      if (playbackTime < 0) playbackTime = 0;
      if (playbackTime > duration) playbackTime = duration;
    }
  }
  
  // Everything else stays the same
  syncVideo(playbackTime);
  const frameIndex = engine.getFrameIndex(playbackTime);
  updateMesh(frameIndex);
  
  rafId = requestAnimationFrame(updateFrame);
};

// Shared loop toggle
engine.toggleLoop() {
  this.isLooping = !this.isLooping;
  this.emit({ type: 'loopToggled', isLooping: this.isLooping });
}

// Constructor
constructor() {
  this.isLooping = true; // Default: looping enabled
  // ... rest of initialization
}
```

**Default Behavior:**
- Looping is enabled by default (`isLooping = true`)
- First time videos/meshes are played, they loop automatically
- User can toggle looping off if desired
- Works in both forward and reverse directions

## Outcome

This model guarantees:
- ✅ Frame-accurate playback (forward and reverse)
- ✅ Perfect looping for all videos and meshes (synchronized)
- ✅ Deterministic sync across scenes and videos
- ✅ Smooth reverse without special handling
- ✅ Shared and individual reverse controls
- ✅ React remains observer and controller, not timing authority
- ✅ No jitter or sync drift

## UI Cleanup and Memory Management

### Close Scene Button
- Add close button to `WindowedControls.tsx` header
- Performs cleanup on scene closure:
  - Dispose Three.js resources (geometry, materials, renderer)
  - Cancel RAF loops and timers
  - Unsubscribe from engine events
  - Clear mesh data references
  - Stop video playback

### Row/Column Removal Cleanup
- When rows or columns are removed, cleanup all cells in that row/column:
  - Dispose Three.js scenes for each cell
  - Cancel RAF animation loops
  - Unsubscribe from playback engine events
  - Clear mesh data arrays
  - Stop video playback
  - Release memory references

### Fresh State on New Cells
- When new rows/columns are created:
  - Initialize fresh Three.js scenes
  - Create new mesh data containers
  - Register new video elements with engine
  - Subscribe to engine events
  - Ready for new content loading

## Files to Update

**Frontend only - `backend/web/src/` directory:**

1. `engine/PlaybackEngine.ts` - Fix syntax errors, add reverse implementation, frame indexing
2. `hooks/useMeshSampler.ts` - Use addEventListener, frame indexing
3. `hooks/useVideoPlaybackSync.ts` - Create new hook with drift tolerance
4. `components/VideoToggleDisplay.tsx` - Register video elements
5. `stores/gridStore.ts` - Remove playback state, add cleanup handlers
6. `components/SharedPlaybackControls.tsx` - Event-based UI, reverse controls
7. `components/WindowedControls.tsx` - Add close button with cleanup
8. `styles/WindowedControls.css` - Style close button
9. `App.tsx` - Remove Camera dropdown, remove SnowboardingExplained header

**NO backend changes. NO unit tests. NO documentation.**

## Acceptance Criteria

- [ ] PlaybackEngine compiles without errors
- [ ] All consumers use addEventListener instead of subscribe
- [ ] Mesh and video stay perfectly in sync during playback
- [ ] Shared controls can play/pause/seek/reverse all videos and mesh
- [ ] Individual video and mesh reverse controls work independently
- [ ] Video syncs with RAF (within 1 frame tolerance)
- [ ] Mesh frame indexing is deterministic and instant
- [ ] Looping works perfectly for all videos and meshes (synchronized)
- [ ] Looping works in both forward and reverse directions
- [ ] Close scene button performs full cleanup
- [ ] Row/column removal cleans up all cell resources
- [ ] New cells initialize with fresh state
- [ ] No React scheduling jitter or sync drift
- [ ] Frame-accurate playback at native FPS (forward and reverse)
- [ ] Camera dropdown removed from App.tsx
- [ ] SnowboardingExplained header removed from App.tsx
