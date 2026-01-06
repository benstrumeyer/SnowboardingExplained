# Requirements: Overlay UI Refactor

## Introduction

The current sidebar-based UI layout wastes screen real estate, especially with multiple grid cells. This spec defines requirements for moving all controls to transparent overlays positioned absolutely over each grid cell, maximizing the viewing area while keeping controls accessible and non-obstructive.

## Glossary

- **Overlay Controls**: Absolutely positioned transparent UI elements that float over grid cells
- **Grid Cell**: Individual cell in the grid layout (video or mesh viewer)
- **Scrubber**: Timeline control showing playback progress with time markers
- **Modal**: Dialog box for configuration or settings
- **Empty State**: Placeholder UI shown before content is loaded
- **Meter Marks**: Visual indicators on scrubber showing time intervals (seconds, microseconds)

## Requirements

### Requirement 1: Remove Sidebar Layout

**User Story:** As a user, I want the sidebar removed so that the grid can utilize full width and maximize viewing area for multiple cells.

#### Acceptance Criteria

1. WHEN the application loads, THE sidebar SHALL NOT be visible
2. WHEN the grid layout renders, THE grid SHALL occupy the full width of the viewport
3. WHEN grid cells are displayed, THE cells SHALL have maximum available space
4. WHEN the application resizes, THE grid SHALL resize to fill available width

### Requirement 2: Overlay Scrubber at Bottom of Grid

**User Story:** As a user, I want a scrubber at the bottom of the grid that shows playback progress with time markers, so that I can see and control playback across all cells.

#### Acceptance Criteria

1. WHEN the grid renders, THE scrubber SHALL be positioned at the bottom of the grid
2. WHEN the scrubber is displayed, THE scrubber SHALL be 60px in height
3. WHEN the scrubber is visible, THE scrubber SHALL have semi-transparent background (not fully opaque)
4. WHEN the scrubber is displayed, THE scrubber SHALL show meter marks for time intervals (seconds, microseconds)
5. WHEN the scrubber is displayed, THE scrubber SHALL be noticeable but not obstructive
6. WHEN playback progresses, THE scrubber thumb SHALL move to reflect current playback time
7. WHEN the user clicks the scrubber, THE playback SHALL seek to that position

### Requirement 3: Playback Controls Near Scrubber

**User Story:** As a user, I want playback controls (play, forward, loop) positioned near the scrubber, so that I can control playback without taking up much space.

#### Acceptance Criteria

1. WHEN the scrubber is displayed, THE playback controls SHALL be positioned near the scrubber
2. WHEN the controls are displayed, THE controls SHALL include play/pause button
3. WHEN the controls are displayed, THE controls SHALL include forward button
4. WHEN the controls are displayed, THE controls SHALL include loop toggle
5. WHEN the controls are displayed, THE controls SHALL be small and compact
6. WHEN the controls are displayed, THE controls SHALL have semi-transparent background

### Requirement 4: Speed Presets Near Scrubber

**User Story:** As a user, I want speed preset buttons near the scrubber, so that I can quickly adjust playback speed.

#### Acceptance Criteria

1. WHEN the scrubber is displayed, THE speed presets SHALL be positioned near the scrubber
2. WHEN the presets are displayed, THE presets SHALL include common speeds (0.5x, 1x, 1.5x, 2x)
3. WHEN a speed is selected, THE playback speed SHALL change immediately
4. WHEN a speed is selected, THE selected speed button SHALL be highlighted
5. WHEN the presets are displayed, THE presets SHALL be small and compact

### Requirement 5: Grid Configuration Modal

**User Story:** As a user, I want to configure grid dimensions via a modal dialog, so that I can adjust the grid layout without a permanent sidebar.

#### Acceptance Criteria

1. WHEN the user clicks the grid configuration button, THE modal SHALL open
2. WHEN the modal is open, THE modal SHALL allow configuring rows (1-4)
3. WHEN the modal is open, THE modal SHALL allow configuring columns (1-4)
4. WHEN the modal is open, THE modal SHALL show the total number of cells
5. WHEN the user confirms, THE grid dimensions SHALL update
6. WHEN the grid dimensions change, THE grid cells SHALL resize accordingly
7. WHEN the grid cells resize, THE Three.js scenes SHALL resize to match

### Requirement 6: Camera Controls as Small Buttons

**User Story:** As a user, I want camera preset buttons overlaid on each cell, so that I can change camera angles without taking up much space.

#### Acceptance Criteria

1. WHEN a cell is loaded, THE camera control buttons SHALL be positioned in a corner of the cell
2. WHEN the buttons are displayed, THE buttons SHALL include presets (top, front, back, left, right)
3. WHEN the buttons are displayed, THE buttons SHALL be small and compact
4. WHEN the buttons are displayed, THE buttons SHALL have semi-transparent background
5. WHEN a preset is selected, THE camera SHALL change to that preset
6. WHEN a preset is selected, THE selected button SHALL be highlighted

### Requirement 7: Process Videos Button in Top Right

**User Story:** As a user, I want the process videos button in the top right corner, so that it's accessible but doesn't interfere with the main viewing area.

#### Acceptance Criteria

1. WHEN the application loads, THE process videos button SHALL be in the top right corner
2. WHEN the button is displayed, THE button SHALL be near the performance monitor
3. WHEN the button is clicked, THE video processing SHALL start
4. WHEN processing completes, THE user SHALL see a success message

### Requirement 8: Empty State and Modal Before Loading

**User Story:** As a user, I want to see an empty state with a modal before loading content, so that I understand what to do next.

#### Acceptance Criteria

1. WHEN a cell is empty, THE cell SHALL display an empty state placeholder
2. WHEN the empty state is displayed, THE placeholder SHALL show a "+" icon
3. WHEN the empty state is displayed, THE placeholder SHALL show "Click to load content"
4. WHEN the user clicks the empty state, THE content load modal SHALL open
5. WHEN the modal is open, THE user SHALL be able to select content to load
6. WHEN content is selected, THE cell SHALL load the content

### Requirement 9: Responsive Overlay Controls

**User Story:** As a user, I want overlay controls to be responsive and not obstruct the view, so that I can see the content clearly even with many cells.

#### Acceptance Criteria

1. WHEN multiple cells are displayed, THE overlay controls SHALL be positioned to minimize obstruction
2. WHEN a cell is small, THE controls SHALL scale appropriately
3. WHEN the viewport resizes, THE controls SHALL reposition and rescale
4. WHEN the user hovers over a control, THE control SHALL become more visible
5. WHEN the user is not interacting, THE controls SHALL be semi-transparent

### Requirement 10: Three.js Scene Resizing

**User Story:** As a developer, I want Three.js scenes to resize when grid cells resize, so that the 3D rendering stays sharp and properly scaled.

#### Acceptance Criteria

1. WHEN a grid cell resizes, THE Three.js renderer SHALL detect the resize
2. WHEN a resize is detected, THE renderer camera aspect ratio SHALL update
3. WHEN a resize is detected, THE renderer size SHALL update to match cell dimensions
4. WHEN the resize completes, THE 3D mesh SHALL render at the new size

