# Synchronized Video & Mesh Playback Requirements

## Introduction

This feature enables frame-by-frame synchronized playback of original video, 2D mesh-overlaid video, and 3D mesh models across multiple scenes. It leverages the proven React Native 2D-to-3D transposition and 3D-to-2D mapping implementation to ensure consistent mesh visualization across platforms. Redis caching ensures smooth, desynchronized-free playback with minimal latency.

## Glossary

- **Mesh Transposition**: Converting 2D video coordinates to 3D world space using pose estimation
- **Mesh Mapping**: Converting 3D mesh coordinates back to 2D screen space for video overlay
- **Frame Sync**: Ensuring all scenes display the same frame index at the same time
- **Overlay Frame**: Original video frame with 2D mesh skeleton drawn on top
- **Scene**: A view containing 3D mesh, original video, and/or overlay video
- **Redis Cache**: In-memory cache for fast frame retrieval
- **Desync**: When scenes display different frames or have timing misalignment

## Requirements

### Requirement 1: Shared Mesh Transposition Code

**User Story:** As a developer, I want to reuse the React Native mesh transposition logic in the web version, so that mesh visualization is consistent across platforms.

#### Acceptance Criteria

1. WHEN the web application loads a video, THE system SHALL use the same 2D-to-3D transposition algorithm from React Native
2. WHEN mesh data is processed, THE system SHALL apply identical coordinate transformations as the React Native implementation
3. WHERE the transposition code is shared, THE system SHALL maintain a single source of truth in a shared library
4. WHEN transposition is applied, THE system SHALL produce identical 3D coordinates as React Native for the same input

### Requirement 2: 2D Mesh Overlay Generation

**User Story:** As a user, I want to see the 3D mesh projected onto the original video as a 2D overlay, so that I can compare the model with the actual performance.

#### Acceptance Criteria

1. WHEN a video frame is processed, THE system SHALL generate a 2D mesh overlay using the 3D-to-2D mapping function
2. WHEN the overlay is generated, THE system SHALL draw the skeleton joints and connections on the video frame
3. WHEN overlay generation completes, THE system SHALL store the result as a JPEG frame in file storage
4. WHERE overlay frames are cached, THE system SHALL retrieve them from Redis for playback without regeneration

### Requirement 3: Aligned Frame Indexing Between Video and Mesh

**User Story:** As a developer, I want video frames and mesh frames to use identical frame indices, so that the frontend can request frame N and receive both video and mesh data at that exact index without additional mapping.

#### Acceptance Criteria

1. WHEN the mesh service extracts frames at specific indices (e.g., 0, 50, 100, 150), THE video service SHALL export frames using those exact same indices
2. WHEN a frame is requested by index N, THE system SHALL return the original video frame at index N, overlay frame at index N, and 3D mesh data at index N
3. WHILE video frames are being extracted, THE system SHALL store them with frame indices that match the mesh frame indices
4. WHEN frame data is retrieved, THE system SHALL guarantee that video frame index N corresponds to mesh frame index N with zero offset
5. IF the mesh service uses non-sequential frame indices, THE video service SHALL adapt to use the same index mapping

### Requirement 4: Video Frame Extraction with Mesh Index Alignment

**User Story:** As the video extraction service, I want to export frames using the same indices as the mesh extraction service, so that frontend playback is automatically synchronized without runtime mapping.

#### Acceptance Criteria

1. WHEN the video extraction service starts, THE system SHALL query the mesh service to determine which frame indices contain mesh data
2. WHEN extracting video frames, THE system SHALL only extract frames at indices where mesh data exists
3. WHILE extracting frames, THE system SHALL rename and store video frames using the mesh frame indices (not sequential 0, 1, 2...)
4. WHEN frame extraction completes, THE system SHALL produce a frame index mapping that shows which original video timestamps correspond to which mesh frame indices
5. WHEN the frontend requests frame index N, THE system SHALL return the video frame that was extracted at that mesh index N

### Requirement 5: Redis-Backed Frame Caching

**User Story:** As a system, I want to cache video frames in Redis, so that playback is smooth and responsive without disk I/O delays.

#### Acceptance Criteria

1. WHEN a video is loaded, THE system SHALL preload the next 10 frames into Redis cache
2. WHEN a frame is requested, THE system SHALL check Redis cache first before accessing disk
3. WHEN playback advances, THE system SHALL preload the next frame into cache asynchronously
4. WHERE cache entries exist, THE system SHALL expire them after 1 hour of inactivity
5. WHEN cache is full, THE system SHALL evict least-recently-used frames to make space

### Requirement 6: Overlay Toggle

**User Story:** As a user, I want to toggle between original video and mesh-overlaid video, so that I can switch between viewing modes without reloading.

#### Acceptance Criteria

1. WHEN a user toggles the overlay option, THE system SHALL switch between original and overlay frames for that scene
2. WHEN overlay is toggled, THE system SHALL maintain the current frame index without interruption
3. WHILE playback is active, THE system SHALL allow overlay toggling without pausing
4. WHEN overlay is disabled, THE system SHALL display the original video frame
5. WHEN overlay is enabled, THE system SHALL display the mesh-overlaid frame

### Requirement 7: Multi-Scene Synchronized Playback

**User Story:** As a user, I want each scene to maintain its independent frame position while playing at the same speed, so that I can compare different performances without forcing them to the same frame.

#### Acceptance Criteria

1. WHEN global playback starts, THE system SHALL advance all scenes by one frame per tick at the same speed
2. WHEN a user adjusts global playback speed, THE system SHALL apply the speed change to all scenes simultaneously
3. WHILE scenes are playing, THE system SHALL maintain each scene's independent frame index without forcing synchronization
4. WHEN a user pauses globally, THE system SHALL pause all scenes at their current independent frame positions
5. WHEN a user scrubs globally, THE system SHALL advance all scenes by the same frame offset while maintaining their independent positions
6. WHEN a scene's video is displayed, THE system SHALL always show the frame that corresponds to that scene's current 3D mesh frame index

### Requirement 8: Frame Data Retrieval API

**User Story:** As a frontend application, I want to retrieve frame data efficiently, so that playback is smooth and responsive.

#### Acceptance Criteria

1. WHEN requesting a frame, THE system SHALL return original frame, overlay frame, and mesh data in a single response
2. WHEN frame data is requested, THE system SHALL check Redis cache first for sub-millisecond retrieval
3. WHEN cache miss occurs, THE system SHALL load from disk and populate cache for future requests
4. WHERE frame data is large, THE system SHALL compress responses using gzip
5. WHEN multiple frames are requested, THE system SHALL batch requests to minimize network overhead

### Requirement 9: Shared Code Organization

**User Story:** As a developer, I want the mesh transposition code to be shared between React Native and web, so that I maintain one implementation.

#### Acceptance Criteria

1. WHERE transposition code exists, THE system SHALL extract it to a shared library
2. WHEN the shared library is used, THE system SHALL produce identical results in both React Native and web
3. WHILE maintaining the shared library, THE system SHALL ensure both platforms can import and use it
4. WHEN the shared library is updated, THE system SHALL automatically update both implementations

