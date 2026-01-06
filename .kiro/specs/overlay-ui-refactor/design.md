# Design: Overlay UI Refactor

## Overview

This design transforms the sidebar-based layout into a full-width grid with transparent overlay controls. All UI elements (scrubber, playback controls, camera controls, grid config) are repositioned as absolutely positioned overlays that float over grid cells, maximizing viewing area while maintaining accessibility.

## Architecture

```
App Layout (Full Width)
├── Header (Top Bar)
│   ├── Process Videos Button (Top Right)
│   └── Performance Monitor (Top Right)
├── Grid Container (Full Width)
│   ├── GridLayout (Full Width, Full Height)
│   │   ├── Grid Cell 1
│   │   │   ├── Content (Video/Mesh)
│   │   │   └── Overlay Controls
│   │   │       ├── Camera Presets (Top Left Corner)
│   │   │       ├── Empty State Modal (Center)
│   │   │       └── Content Load Modal (Center)
│   │   ├── Grid Cell 2
│   │   │   ├── Content (Video/Mesh)
│   │   │   └── Overlay Controls
│   │   └── Grid Cell N
│   │       ├── Content (Video/Mesh)
│   │       └── Overlay Controls
│   └── Global Scrubber (Bottom, Full Width)
│       ├── Timeline with Meter Marks
│       ├── Playback Controls (Play, Forward, Loop)
│       └── Speed Presets (0.5x, 1x, 1.5x, 2x)
└── Grid Configuration Modal (Overlay)
    ├── Rows Input
    ├── Columns Input
    └── Confirm Button
```

## Components and Interfaces

### GlobalScrubberOverlay

**Purpose:** Renders scrubber at bottom of grid with playback controls and speed presets.

**Key Features:**
- 60px height, semi-transparent background
- Meter marks showing time intervals (seconds, microseconds)
- Playback controls (play/pause, forward, loop)
- Speed presets (0.5x, 1x, 1.5x, 2x)
- Responsive to grid width

**Props:**
- `duration: number` - Total playback duration in ms
- `playbackTime: number` - Current playback time in ms
- `isPlaying: boolean` - Current playback state
- `onSeek: (time: number) => void` - Seek callback
- `onPlayPause: () => void` - Play/pause callback
- `onSpeedChange: (speed: number) => void` - Speed change callback

### CellOverlayControls

**Purpose:** Renders camera preset buttons overlaid on each grid cell.

**Key Features:**
- Positioned in top-left corner of cell
- Small, compact buttons
- Semi-transparent background
- Highlights selected preset

**Props:**
- `cellId: string` - Cell identifier
- `onCameraPresetChange: (preset: CameraPreset) => void` - Camera change callback

### GridConfigurationModal

**Purpose:** Modal dialog for configuring grid dimensions.

**Key Features:**
- Input fields for rows (1-4) and columns (1-4)
- Shows total cell count
- Confirm/Cancel buttons
- Updates grid dimensions on confirm

**Props:**
- `isOpen: boolean` - Modal visibility
- `rows: number` - Current rows
- `columns: number` - Current columns
- `onConfirm: (rows: number, cols: number) => void` - Confirm callback
- `onCancel: () => void` - Cancel callback

### ProcessVideosButton

**Purpose:** Button in top-right corner to trigger video processing.

**Key Features:**
- Positioned in top-right corner
- Near performance monitor
- Shows success/error messages

**Props:**
- `onProcess: () => Promise<void>` - Process callback

### Updated App.tsx

**Changes:**
- Remove sidebar div
- Add full-width grid container
- Add global scrubber overlay at bottom
- Add process videos button in header
- Add grid configuration modal
- Update CSS for full-width layout

### Updated GridCell.tsx

**Changes:**
- Add CellOverlayControls component
- Position camera controls in top-left corner
- Keep empty state and content load modal
- Ensure content fills cell

## Data Models

### ScrubberMeterMark

```typescript
interface ScrubberMeterMark {
  time: number;           // Time in ms
  label: string;          // Display label (e.g., "1s", "500ms")
  type: 'major' | 'minor'; // Major or minor tick
}
```

### OverlayControlsPosition

```typescript
interface OverlayControlsPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  zIndex: number;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Full-Width Grid Utilization

*For any* viewport size, the grid SHALL occupy 100% of available width after sidebar removal.

**Validates: Requirements 1.1, 1.4**

### Property 2: Scrubber Visibility and Functionality

*For any* playback state, the scrubber SHALL be visible at the bottom of the grid and accurately reflect playback progress.

**Validates: Requirements 2.1, 2.6, 2.7**

### Property 3: Overlay Controls Non-Obstruction

*For any* grid cell, overlay controls SHALL be positioned to minimize obstruction of cell content.

**Validates: Requirements 9.1, 9.2**

### Property 4: Meter Marks Accuracy

*For any* scrubber duration, meter marks SHALL be placed at regular intervals and labeled correctly.

**Validates: Requirements 2.4**

### Property 5: Grid Resize Propagation

*For any* grid dimension change, all grid cells SHALL resize and Three.js scenes SHALL update to match.

**Validates: Requirements 5.6, 5.7, 10.1, 10.2, 10.3**

### Property 6: Modal Interaction

*For any* modal open state, the modal SHALL be visible and interactive, and closing SHALL restore previous state.

**Validates: Requirements 5.1, 5.5, 8.4, 8.5**

### Property 7: Control Responsiveness

*For any* viewport resize, overlay controls SHALL reposition and rescale appropriately.

**Validates: Requirements 9.3, 9.4**

### Property 8: Empty State Consistency

*For any* empty cell, the empty state placeholder SHALL be displayed with consistent styling and behavior.

**Validates: Requirements 8.1, 8.2, 8.3**

## Error Handling

**Grid Resize Errors:**
- Validate new dimensions are within bounds (1-4 rows/cols)
- Handle Three.js resize failures gracefully
- Log errors to console

**Modal Interaction Errors:**
- Validate input values before confirming
- Show error message if validation fails
- Prevent modal close on invalid input

**Scrubber Interaction Errors:**
- Clamp seek time to valid range
- Handle playback control failures
- Show error message if playback fails

## Testing Strategy

### Unit Tests

- Test GlobalScrubberOverlay renders correctly
- Test meter marks calculated correctly
- Test CellOverlayControls positioning
- Test GridConfigurationModal validation
- Test ProcessVideosButton interaction
- Test overlay controls responsiveness

### Property-Based Tests

- **Property 1:** Generate random viewport sizes, verify grid width is 100%
- **Property 2:** Generate random playback times, verify scrubber reflects progress
- **Property 3:** Generate random cell sizes, verify controls don't obstruct content
- **Property 4:** Generate random durations, verify meter marks placed correctly
- **Property 5:** Generate random grid dimension changes, verify cells and scenes resize
- **Property 6:** Generate random modal interactions, verify state consistency
- **Property 7:** Generate random viewport resizes, verify controls reposition
- **Property 8:** Generate random empty cell states, verify consistent display

### Integration Tests

- Test full layout with multiple grid cells
- Test scrubber controls affect all cells
- Test grid configuration modal updates layout
- Test camera controls work per cell
- Test responsive behavior on resize
- Test Three.js scenes resize with cells

