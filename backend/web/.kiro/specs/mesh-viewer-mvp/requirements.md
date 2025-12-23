# Mesh Viewer MVP - Requirements Document

## Introduction

The Mesh Viewer MVP is a web-based analysis tool for comparing snowboarding videos with extracted 3D pose mesh models. It enables coaches and athletes to analyze movement from multiple perspectives, track body part trajectories over time, compare different runs or techniques, and measure joint angles. The viewer supports multiple display modes (side-by-side video, mesh comparison, overlay, and single scene) with synchronized playback, camera controls, and detailed body part tracking visualization.

## Glossary

- **Mesh**: A 3D skeletal model extracted from video using pose estimation (33 keypoints from MediaPipe)
- **Keypoint**: A tracked joint position in 3D space (e.g., left wrist, right knee)
- **Frame**: A single video frame at a specific timestamp
- **Tracking Line**: A visual line drawn in 3D space showing the path of a body part across multiple frames
- **Overlay**: Combining two visual elements (e.g., mesh + 2D video, or two meshes)
- **Pose Estimation**: The process of extracting 3D skeletal data from video
- **Grid Floor**: A reference plane with grid squares representing measurement units
- **Camera Angle**: A preset viewing position (top-down, front, back, left, right)
- **Playback Speed**: The rate at which video/mesh animation plays (0.25x, 0.5x, 1x, 2x, 4x)
- **Body Part**: One of 33 keypoints tracked by the pose estimation model
- **Joint Angle**: The angle between two connected body parts (e.g., elbow angle)

## Requirements

### Requirement 1: Multi-View Display Modes

**User Story:** As a coach, I want to view snowboarding footage in multiple configurations, so that I can analyze movement from different perspectives and compare techniques.

#### Acceptance Criteria

1. WHEN the viewer loads THEN the system SHALL display a side-by-side view with original video on the left and 3D mesh on the right
2. WHEN the user selects comparison mode THEN the system SHALL display two different mesh models side-by-side for direct comparison
3. WHEN the user selects overlay mode THEN the system SHALL display a 2D video overlaid with a 3D mesh model on the left side
4. WHEN the user selects single scene mode THEN the system SHALL display a full-screen 3D scene with options to overlay multiple meshes
5. WHEN the user switches between modes THEN the system SHALL maintain playback synchronization and current frame position

### Requirement 2: Synchronized Playback

**User Story:** As a coach, I want to play video and mesh animations in sync, so that I can correlate movement between the original footage and extracted pose data.

#### Acceptance Criteria

1. WHEN the user presses play THEN the system SHALL advance both video and mesh animation at the same rate
2. WHEN the user adjusts playback speed THEN the system SHALL apply the same speed to all loaded media (video and mesh)
3. WHEN the user seeks to a specific frame using the slider THEN the system SHALL update both video and mesh to that frame position
4. WHEN the user advances by one frame THEN the system SHALL increment both video and mesh by exactly one frame
5. WHEN the user loads multiple media items THEN the system SHALL maintain frame-level synchronization across all items

### Requirement 3: Playback Speed Control

**User Story:** As a coach, I want to play footage at different speeds, so that I can slow down complex movements or speed through simpler sections.

#### Acceptance Criteria

1. WHEN the user selects a playback speed option THEN the system SHALL immediately apply that speed (0.25x, 0.5x, 1x, 2x, 4x)
2. WHEN playback speed is changed during playback THEN the system SHALL continue playing at the new speed without interruption
3. WHEN the user pauses and resumes THEN the system SHALL maintain the previously selected playback speed
4. WHEN the user switches between media items THEN the system SHALL preserve the playback speed setting

### Requirement 4: Camera Controls and Presets

**User Story:** As a coach, I want to control the 3D camera view and quickly switch between preset angles, so that I can analyze movement from all directions.

#### Acceptance Criteria

1. WHEN the user clicks and holds the left mouse button on the 3D scene THEN the system SHALL allow free rotation of the camera around the model
2. WHEN the user clicks a preset view button (Top, Front, Back, Left, Right) THEN the system SHALL immediately move the camera to that angle
3. WHEN the camera is repositioned THEN the system SHALL keep the model centered and not move the model itself
4. WHEN the user rotates the camera manually THEN the system SHALL smoothly animate the camera movement
5. WHEN the user switches between preset views THEN the system SHALL maintain the model's position and scale

### Requirement 5: Model Orientation and Ground Placement

**User Story:** As a coach, I want models to be properly oriented with feet on the ground and head upright, so that I can accurately analyze body position and movement.

#### Acceptance Criteria

1. WHEN a model is loaded THEN the system SHALL analyze the first frame to determine the rider's position
2. WHEN the system detects the rider's position THEN the system SHALL calculate rotation needed to place feet on ground and head upright
3. WHEN the model is oriented THEN the system SHALL apply the calculated transformation to all frames
4. WHEN the user loads a new model THEN the system SHALL automatically apply the same orientation logic
5. WHEN orientation is applied THEN the system SHALL maintain all joint relationships and angles

### Requirement 6: Grid Floor and Scene Background

**User Story:** As a coach, I want a visual reference for scale and measurement, so that I can understand the spatial dimensions of movement.

#### Acceptance Criteria

1. WHEN the 3D scene renders THEN the system SHALL display a grey grid floor with visible square divisions
2. WHEN the grid is displayed THEN the system SHALL represent each square as a consistent measurement unit
3. WHEN the background renders THEN the system SHALL use a black background for contrast
4. WHEN the user rotates the camera THEN the system SHALL maintain the grid floor orientation relative to the world
5. WHEN the model moves THEN the system SHALL keep the grid floor stationary as a reference plane

### Requirement 7: Mesh Customization (Color and Opacity)

**User Story:** As a coach, I want to customize mesh appearance, so that I can distinguish between different models or highlight specific elements.

#### Acceptance Criteria

1. WHEN the user selects a mesh THEN the system SHALL provide options to change its color
2. WHEN the user adjusts opacity THEN the system SHALL apply the transparency to the selected mesh
3. WHEN multiple meshes are displayed THEN the system SHALL allow independent color and opacity control for each
4. WHEN the user changes mesh appearance THEN the system SHALL update the display in real-time
5. WHEN the user loads a new mesh THEN the system SHALL apply a distinct default color to differentiate it from existing meshes

### Requirement 8: Body Part Tracking Lines

**User Story:** As a coach, I want to visualize the path of body parts over time, so that I can analyze movement trajectories and consistency.

#### Acceptance Criteria

1. WHEN the user enables tracking for a body part THEN the system SHALL draw a line showing the path of that keypoint across frames
2. WHEN tracking is enabled THEN the system SHALL use a distinct color for each of the 33 body parts
3. WHEN the user advances frames THEN the system SHALL extend the tracking line to include the new frame position
4. WHEN the user toggles tracking off THEN the system SHALL remove the tracking lines from the display
5. WHEN the user plays through frames THEN the system SHALL progressively draw tracking lines as each frame is processed
6. WHEN the user seeks to a different frame THEN the system SHALL update tracking lines to show only the path up to that frame

### Requirement 9: Media Tabs and Independent Controls

**User Story:** As a coach, I want to manage multiple loaded media items with independent controls, so that I can compare different videos or meshes.

#### Acceptance Criteria

1. WHEN the user loads a media item THEN the system SHALL create a tab for that item
2. WHEN the user clicks a tab THEN the system SHALL display that media item's controls and properties
3. WHEN the user adjusts settings for one media item THEN the system SHALL not affect other media items' settings
4. WHEN the user closes a tab THEN the system SHALL remove that media item from the viewer
5. WHEN the user switches between tabs THEN the system SHALL maintain each item's individual playback position, speed, and appearance settings

### Requirement 10: Joint Angle Visualization

**User Story:** As a coach, I want to see joint angles displayed on the model, so that I can measure and analyze body positioning.

#### Acceptance Criteria

1. WHEN the user enables angle mode THEN the system SHALL calculate and display angles between connected joints
2. WHEN angle mode is active THEN the system SHALL show angle values at each joint location
3. WHEN the user toggles angle mode off THEN the system SHALL remove angle displays from the model
4. WHEN the user advances frames THEN the system SHALL update all displayed angles to reflect the new frame
5. WHEN the user has multiple meshes displayed THEN the system SHALL allow independent angle mode toggling for each mesh

### Requirement 11: Video and Mesh Loading

**User Story:** As a coach, I want to load videos and mesh models into the viewer, so that I can begin analysis.

#### Acceptance Criteria

1. WHEN the user selects a video file THEN the system SHALL load and display it in the appropriate view
2. WHEN the user selects a mesh model THEN the system SHALL load and render it in the 3D scene
3. WHEN a media item loads THEN the system SHALL display it with a loading indicator during processing
4. WHEN loading completes THEN the system SHALL display the media and enable playback controls
5. WHEN loading fails THEN the system SHALL display an error message and allow the user to retry

### Requirement 12: UI Layout and Controls

**User Story:** As a coach, I want an intuitive interface with clear controls, so that I can efficiently navigate the viewer.

#### Acceptance Criteria

1. WHEN the viewer loads THEN the system SHALL display the 3D scene prominently in the center
2. WHEN the user looks for controls THEN the system SHALL display playback controls below the 3D scene
3. WHEN the user looks for view options THEN the system SHALL display camera preset buttons in an accessible location
4. WHEN the user looks for media tabs THEN the system SHALL display them at the top of the viewer
5. WHEN the user looks for settings THEN the system SHALL display mesh customization options in a side panel or collapsible menu

### Requirement 13: Onform Design Reference

**User Story:** As a coach, I want the interface to follow sports analysis best practices, so that the tool feels professional and familiar.

#### Acceptance Criteria

1. WHEN the user views the interface THEN the system SHALL follow Onform's design patterns for sports analysis tools
2. WHEN the user interacts with controls THEN the system SHALL provide clear visual feedback
3. WHEN the user navigates between views THEN the system SHALL maintain visual consistency
4. WHEN the user customizes display options THEN the system SHALL organize controls logically and intuitively
5. WHEN the right sidebar is removed THEN the system SHALL maximize the 3D scene viewing area

### Requirement 14: Zoom Controls

**User Story:** As a coach, I want to zoom in and out of the 3D scene, so that I can focus on specific body parts or see the full model.

#### Acceptance Criteria

1. WHEN the user presses the plus (+) hotkey THEN the system SHALL zoom in toward the model
2. WHEN the user presses the minus (-) hotkey THEN the system SHALL zoom out away from the model
3. WHEN the user scrolls the mouse wheel THEN the system SHALL adjust zoom level smoothly
4. WHEN zoom is adjusted THEN the system SHALL maintain the model's center position
5. WHEN the user switches between views THEN the system SHALL preserve the zoom level

### Requirement 15: Timeline Scrubbing with Mouse Wheel

**User Story:** As a coach, I want to scrub through the timeline using the mouse wheel, so that I can quickly navigate through frames.

#### Acceptance Criteria

1. WHEN the user scrolls the mouse wheel forward THEN the system SHALL advance the playback forward in time
2. WHEN the user scrolls the mouse wheel backward THEN the system SHALL rewind the playback backward in time
3. WHEN the user scrolls the mouse wheel THEN the system SHALL update both video and mesh to the new frame
4. WHEN the user scrolls rapidly THEN the system SHALL respond smoothly without lag
5. WHEN the user is hovering over the timeline THEN the system SHALL prioritize timeline scrubbing over zoom

### Requirement 16: Toast Notifications for Model Loading

**User Story:** As a coach, I want to receive feedback when models are added, so that I know the upload was successful.

#### Acceptance Criteria

1. WHEN a model is successfully added to the viewer THEN the system SHALL display a toast notification
2. WHEN the toast notification appears THEN the system SHALL show a success message with the model name
3. WHEN the notification displays THEN the system SHALL automatically dismiss it after 3-5 seconds
4. WHEN the user loads multiple models THEN the system SHALL display a separate notification for each
5. WHEN a model fails to load THEN the system SHALL display an error toast notification

### Requirement 17: Data Structure for Synchronized Video and Mesh

**User Story:** As a developer, I want a unified data structure that stores video and mesh data together, so that they can be displayed and synchronized at the same framerate.

#### Acceptance Criteria

1. WHEN a video is uploaded THEN the system SHALL store the original video file alongside the extracted mesh data
2. WHEN mesh data is extracted THEN the system SHALL calculate frame-to-frame timing to match video framerate
3. WHEN data is stored THEN the system SHALL use a unified structure that contains both video and mesh keyframes
4. WHEN the frontend loads data THEN the system SHALL receive mesh data with frame indices that correspond to video frames
5. WHEN playback occurs THEN the system SHALL use the unified structure to maintain frame-level synchronization

### Requirement 18: 2D Video Overlay Feature

**User Story:** As a coach, I want to overlay 2D video on top of 3D mesh models, so that I can compare the original footage with the extracted pose data.

#### Acceptance Criteria

1. WHEN the user selects overlay mode THEN the system SHALL display a 2D video on the left side
2. WHEN overlay mode is active THEN the system SHALL display a 3D mesh model overlaid on the video
3. WHEN the user adjusts mesh opacity THEN the system SHALL make the mesh more or less transparent relative to the video
4. WHEN the user plays the overlay THEN the system SHALL synchronize video and mesh playback frame-by-frame
5. WHEN the user switches from overlay mode THEN the system SHALL preserve the mesh opacity setting for other views
