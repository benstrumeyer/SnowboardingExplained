# UI Controls Revamp Requirements

## Introduction

Redesign the viewer interface to support a flexible grid-based layout system where each cell can independently render either a Three.js 3D scene or a video. Each cell has its own windowed controls, independent playback controls, and optional synchronization with shared group controls.

## Glossary

- **Grid**: Configurable layout system (1x1 to 4x4) where each cell renders content
- **Cell**: Individual grid cell that can display either a Three.js scene or video
- **Windowed Controls**: Draggable control panel specific to each cell
- **Sync Scene**: Toggle that synchronizes a cell's playback with shared group controls
- **Shared Group Controls**: Global controls (start frame, camera presets, playback speed) that affect all synced cells
- **Overlay Mode**: Video display showing mesh overlay on top of original video
- **Original Mode**: Video display showing only the original video without mesh overlay

## Requirements

### Requirement 1: Grid-Based Layout System

**User Story:** As a user, I want to configure the viewer layout with a flexible grid system, so that I can compare multiple videos and 3D scenes simultaneously.

#### Acceptance Criteria

1. WHEN the app loads, THE Grid SHALL default to 1x2 layout (1 row, 2 columns)
2. WHEN the user adjusts grid controls in the sidebar, THE Grid SHALL support configurations from 1x1 to 4x4
3. WHEN the grid is resized, THE existing cells SHALL maintain their content and state
4. WHEN a cell is added to the grid, THE cell SHALL be empty and ready for content
5. WHEN a cell is removed from the grid, THE cell's content and state SHALL be cleared

### Requirement 2: Cell Content Types

**User Story:** As a user, I want each grid cell to independently display either a video or a 3D mesh scene, so that I can compare different content types.

#### Acceptance Criteria

1. WHEN a cell is empty, THE cell SHALL display a placeholder with loading options
2. WHEN a user loads a video into a cell, THE cell SHALL display the video player
3. WHEN a user loads a model into a cell, THE cell SHALL display the Three.js 3D scene
4. WHEN content is loaded into a cell, THE cell's windowed controls SHALL appear at the top
5. WHEN a cell's content is cleared, THE cell SHALL return to the empty placeholder state

### Requirement 3: Windowed Cell Controls

**User Story:** As a user, I want each cell to have its own draggable control panel, so that I can manage playback and settings independently for each cell.

#### Acceptance Criteria

1. WHEN content is loaded into a cell, THE windowed controls panel SHALL appear at the top of the cell
2. WHEN the windowed controls panel is visible, THE user SHALL be able to drag it to reposition it
3. WHEN the windowed controls panel is visible, THE user SHALL be able to collapse/expand it
4. WHEN the windowed controls panel is visible, THE user SHALL see controls for:
   - Load Video button (to load a video into this cell)
   - Load Model button (to load a 3D model into this cell)
   - Sync Scene toggle (to synchronize with shared group controls)
   - Cell-specific playback controls (play/pause, frame navigation, speed)
   - Cell-specific camera controls (for Three.js scenes only)
   - Cell-specific display options (color, opacity, visibility toggles)

### Requirement 4: Independent Cell Playback

**User Story:** As a user, I want each cell to have independent playback controls, so that I can play, pause, and navigate frames separately for each cell.

#### Acceptance Criteria

1. WHEN a cell has video or mesh content, THE cell SHALL have independent playback state (playing/paused)
2. WHEN a cell has video or mesh content, THE cell SHALL have independent frame position
3. WHEN a cell has video or mesh content, THE cell SHALL have independent playback speed
4. WHEN the user plays a cell, OTHER cells SHALL NOT be affected
5. WHEN the user navigates frames in a cell, OTHER cells SHALL NOT be affected
6. WHEN the user changes playback speed in a cell, OTHER cells SHALL NOT be affected

### Requirement 5: Video Overlay Toggle

**User Story:** As a user, I want to toggle between original and overlay video modes within a cell, so that I can compare the original video with the mesh overlay.

#### Acceptance Criteria

1. WHEN a video cell is displaying a video, THE cell SHALL have an overlay/original toggle button
2. WHEN the user toggles to overlay mode, THE cell SHALL display the mesh overlay video
3. WHEN the user toggles to original mode, THE cell SHALL display the original video
4. WHEN the user toggles modes while the video is playing, THE video SHALL continue playing at the current frame
5. WHEN the user toggles modes while the video is paused, THE video SHALL remain at the current frame
6. WHEN the user toggles modes, THE frame position SHALL be preserved (frame 13 stays frame 13)
7. WHEN the mesh overlay video is playing, THE overlay video SHALL remain in sync with the mesh 3D scene (same frame rate and timing as original video)
8. WHEN the user switches from original to overlay mode during playback, THE overlay video SHALL start at the exact same frame without desynchronization

### Requirement 6: Sync Scene Toggle

**User Story:** As a user, I want to optionally synchronize a cell's playback with shared group controls, so that I can compare multiple cells with synchronized playback.

#### Acceptance Criteria

1. WHEN a cell has content loaded, THE cell's windowed controls SHALL have a "Sync Scene" toggle
2. WHEN Sync Scene is OFF, THE cell SHALL use independent playback controls
3. WHEN Sync Scene is ON, THE cell SHALL synchronize with shared group controls:
   - Start frame position
   - Camera presets
   - Playback speed
4. WHEN Sync Scene is toggled ON, THE cell's playback SHALL immediately sync to the shared group state
5. WHEN Sync Scene is toggled OFF, THE cell SHALL retain its current playback state and become independent
6. WHEN a synced cell's shared group control changes, THE cell SHALL update immediately

### Requirement 7: Shared Group Controls

**User Story:** As a user, I want global controls that affect all synced cells, so that I can coordinate playback across multiple cells.

#### Acceptance Criteria

1. WHEN the app loads, THE sidebar SHALL display shared group controls
2. WHEN the user adjusts shared group controls, ALL synced cells SHALL update immediately
3. WHEN the user changes the shared start frame, ALL synced cells SHALL jump to that frame
4. WHEN the user changes the shared camera preset, ALL synced cells with Three.js scenes SHALL update their camera
5. WHEN the user changes the shared playback speed, ALL synced cells SHALL update their playback speed
6. WHEN a cell is not synced, THE shared group controls SHALL NOT affect that cell

### Requirement 8: Model/Video Loading

**User Story:** As a user, I want to load models and videos directly into specific cells, so that I can populate the grid with content.

#### Acceptance Criteria

1. WHEN a cell is empty, THE cell SHALL display a scrollable list of available models and videos
2. WHEN the user clicks "Load Video" in a cell's windowed controls, THE cell SHALL show a video selection interface
3. WHEN the user clicks "Load Model" in a cell's windowed controls, THE cell SHALL show a model selection interface
4. WHEN the user selects a video, THE video SHALL load into that specific cell only
5. WHEN the user selects a model, THE model SHALL load into that specific cell only
6. WHEN content is loaded into a cell, THE windowed controls panel SHALL appear at the top of the cell
7. WHEN content is loaded into a cell, THE scrollable list SHALL be hidden

### Requirement 9: Grid Controls in Sidebar

**User Story:** As a user, I want to configure the grid layout from the sidebar, so that I can easily adjust the number of cells.

#### Acceptance Criteria

1. WHEN the app loads, THE sidebar SHALL display grid configuration controls
2. WHEN the user adjusts grid rows/columns, THE grid SHALL update to the new configuration
3. WHEN the user increases grid size, NEW empty cells SHALL be added
4. WHEN the user decreases grid size, CELLS SHALL be removed (starting from bottom-right)
5. WHEN cells are removed, THEIR content and state SHALL be cleared
6. WHEN the grid is reconfigured, REMAINING cells SHALL maintain their content and state

### Requirement 10: Sidebar Organization

**User Story:** As a user, I want the sidebar to be well-organized with clear sections, so that I can easily find and use controls.

#### Acceptance Criteria

1. WHEN the app loads, THE sidebar SHALL display sections for:
   - Upload Videos (Upload Rider, Upload Reference buttons)
   - Grid Configuration (rows/columns controls)
   - Shared Group Controls (camera presets, playback controls, sync button)
   - Models (scrollable list of available models)
2. WHEN the user scrolls the sidebar, ALL sections SHALL remain accessible
3. WHEN the user interacts with sidebar controls, THE changes SHALL apply to the appropriate cells

### Requirement 11: Cell Scrollable Content Lists

**User Story:** As a user, I want each cell to have a scrollable list of available models and videos, so that I can easily select content to load.

#### Acceptance Criteria

1. WHEN a cell is empty, THE cell SHALL display a scrollable list of available models and videos
2. WHEN the user scrolls the list, MORE models and videos SHALL become visible
3. WHEN the user clicks on a model/video in the list, THE content SHALL load into that cell
4. WHEN content is loaded, THE scrollable list SHALL be hidden and replaced with the content
5. WHEN content is cleared from a cell, THE scrollable list SHALL reappear

### Requirement 12: Responsive Design

**User Story:** As a user, I want the grid layout to be responsive and adapt to different screen sizes, so that I can use the app on various devices.

#### Acceptance Criteria

1. WHEN the window is resized, THE grid cells SHALL resize proportionally
2. WHEN the window is resized, THE content within cells SHALL remain visible and functional
3. WHEN the window is too small for the current grid configuration, THE sidebar MAY become scrollable
4. WHEN the window is resized, THE windowed controls panels SHALL remain accessible

### Requirement 13: Frame Scrubber at Cell Bottom

**User Story:** As a coach, I want a scrubber at the bottom of each cell so that I can quickly adjust the start position of each video independently, enabling true side-by-side playback comparison.

#### Acceptance Criteria

1. WHEN a cell has video or mesh content loaded, THE cell SHALL display a scrubber bar at the bottom
2. WHEN the user clicks on the scrubber bar, THE cell's playback SHALL jump to that frame
3. WHEN the user drags the scrubber handle, THE cell's playback SHALL follow the drag in real-time
4. WHEN the user releases the scrubber handle, THE cell SHALL resume playback from that frame
5. WHEN the cell is playing, THE scrubber handle SHALL move to indicate current playback position
6. WHEN the cell is paused, THE scrubber SHALL remain at the current frame position
7. WHEN the scrubber is adjusted, THE frame position SHALL update immediately (no delay)
8. WHEN the cell is synced to shared group controls, THE scrubber SHALL reflect the shared frame position
9. WHEN the cell is not synced, THE scrubber SHALL reflect the cell's independent frame position
10. WHEN the user adjusts the scrubber in a synced cell, THE shared group frame position SHALL update
11. WHEN the user adjusts the scrubber in a non-synced cell, OTHER cells SHALL NOT be affected
12. THE scrubber SHALL display the current frame number and total frame count (e.g., "Frame 45/300")



### Requirement 13: Frame Scrubber at Cell Bottom

**User Story:** As a coach, I want a scrubber at the bottom of each cell so that I can quickly adjust the start position of each video independently, enabling true side-by-side playback comparison.

#### Acceptance Criteria

1. WHEN a cell has video or mesh content loaded, THE cell SHALL display a scrubber bar at the bottom
2. WHEN the user clicks on the scrubber bar, THE cell's playback SHALL jump to that frame
3. WHEN the user drags the scrubber handle, THE cell's playback SHALL follow the drag in real-time
4. WHEN the user releases the scrubber handle, THE cell SHALL resume playback from that frame
5. WHEN the cell is playing, THE scrubber handle SHALL move to indicate current playback position
6. WHEN the cell is paused, THE scrubber SHALL remain at the current frame position
7. WHEN the scrubber is adjusted, THE frame position SHALL update immediately (no delay)
8. WHEN the cell is synced to shared group controls, THE scrubber SHALL reflect the shared frame position
9. WHEN the cell is not synced, THE scrubber SHALL reflect the cell's independent frame position
10. WHEN the user adjusts the scrubber in a synced cell, THE shared group frame position SHALL update
11. WHEN the user adjusts the scrubber in a non-synced cell, OTHER cells SHALL NOT be affected
12. THE scrubber SHALL display the current frame number and total frame count (e.g., "Frame 45/300")

### Requirement 14: Mesh Overlay Video Synchronization

**User Story:** As a user, I want the mesh overlay video to stay perfectly in sync with the 3D mesh scene, so that I can accurately compare the overlay with the 3D visualization.

#### Acceptance Criteria

1. WHEN the mesh overlay video is playing, THE overlay video frame rate SHALL match the original video frame rate
2. WHEN the mesh overlay video is playing, THE overlay video timing SHALL match the 3D mesh scene timing
3. WHEN the user switches from original to overlay mode during playback, THE overlay video SHALL start at the exact same frame without desynchronization
4. WHEN the user pauses playback, BOTH the overlay video and 3D mesh scene SHALL pause at the same frame
5. WHEN the user resumes playback, BOTH the overlay video and 3D mesh scene SHALL resume in sync
6. WHEN the user scrubs to a new frame, BOTH the overlay video and 3D mesh scene SHALL jump to the same frame
7. WHEN the playback speed is changed, BOTH the overlay video and 3D mesh scene SHALL update to the new speed simultaneously
8. WHEN the overlay video is playing, THE frame position of the overlay video SHALL always match the frame position of the 3D mesh scene

### Requirement 15: Responsive Design

**User Story:** As a user, I want the grid layout to be responsive and adapt to different screen sizes, so that I can use the app on various devices.

#### Acceptance Criteria

1. WHEN the window is resized, THE grid cells SHALL resize proportionally
2. WHEN the window is resized, THE content within cells SHALL remain visible and functional
3. WHEN the window is too small for the current grid configuration, THE sidebar MAY become scrollable
4. WHEN the window is resized, THE windowed controls panels SHALL remain accessible

### Requirement 16: 3D Mesh Nametag

**User Story:** As a coach, I want to add a temporary nametag above each 3D mesh model, so that I can label and identify different athletes during comparison sessions.

#### Acceptance Criteria

1. WHEN a Three.js mesh scene is loaded, THE windowed controls SHALL include a nametag input field
2. WHEN the user enters text in the nametag field, THE text SHALL appear as a label above the mesh model
3. WHEN the nametag is displayed, THE text SHALL be visible from all camera angles (top, front, back, left, right)
4. WHEN the nametag is displayed, THE text SHALL remain readable and not be obscured by the mesh
5. WHEN the user changes the nametag text, THE label above the mesh SHALL update immediately
6. WHEN the user clears the nametag field, THE label above the mesh SHALL disappear
7. WHEN the user rotates the camera, THE nametag SHALL rotate with the camera to remain readable
8. WHEN the user zooms in/out, THE nametag size SHALL scale appropriately to remain readable
9. WHEN the cell is closed or content is cleared, THE nametag SHALL be removed
10. WHEN the app is refreshed or the page is reloaded, THE nametag SHALL NOT be saved (temporary only)
11. WHEN multiple mesh scenes are displayed, EACH scene SHALL have its own independent nametag
12. THE nametag feature SHALL only be available for Three.js mesh scenes (not for video cells)
