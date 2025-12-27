# Requirements: Frame Interpolation for Missing Poses

## Introduction

When pose detection fails to extract poses for all video frames (e.g., 90 frames extracted from 140 total frames), the mesh playback becomes jerky and incomplete. This spec defines requirements for interpolating missing pose frames to create smooth, continuous motion.

## Glossary

- **Source Frame**: A frame where pose detection successfully extracted keypoints and mesh data
- **Missing Frame**: A frame between two source frames where pose detection failed
- **Interpolated Frame**: A synthetically generated frame created by interpolating between adjacent source frames
- **Keypoint**: A 2D/3D joint position (e.g., shoulder, elbow, wrist)
- **Mesh Data**: 3D vertex positions and face connectivity for skeleton visualization
- **Frame Gap**: The number of missing frames between two consecutive source frames

## Requirements

### Requirement 1: Identify Missing Frames

**User Story:** As a system, I want to identify which frames are missing pose data, so that I can interpolate them.

#### Acceptance Criteria

1. WHEN mesh data is loaded, THE system SHALL identify all frame indices that have pose data
2. WHEN comparing video frame count to mesh frame count, THE system SHALL calculate which frame indices are missing
3. WHEN frame gaps are identified, THE system SHALL log the gap size and location for debugging
4. THE system SHALL handle edge cases where frames are missing at the start or end of the video

### Requirement 2: Interpolate Keypoints Between Source Frames

**User Story:** As a developer, I want keypoints to be interpolated between source frames, so that missing frames have smooth joint positions.

#### Acceptance Criteria

1. WHEN a missing frame is between two source frames, THE system SHALL interpolate each keypoint's position using linear interpolation
2. WHEN interpolating, THE system SHALL calculate the interpolation factor based on frame position within the gap
3. FOR ALL keypoints, THE system SHALL interpolate x, y, z coordinates independently
4. WHEN interpolating confidence values, THE system SHALL use the minimum confidence of the two source frames
5. THE interpolated keypoints SHALL maintain the same keypoint names and indices as source frames

### Requirement 3: Interpolate Mesh Vertices

**User Story:** As a developer, I want mesh vertices to be interpolated between source frames, so that the 3D skeleton moves smoothly.

#### Acceptance Criteria

1. WHEN a missing frame is between two source frames, THE system SHALL interpolate mesh vertex positions
2. WHEN interpolating vertices, THE system SHALL use the same interpolation factor as keypoints
3. FOR ALL vertices, THE system SHALL interpolate x, y, z coordinates independently
4. WHEN source frames have different vertex counts, THE system SHALL use the source frame with more vertices as reference
5. THE interpolated mesh data SHALL maintain face connectivity from the source frames

### Requirement 4: Handle Frame Gaps of Various Sizes

**User Story:** As a developer, I want the system to handle gaps of any size, so that interpolation works for both small and large missing frame sequences.

#### Acceptance Criteria

1. WHEN a gap contains 1 missing frame, THE system SHALL interpolate between the two adjacent source frames
2. WHEN a gap contains multiple missing frames, THE system SHALL interpolate each frame sequentially
3. WHEN a gap is larger than a threshold (e.g., 10 frames), THE system SHALL log a warning
4. WHEN a gap is at the start of the video, THE system SHALL duplicate the first source frame for all missing frames before it
5. WHEN a gap is at the end of the video, THE system SHALL duplicate the last source frame for all missing frames after it

### Requirement 5: Preserve Mesh Data Integrity

**User Story:** As a developer, I want interpolated frames to maintain data integrity, so that the mesh renders correctly.

#### Acceptance Criteria

1. WHEN interpolating, THE system SHALL preserve mesh face connectivity from source frames
2. WHEN interpolating, THE system SHALL preserve skeleton structure and joint relationships
3. WHEN interpolating, THE system SHALL ensure all vertices have valid 3D coordinates
4. WHEN interpolating, THE system SHALL maintain consistent data types and formats with source frames
5. THE interpolated frames SHALL pass validation checks for mesh data completeness

### Requirement 6: Maintain Frame Synchronization

**User Story:** As a developer, I want interpolated frames to stay synchronized with video playback, so that mesh matches video timing.

#### Acceptance Criteria

1. WHEN frames are interpolated, THE system SHALL assign correct frame numbers to interpolated frames
2. WHEN frames are interpolated, THE system SHALL calculate correct timestamps based on video FPS
3. FOR ALL interpolated frames, THE timestamp SHALL be consistent with frame index and FPS
4. WHEN playback advances by one frame, THE system SHALL display the correct interpolated frame
5. THE frame sequence SHALL be continuous with no gaps or duplicates

### Requirement 7: Optimize Performance

**User Story:** As a developer, I want interpolation to be fast, so that mesh data loads quickly.

#### Acceptance Criteria

1. WHEN interpolating frames, THE system SHALL complete in less than 1 second for typical videos
2. WHEN interpolating, THE system SHALL use efficient linear interpolation (no complex algorithms)
3. WHEN storing interpolated frames, THE system SHALL not duplicate mesh data unnecessarily
4. WHEN retrieving frames, THE system SHALL interpolate on-demand rather than pre-computing all frames
5. THE system SHALL cache interpolation results to avoid recalculating the same frames

### Requirement 8: Provide Interpolation Metadata

**User Story:** As a developer, I want to know which frames are interpolated, so that I can debug and validate the data.

#### Acceptance Criteria

1. WHEN a frame is interpolated, THE system SHALL mark it with an `interpolated: true` flag
2. WHEN a frame is interpolated, THE system SHALL store the indices of the source frames used
3. WHEN storing mesh data, THE system SHALL include interpolation statistics (count, percentage)
4. WHEN retrieving frames, THE system SHALL provide interpolation metadata for debugging
5. THE system SHALL log all interpolation operations for audit trails

## Implementation Notes

- Interpolation should happen during mesh data retrieval, not during storage
- Use linear interpolation for simplicity and performance
- Handle edge cases (start/end of video, large gaps)
- Maintain frame synchronization with video playback
- Mark interpolated frames for debugging and validation
