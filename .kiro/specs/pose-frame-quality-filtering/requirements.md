# Requirements: Pose Frame Quality Filtering

## Introduction

This feature improves pose detection quality by filtering out low-confidence frames, detecting and removing off-screen rider frames, and interpolating between good frames to eliminate jittery motion. The goal is to provide smooth, accurate mesh overlay that stays in sync with the rider throughout the video.

## Glossary

- **Confidence Score**: A value (0-1) indicating how confident the pose detector is about a keypoint's position
- **Keypoint**: A detected joint position (e.g., shoulder, elbow, knee) with x, y coordinates and confidence
- **Off-Screen**: When the rider leaves the video frame boundaries
- **Outlier Frame**: A frame whose pose deviates significantly from neighboring frames
- **Interpolation**: Estimating pose values between two good frames to fill gaps

## Requirements

### Requirement 1: Filter Low-Confidence Frames

**User Story:** As a user, I want frames with poor pose detection to be removed, so that I don't see incorrect mesh positions.

#### Acceptance Criteria

1. WHEN a frame has average keypoint confidence below 0.6, THE system SHALL mark it for removal
2. WHEN a frame is marked for removal, THE system SHALL not display the mesh for that frame
3. WHEN multiple consecutive frames are marked for removal, THE system SHALL interpolate between the last good frame and next good frame
4. THE system SHALL preserve frame indices so video playback remains synchronized

### Requirement 2: Detect and Remove Off-Screen Rider Frames

**User Story:** As a user, I want frames where the rider is off-screen to be completely removed, so that I don't see a flat mesh at the end of videos.

#### Acceptance Criteria

1. WHEN keypoints are clustered at image boundaries (within 5% of edges), THE system SHALL mark the frame as off-screen
2. WHEN average keypoint confidence is below 0.3, THE system SHALL mark the frame as off-screen
3. WHEN a frame is marked as off-screen, THE system SHALL remove it entirely from the sequence
4. WHEN consecutive off-screen frames are detected, THE system SHALL remove all of them as a contiguous block

### Requirement 3: Interpolate Between Good Frames

**User Story:** As a user, I want smooth motion between frames, so that the mesh doesn't jitter or jump between positions.

#### Acceptance Criteria

1. WHEN a frame is identified as an outlier (deviates >30% from neighbors), THE system SHALL interpolate its pose from surrounding frames
2. WHEN interpolating, THE system SHALL use linear interpolation for keypoint positions
3. WHEN a frame is interpolated, THE system SHALL mark it as interpolated for debugging
4. WHEN consecutive outliers exist, THE system SHALL interpolate across the gap using the nearest good frames

### Requirement 4: Maintain Frame Synchronization

**User Story:** As a user, I want the mesh to stay perfectly synchronized with the video, so that the overlay matches the rider's actual position.

#### Acceptance Criteria

1. WHEN frames are removed or interpolated, THE system SHALL maintain a mapping of original frame indices to processed frame indices
2. WHEN retrieving frame data, THE system SHALL use the original frame index from the video
3. WHEN displaying the mesh, THE system SHALL use the processed (filtered/interpolated) pose data
4. THE system SHALL log all frame modifications for debugging

