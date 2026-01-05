# Implementation Plan: PlaybackEngine Event-Based Architecture Refactor

## Overview

Refactor the playback system to use an event-based architecture where PlaybackEngine is the single source of truth for all timing. This involves updating the engine, hooks, components, and stores to work with the new event-driven model. All changes are frontend-only in `backend/web/src/`.

## Tasks

- [x] 1. Fix and enhance PlaybackEngine
  - [x] 1.1 Fix syntax errors in PlaybackEngine.ts
    - Fix semicolon errors in event type definitions
    - Verify all methods compile correctly
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Implement RAF loop with time advancement
    - Add startRAFLoop method that runs at 60fps
    - Implement playbackTime advancement when isPlaying is true
    - Add deltaTime calculation for smooth playback
    - _Requirements: 1.3, 1.4_
  
  - [x] 1.3 Implement looping logic
    - Add isLooping state (default: true)
    - Implement wrap-around for forward looping
    - Implement wrap-around for reverse looping
    - Add clamping logic when looping is disabled
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 1.4 Implement frame indexing
    - Add getFrameIndex(time) method with O(1) lookup
    - Use formula: Math.floor(timeMs / frameIntervalMs) % totalFrames
    - _Requirements: 2.2, 2.3_
  
  - [x] 1.5 Implement event system
    - Add listeners Set for event subscribers
    - Implement addEventListener method returning unsubscribe function
    - Implement emit method for event broadcasting
    - Emit events only on state changes, not per-frame
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 1.6 Implement reverse playback
    - Add isReversing state
    - Implement toggleReverse method
    - Support negative playbackSpeed
    - Ensure looping works with reverse
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 2. Create useVideoPlaybackSync hook
  - [x] 2.1 Create new hook file
    - Create backend/web/src/hooks/useVideoPlaybackSync.ts
    - _Requirements: 8.1_
  
  - [x] 2.2 Implement play/pause event handling
    - Subscribe to engine play event and call video.play()
    - Subscribe to engine pause event and call video.pause()
    - _Requirements: 8.2, 8.3_
  
  - [x] 2.3 Implement video time seeking
    - Subscribe to engine timeSet event
    - Set video.currentTime = time / 1000
    - _Requirements: 8.4_
  
  - [x] 2.4 Implement drift tolerance sync
    - On frameUpdate event, check drift between video.currentTime and engine.playbackTime
    - Only seek if drift exceeds 16.67ms (1 frame at 60fps)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 2.5 Implement cleanup on unmount
    - Unsubscribe from engine events on unmount
    - _Requirements: 8.5_

- [x] 3. Update useMeshSampler hook
  - [x] 3.1 Replace subscribe with addEventListener
    - Change from engine.subscribe() to engine.addEventListener()
    - _Requirements: 7.1_
  
  - [x] 3.2 Implement direct playbackTime reading
    - Read engine.playbackTime directly in RAF loop
    - Calculate frameIndex using engine.getFrameIndex(playbackTime)
    - _Requirements: 7.2, 7.3_
  
  - [x] 3.3 Remove Zustand dependency
    - Remove dependency on Zustand playback state
    - Use engine state directly
    - _Requirements: 7.4_
  
  - [x] 3.4 Ensure frame-accurate updates
    - Call onFrameUpdate with mesh data for calculated frameIndex
    - Verify no frame skipping or drift
    - _Requirements: 7.5, 7.6_

- [x] 4. Update VideoToggleDisplay component
  - [x] 4.1 Register video elements with engine
    - When video loads, register with engine
    - _Requirements: 10.3_
  
  - [x] 4.2 Unregister on unmount
    - When component unmounts, unregister video from engine
    - _Requirements: 10.3_
  
  - [x] 4.3 Keep native video controls enabled
    - Ensure video element native controls remain functional
    - _Requirements: 10.4_

- [x] 5. Update gridStore
  - [x] 5.1 Remove playback state from Zustand
    - Remove playbackTime, isPlaying, playbackSpeed from store
    - Keep only UI/grid state in Zustand
    - _Requirements: 13.1_
  
  - [x] 5.2 Replace subscribe with addEventListener
    - Update all engine.subscribe() calls to engine.addEventListener()
    - _Requirements: 13.2_
  
  - [x] 5.3 Update control methods
    - Update play/pause/seek methods to call engine directly
    - Remove state management for playback
    - _Requirements: 13.3_
  
  - [x] 5.4 Add cleanup handlers
    - Add cleanup logic for row/column removal
    - Dispose Three.js resources for removed cells
    - Cancel RAF loops and timers
    - Unsubscribe from engine events
    - _Requirements: 11.6, 11.7_
  
  - [x] 5.5 Add fresh state initialization
    - When new rows/columns are created, initialize fresh state
    - Create new Three.js scenes
    - Register new video elements
    - Subscribe to engine events
    - _Requirements: 11.8, 11.9_

- [x] 6. Update SharedPlaybackControls component
  - [x] 6.1 Subscribe to engine events
    - Subscribe to play, pause, speedChanged, reverseToggled, loopToggled events
    - Update UI state based on events
    - _Requirements: 9.7, 9.8_
  
  - [x] 6.2 Implement play/pause controls
    - Play button calls engine.play()
    - Pause button calls engine.pause()
    - _Requirements: 9.1, 9.2_
  
  - [x] 6.3 Implement seek control
    - Seek slider calls engine.seek(time)
    - _Requirements: 9.3_
  
  - [x] 6.4 Implement speed control
    - Speed slider calls engine.setSpeed(speed)
    - _Requirements: 9.4_
  
  - [x] 6.5 Implement reverse control
    - Reverse button calls engine.toggleReverse()
    - _Requirements: 9.5_
  
  - [x] 6.6 Implement loop control
    - Loop button calls engine.toggleLoop()
    - _Requirements: 9.6_
  
  - [x] 6.7 Display current time
    - Display current time from engine.playbackTime
    - Update on frameUpdate events
    - _Requirements: 9.7_
  
  - [x] 6.8 Remove state management
    - No direct state management for playback
    - Only event listening and UI updates
    - _Requirements: 9.9_

- [x] 7. Update WindowedControls component
  - [x] 7.1 Add close button to header
    - Add close button to WindowedControls.tsx header
    - _Requirements: 11.1_
  
  - [x] 7.2 Implement cleanup on close
    - Dispose Three.js resources (geometry, materials, renderer)
    - Cancel RAF loops and timers
    - Unsubscribe from engine events
    - Clear mesh data references
    - Stop video playback
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 8. Update WindowedControls.css
  - [x] 8.1 Style close button
    - Add styles for close button in header
    - Match existing design language
    - _Requirements: 11.1_

- [x] 9. Update App.tsx
  - [x] 9.1 Remove Camera dropdown
    - Remove Camera dropdown component
    - Keep camera button controls
    - _Requirements: 12.1, 12.3_
  
  - [x] 9.2 Remove SnowboardingExplained header
    - Remove SnowboardingExplained header
    - Increase screen real estate
    - _Requirements: 12.2_

- [x] 10. Checkpoint - Verify all components compile
  - Ensure all TypeScript files compile without errors
  - Verify no import/export issues
  - Check that all components mount correctly

- [x] 11. Verify synchronization
  - Test that mesh and video stay in sync during playback
  - Test that reverse playback works correctly
  - Test that looping works in both directions
  - Test that individual controls work independently
  - Test that shared controls affect all videos/meshes

- [ ] 12. Verify cleanup
  - Test that close button performs full cleanup
  - Test that row/column removal cleans up resources
  - Test that new cells initialize with fresh state
  - Verify no memory leaks

- [ ] 13. Final verification
  - Verify no React scheduling jitter
  - Verify frame-accurate playback at native FPS
  - Verify all acceptance criteria are met

## Notes

- All changes are frontend-only in `backend/web/src/`
- No backend changes required
- No unit tests required for now
- Focus on perfect synchronization and shared controls
- Ensure PlaybackEngine is the single source of truth for timing

