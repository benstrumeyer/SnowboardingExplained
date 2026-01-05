# Requirements: PlaybackEngine Event-Based Architecture Refactor

## Introduction

The playback system must be refactored to use an event-based architecture where PlaybackEngine is the single source of truth for all timing and playback state. This eliminates React scheduling jitter and ensures frame-accurate, deterministic sync across all scenes and videos. The system must support forward and reverse playback, looping, and independent controls for videos and meshes while maintaining perfect synchronization.

## Glossary

- **PlaybackEngine** - The central timing authority that owns all playback state and advances time at RAF cadence
- **playbackTime** - Current playback position in milliseconds, owned by PlaybackEngine
- **isPlaying** - Boolean state indicating whether playback is active
- **playbackSpeed** - Speed multiplier for playback (can be negative for reverse)
- **isReversing** - Boolean state indicating reverse playback direction
- **isLooping** - Boolean state indicating whether playback loops at end (default: true)
- **frameIndex** - Zero-based index of current frame in mesh data
- **frameInterval** - Time in milliseconds between frames (1000 / fps)
- **drift** - Difference between video.currentTime and engine.playbackTime
- **RAF** - RequestAnimationFrame, browser's 60fps timing mechanism
- **Mesh** - 3D model data with vertices, faces, and camera parameters
- **Video** - HTML5 video element for playback
- **Zustand** - State management library (observer only, not timing authority)
- **React** - UI framework (observer and controller only, not timing authority)

## Requirements

### Requirement 1: PlaybackEngine as Single Timing Authority

**User Story:** As a developer, I want PlaybackEngine to be the single source of truth for all timing, so that playback is deterministic and synchronized across all scenes and videos.

#### Acceptance Criteria

1. THE PlaybackEngine SHALL own playbackTime, isPlaying, playbackSpeed, isReversing, and isLooping state
2. WHEN playbackTime is modified, THE PlaybackEngine SHALL NOT allow external writes to this state
3. THE PlaybackEngine SHALL advance playbackTime only when isPlaying is true
4. WHEN playbackTime advances, THE PlaybackEngine SHALL do so at RAF cadence (60fps)
5. THE PlaybackEngine SHALL emit events only on state changes, NOT on every RAF frame
6. WHEN consumers need current time, THE PlaybackEngine SHALL provide direct property reads (engine.playbackTime)
7. React and Zustand SHALL be observers and controllers only, never timing authorities

### Requirement 2: Frame-Accurate Mesh Synchronization

**User Story:** As a user, I want the 3D mesh to stay perfectly in sync with video playback, so that motion analysis is accurate.

#### Acceptance Criteria

1. WHEN playbackTime changes, THE PlaybackEngine SHALL calculate frameIndex using getFrameIndex(time)
2. THE getFrameIndex method SHALL use formula: Math.floor(timeMs / frameIntervalMs) % totalFrames
3. THE frameIndex calculation SHALL be O(1) deterministic lookup
4. WHEN mesh is updated, THE mesh sampler SHALL read frameIndex directly from engine each RAF frame
5. THE mesh frame SHALL never drift from engine.playbackTime
6. WHEN playbackSpeed changes, THE mesh frame SHALL update immediately without lag

### Requirement 3: Video Synchronization with Drift Tolerance

**User Story:** As a user, I want video playback to be smooth while staying synchronized with the mesh, so that I see natural motion without jitter.

#### Acceptance Criteria

1. WHEN video is playing, THE engine RAF loop SHALL sync video.currentTime with engine.playbackTime
2. THE engine SHALL only seek video when drift exceeds 16.67ms (1 frame at 60fps)
3. IF drift is less than 16.67ms, THEN THE engine SHALL NOT seek video
4. WHEN video.currentTime is set, THE video element SHALL handle smooth rendering independently
5. THE video sync mechanism SHALL work in both forward and reverse directions

### Requirement 4: Reverse Playback Support

**User Story:** As a user, I want to play videos and meshes in reverse, so that I can analyze motion in both directions.

#### Acceptance Criteria

1. WHEN playbackSpeed is negative, THE PlaybackEngine SHALL advance playbackTime backward
2. THE PlaybackEngine SHALL support both shared reverse (affects all videos/meshes) and individual reverse
3. WHEN toggleReverse is called, THE PlaybackEngine SHALL negate playbackSpeed and set isReversing
4. WHEN reversing, THE mesh frame lookup SHALL work correctly using modulo arithmetic
5. WHEN reversing, THE video.currentTime seeking SHALL work correctly in both directions
6. THE reverse mechanism SHALL work with looping enabled or disabled

### Requirement 5: Looping Behavior

**User Story:** As a user, I want videos and meshes to loop automatically, so that I can continuously analyze motion without manual restart.

#### Acceptance Criteria

1. THE PlaybackEngine SHALL initialize with isLooping = true (default enabled)
2. WHEN isLooping is true and playbackTime reaches duration, THE PlaybackEngine SHALL wrap playbackTime to 0
3. WHEN isLooping is true and playbackTime goes negative (reverse), THE PlaybackEngine SHALL wrap to duration
4. WHEN isLooping is false and playbackTime reaches duration, THE PlaybackEngine SHALL clamp to duration
5. WHEN isLooping is false and playbackTime goes negative, THE PlaybackEngine SHALL clamp to 0
6. WHEN toggleLoop is called, THE PlaybackEngine SHALL toggle isLooping and emit loopToggled event
7. THE looping mechanism SHALL work in both forward and reverse directions
8. WHEN looping, THE mesh and video SHALL loop at exactly the same time

### Requirement 6: Event-Based API

**User Story:** As a developer, I want to subscribe to playback events, so that UI components can update without polling.

#### Acceptance Criteria

1. THE PlaybackEngine SHALL emit play event when isPlaying changes to true
2. THE PlaybackEngine SHALL emit pause event when isPlaying changes to false
3. THE PlaybackEngine SHALL emit timeSet event with time parameter when seek is called
4. THE PlaybackEngine SHALL emit speedChanged event with speed parameter when setSpeed is called
5. THE PlaybackEngine SHALL emit reverseToggled event with isReversing parameter when toggleReverse is called
6. THE PlaybackEngine SHALL emit loopToggled event with isLooping parameter when toggleLoop is called
7. THE addEventListener method SHALL return an unsubscribe function
8. WHEN unsubscribe is called, THE listener SHALL no longer receive events

### Requirement 7: Mesh Sampler Hook Updates

**User Story:** As a developer, I want the mesh sampler to use the new event-based API, so that mesh updates are frame-accurate.

#### Acceptance Criteria

1. WHEN useMeshSampler hook mounts, THE hook SHALL subscribe to engine events using addEventListener
2. WHEN engine emits frameUpdate event, THE hook SHALL read engine.playbackTime directly
3. THE hook SHALL calculate frameIndex using engine.getFrameIndex(playbackTime)
4. THE hook SHALL call onFrameUpdate callback with mesh data for calculated frameIndex
5. WHEN hook unmounts, THE hook SHALL unsubscribe from engine events
6. THE hook SHALL NOT depend on Zustand playback state

### Requirement 8: Video Playback Sync Hook

**User Story:** As a developer, I want a dedicated hook for video synchronization, so that video elements stay in sync with the engine.

#### Acceptance Criteria

1. WHEN useVideoPlaybackSync hook mounts with a video element, THE hook SHALL register the video with engine
2. WHEN engine emits play event, THE hook SHALL call video.play()
3. WHEN engine emits pause event, THE hook SHALL call video.pause()
4. WHEN engine emits timeSet event, THE hook SHALL set video.currentTime to time / 1000
5. WHEN hook unmounts, THE hook SHALL unregister the video from engine
6. THE hook SHALL handle video seeking and scrubbing correctly

### Requirement 9: Shared Playback Controls

**User Story:** As a user, I want shared controls that affect all videos and meshes, so that I can control playback globally.

#### Acceptance Criteria

1. WHEN play button is clicked, THE SharedPlaybackControls SHALL call engine.play()
2. WHEN pause button is clicked, THE SharedPlaybackControls SHALL call engine.pause()
3. WHEN seek slider is moved, THE SharedPlaybackControls SHALL call engine.seek(time)
4. WHEN speed slider is moved, THE SharedPlaybackControls SHALL call engine.setSpeed(speed)
5. WHEN reverse button is clicked, THE SharedPlaybackControls SHALL call engine.toggleReverse()
6. WHEN loop button is clicked, THE SharedPlaybackControls SHALL call engine.toggleLoop()
7. THE SharedPlaybackControls SHALL display current time from engine.playbackTime
8. THE SharedPlaybackControls SHALL subscribe to engine events for UI updates
9. THE SharedPlaybackControls SHALL NOT manage playback state directly

### Requirement 10: Individual Video and Mesh Controls

**User Story:** As a user, I want to control individual videos and meshes independently, so that I can compare different playback speeds or directions.

#### Acceptance Criteria

1. WHEN individual video reverse is triggered, THE video playback direction SHALL reverse independently
2. WHEN individual mesh reverse is triggered, THE mesh playback direction SHALL reverse independently
3. WHEN individual video is scrubbed, THE video.currentTime SHALL update without affecting other videos
4. WHEN individual mesh frame is selected, THE mesh SHALL display that frame without affecting other meshes
5. THE individual controls SHALL NOT affect shared playback state

### Requirement 11: UI Cleanup and Memory Management

**User Story:** As a developer, I want proper cleanup when scenes are closed or grid cells are removed, so that memory is released and resources are disposed.

#### Acceptance Criteria

1. WHEN close button is clicked on WindowedControls, THE component SHALL dispose Three.js resources
2. WHEN close button is clicked, THE component SHALL cancel RAF loops and timers
3. WHEN close button is clicked, THE component SHALL unsubscribe from engine events
4. WHEN close button is clicked, THE component SHALL clear mesh data references
5. WHEN close button is clicked, THE component SHALL stop video playback
6. WHEN rows or columns are removed, THE grid SHALL cleanup all cells in that row/column
7. WHEN new rows or columns are created, THE grid SHALL initialize fresh Three.js scenes
8. WHEN new cells are created, THE cells SHALL register new video elements with engine
9. WHEN new cells are created, THE cells SHALL subscribe to engine events

### Requirement 12: UI Simplification

**User Story:** As a user, I want a cleaner interface with more screen real estate, so that I can focus on the content.

#### Acceptance Criteria

1. THE Camera dropdown in App.tsx SHALL be removed
2. THE SnowboardingExplained header in App.tsx SHALL be removed
3. THE camera button controls in CameraControls.tsx SHALL remain functional
4. THE remaining UI elements SHALL maintain all playback functionality

### Requirement 13: No Backend Changes

**User Story:** As a developer, I want to ensure the refactor is frontend-only, so that backend services remain stable.

#### Acceptance Criteria

1. THE backend API endpoints SHALL NOT be modified
2. THE backend data models SHALL NOT be modified
3. THE backend services SHALL NOT be modified
4. ALL changes SHALL be in backend/web/src/ directory only

