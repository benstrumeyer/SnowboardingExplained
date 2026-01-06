# Implementation Plan: Overlay UI Refactor

## Overview

Transform the sidebar-based layout into a full-width grid with transparent overlay controls. All UI elements will be repositioned as absolutely positioned overlays, maximizing viewing area while maintaining accessibility and functionality.

## Tasks

- [x] 1. Update App.tsx layout structure
  - Remove sidebar div completely
  - Update app-content to remove flex layout with sidebar
  - Make grid container full width
  - Add header bar for top-right controls
  - Update CSS classes for full-width layout
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Create GlobalScrubberOverlay component
  - Create `backend/web/src/components/GlobalScrubberOverlay.tsx`
  - Render scrubber at bottom of grid (60px height)
  - Implement semi-transparent background styling
  - Add playback controls (play/pause, forward, loop)
  - Add speed presets (0.5x, 1x, 1.5x, 2x)
  - Connect to PlaybackEngine for state updates
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implement meter marks for scrubber
  - Calculate meter mark positions based on duration
  - Generate marks for seconds and microseconds
  - Render major and minor tick marks
  - Label marks with time values
  - _Requirements: 2.4_

- [x] 4. Create CellOverlayControls component
  - Create `backend/web/src/components/CellOverlayControls.tsx`
  - Position camera preset buttons in top-left corner
  - Implement small, compact button styling
  - Add semi-transparent background
  - Highlight selected preset
  - Connect to globalCameraManager
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 5. Create GridConfigurationModal component
  - Create `backend/web/src/components/GridConfigurationModal.tsx`
  - Implement modal dialog with overlay
  - Add rows input (1-4)
  - Add columns input (1-4)
  - Show total cell count
  - Implement confirm/cancel buttons
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Create ProcessVideosButton component
  - Create `backend/web/src/components/ProcessVideosButton.tsx`
  - Position in top-right corner
  - Implement video processing logic
  - Show success/error messages
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [-] 7. Update GridCell to use overlay controls
  - Add CellOverlayControls component to GridCell
  - Position controls in top-left corner
  - Keep empty state and content load modal
  - Ensure content fills cell
  - _Requirements: 6.1, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 8. Implement grid resize handling
  - Add ResizeObserver to grid container
  - Detect grid cell size changes
  - Update Three.js renderer size on resize
  - Update camera aspect ratio
  - _Requirements: 5.6, 5.7, 10.1, 10.2, 10.3, 10.4_

- [ ] 9. Update App.css for full-width layout
  - Remove sidebar styling
  - Update app-content to full width
  - Add header bar styling
  - Add grid container full-width styling
  - Add overlay positioning utilities
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 10. Implement responsive overlay controls
  - Add media queries for small screens
  - Scale controls based on cell size
  - Reposition controls on viewport resize
  - Ensure controls remain visible and accessible
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 11. Add empty state styling
  - Create consistent empty state placeholder
  - Add "+" icon
  - Add "Click to load content" text
  - Style to match design
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 12. Integrate GlobalScrubberOverlay into App
  - Add GlobalScrubberOverlay to App.tsx
  - Position at bottom of grid
  - Connect to PlaybackEngine
  - Handle playback control callbacks
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

- [ ] 13. Integrate GridConfigurationModal into App
  - Add GridConfigurationModal to App.tsx
  - Add button to open modal
  - Handle grid dimension changes
  - Update grid layout on confirm
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 14. Integrate ProcessVideosButton into App
  - Add ProcessVideosButton to header
  - Position in top-right corner
  - Handle video processing
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 15. Test full layout with multiple cells
  - Load multiple mesh cells in grid
  - Verify overlay controls don't obstruct content
  - Verify scrubber works across all cells
  - Verify camera controls work per cell
  - Verify grid configuration modal works
  - Verify responsive behavior
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Focus on minimal, functional implementation
- Overlay controls should be semi-transparent but noticeable
- Grid should utilize full width after sidebar removal

