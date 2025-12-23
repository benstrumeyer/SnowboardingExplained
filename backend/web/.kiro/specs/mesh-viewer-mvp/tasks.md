# Mesh Viewer MVP - Implementation Plan

- [x] 1. Update Backend Data Structure for Unified Video + Mesh Storage





  - Modify MeshSequence interface to include video metadata and frame-level synchronization data
  - Update MongoDB schema to store original video file path alongside mesh data





  - Create migration script to update existing mesh data records
  - Implement frame-to-frame timing calculation to match video framerate
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 2. Implement Frame Extraction and Synchronization Service
  - Create frameExtraction.ts service to extract frames from video and mesh data together



  - Implement frame timing calculation to ensure video and mesh frames align
  - Add frame indexing to map video frames to mesh keypoints

  - Create utility functions for frame-level synchronization
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 2.1 Write property test for frame synchronization
  - **Property 12: Unified Data Structure Synchronization**
  - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**



- [-] 3. Update Frontend MeshSequence Type and Data Service

  - Update MeshSequence interface in frontend types to match backend structure
  - Modify meshDataService.ts to handle unified data structure
  - Update data fetching to include video metadata
  - Implement frame index mapping for playback
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_



- [ ] 3.1 Write property test for frontend data structure consistency
  - **Property 12: Unified Data Structure Synchronization**

  - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5**



- [x] 4. Implement Playback Service with Synchronization


  - Create playbackService.ts to manage synchronized playback of video and mesh
  - Implement frame advancement logic that updates both video and mesh simultaneously
  - Add playback speed multiplier support (0.25x, 0.5x, 1x, 2x, 4x)
  - Implement frame seeking with synchronization
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 4.1 Write property test for frame synchronization invariant




  - **Property 1: Frame Synchronization Invariant**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**


- [ ] 4.2 Write property test for playback speed consistency
  - **Property 2: Playback Speed Consistency**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**


- [ ] 5. Implement PlaybackControls Component
  - Create PlaybackControls.tsx component with play/pause buttons
  - Add playback speed selector (0.25x, 0.5x, 1x, 2x, 4x)

  - Implement timeline slider for frame seeking
  - Add frame counter display (current/total)

  - Connect to playbackService for state management
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5.1 Write unit tests for PlaybackControls component
  - Test play/pause button functionality
  - Test speed selector updates
  - Test timeline slider seeking
  - _Requirements: 3.1, 3.2, 3.3, 3.4_


- [ ] 6. Implement Camera Controls and Presets
  - Create cameraService.ts with preset camera positions (top, front, back, left, right)

  - Implement free rotation camera control with mouse drag
  - Add camera animation for smooth transitions between presets
  - Ensure model stays centered during all camera movements
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Write property test for camera centering invariant


  - **Property 3: Camera Centering Invariant**
  - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**


- [ ] 7. Implement CameraControls Component
  - Create CameraControls.tsx component with preset view buttons
  - Add mouse event handlers for free rotation




  - Display current camera preset indicator
  - Connect to cameraService for camera state management
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7.1 Write unit tests for CameraControls component
  - Test preset button clicks
  - Test mouse drag rotation

  - Test camera animation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [ ] 8. Implement Model Orientation and Ground Placement
  - Create orientationService.ts to analyze first frame and calculate orientation
  - Implement algorithm to detect feet position and head orientation
  - Calculate rotation matrix to place feet on ground and head upright
  - Apply transformation to all frames in sequence
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_




- [x] 8.1 Write property test for model orientation consistency

  - **Property 4: Model Orientation Consistency**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 8.2 Write property test for joint relationship preservation
  - **Property 5: Grid Floor Stability** (also validates joint preservation)
  - **Validates: Requirements 5.5**

- [ ] 9. Update MeshViewer Component with Grid Floor and Background
  - Add grey grid floor to Three.js scene




  - Implement grid with visible square divisions
  - Set black background color
  - Ensure grid remains stationary during camera and model movements
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9.1 Write property test for grid floor stability
  - **Property 5: Grid Floor Stability**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 10. Implement Mesh Customization (Color and Opacity)
  - Create MeshCustomization.tsx component with color picker and opacity slider

  - Implement color and opacity state management per mesh

  - Update MeshViewer to apply customization to Three.js materials
  - Ensure independent control for multiple meshes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.1 Write property test for mesh appearance independence

  - **Property 6: Mesh Appearance Independence**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**


- [x] 11. Implement Tracking Line Visualization

  - Create trackingService.ts to calculate tracking line positions for each keypoint
  - Implement line drawing in Three.js for each body part
  - Assign distinct colors to all 33 body parts
  - Update tracking lines progressively as frames advance


  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 11.1 Write property test for tracking line continuity

  - **Property 7: Tracking Line Continuity**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**


- [x] 12. Implement TrackingVisualization Component


  - Create TrackingVisualization.tsx component with body part selection
  - Add toggle for each of the 33 body parts
  - Implement tracking line enable/disable functionality
  - Display tracking line color legend
  - Connect to trackingService for line calculations

  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_




- [ ] 12.1 Write unit tests for TrackingVisualization component
  - Test body part selection
  - Test tracking line toggle
  - Test color legend display
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 13. Implement Media Tabs System
  - Create MediaTabs.tsx component for tab management



  - Implement tab creation, selection, and closing

  - Store independent state for each tab (playback position, speed, appearance)
  - Implement tab switching with state preservation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13.1 Write property test for tab independence
  - **Property 8: Tab Independence**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 14. Implement Joint Angle Visualization



  - Create angleService.ts to calculate angles between connected joints
  - Implement angle display in Three.js (text labels at joint positions)
  - Add angle mode toggle for each mesh
  - Update angles as frames advance
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14.1 Write property test for joint angle accuracy
  - **Property 9: Joint Angle Accuracy**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**



- [x] 15. Implement Zoom Controls (Hotkeys and Mouse Wheel)

  - Add keyboard event listeners for + and - hotkeys
  - Implement mouse wheel scroll for zoom adjustment
  - Update Three.js camera zoom/FOV based on zoom level
  - Ensure model stays centered during zoom
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15.1 Write property test for zoom invariant

  - **Property 10: Zoom Invariant**
  - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**



- [ ] 16. Implement Timeline Scrubbing with Mouse Wheel
  - Add mouse wheel event handler for timeline scrubbing

  - Implement frame advancement/rewind based on scroll direction
  - Prioritize timeline scrubbing over zoom when hovering over timeline
  - Update both video and mesh to new frame
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 16.1 Write property test for timeline scrubbing accuracy
  - **Property 11: Timeline Scrubbing Accuracy**
  - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**


- [ ] 17. Implement Toast Notification System
  - Create ToastNotification.tsx component with success/error states
  - Implement toast display on model load success
  - Add auto-dismiss after 3-5 seconds
  - Display error toasts on load failures

  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 17.1 Write property test for toast notification timing
  - **Property 12: Toast Notification Timing** (custom property for notification behavior)

  - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

- [ ] 18. Implement 2D Video Overlay Feature
  - Create VideoOverlay.tsx component for 2D video display
  - Implement mesh overlay on top of video using Canvas or Three.js

  - Add opacity control for mesh overlay
  - Synchronize video and mesh playback in overlay mode
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 18.1 Write property test for overlay synchronization
  - **Property 13: 2D Overlay Synchronization**
  - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

- [ ] 19. Implement Multi-View Display Modes
  - Create ViewMode.tsx component with mode selector
  - Implement side-by-side view (video left, mesh right)

  - Implement comparison mode (two meshes side-by-side)
  - Implement overlay mode (video + mesh overlay)
  - Implement single scene mode (full-screen 3D with overlay options)
  - Maintain playback sync when switching modes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_



- [ ] 19.1 Write property test for mode switching state preservation
  - **Property 1: Frame Synchronization Invariant** (also validates mode switching)
  - **Validates: Requirements 1.5_

- [ ] 20. Implement Main App Layout and UI Integration
  - Create main App.tsx layout with all components
  - Implement responsive layout with 3D scene centered
  - Position playback controls below scene
  - Position camera presets in accessible location
  - Position media tabs at top
  - Position mesh customization in side panel or collapsible menu
  - Remove right sidebar to maximize scene area
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.5_

- [ ] 20.1 Write unit tests for App layout
  - Test component positioning
  - Test responsive behavior
  - Test sidebar removal
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.5_

- [ ] 21. Implement Video Loading and Error Handling
  - Create video loading service with error handling
  - Implement loading indicator display
  - Add error message display with retry functionality
  - Handle missing or corrupted video files
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 21.1 Write unit tests for video loading
  - Test successful video load
  - Test error handling
  - Test retry functionality
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Integration Testing and Performance Optimization
  - Test full playback workflow (load → play → seek → pause)
  - Test mode switching with multiple meshes
  - Test camera control interactions
  - Test tracking line visualization
  - Optimize rendering performance for large mesh sequences
  - Profile memory usage and optimize as needed
  - _Requirements: All_

- [ ] 23.1 Write integration tests for full playback workflow
  - Test loading video and mesh
  - Test playback at various speeds
  - Test seeking and frame advancement
  - Test mode switching
  - _Requirements: All_

- [ ] 24. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
