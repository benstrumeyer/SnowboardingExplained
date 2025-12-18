# Requirements Document: Pose Estimation Service with AWS Lambda

## Introduction

The Pose Estimation Service is a distributed system that extracts skeletal keypoints from snowboarding video frames using MediaPipe, enabling accurate body position analysis without LLM overhead. The service separates pose detection (Python/AWS Lambda) from coaching analysis (Node.js backend), allowing independent scaling and cost optimization. A single Gemini LLM call synthesizes pose data with coaching knowledge to provide real-time feedback.

## Glossary

- **Pose Estimation**: Detection of 33 skeletal keypoints (joints) from a video frame using MediaPipe
- **Keypoint**: A detected body joint with x, y coordinates and confidence score (0-1)
- **MediaPipe**: Google's open-source pose detection framework
- **AWS Lambda**: Serverless compute service for running the Python pose detection function
- **Frame**: A single image extracted from a video at a specific timestamp
- **Confidence Score**: Probability (0-1) that a detected keypoint is accurate
- **Pose Data**: JSON object containing all 33 keypoints with coordinates and confidence scores

## Requirements

### Requirement 1

**User Story:** As a backend developer, I want to offload pose estimation to a separate Python service, so that the Node.js backend stays dependency-free and deployable to AWS without native compilation issues.

#### Acceptance Criteria

1. WHEN the Node.js backend receives a video upload THEN the backend SHALL extract frames and send them to the Python pose service without blocking
2. WHEN the Python pose service receives a frame image THEN the service SHALL return pose keypoints as JSON within 500ms
3. WHEN the pose service is deployed to AWS Lambda THEN it SHALL initialize and process frames without requiring Visual Studio or native build tools
4. WHEN the Node.js backend calls the pose service THEN the backend SHALL handle timeouts and retry failed requests gracefully

### Requirement 2

**User Story:** As a system architect, I want the pose service to be independently deployable, so that I can scale pose detection separately from the coaching API.

#### Acceptance Criteria

1. WHEN the Python pose service is packaged THEN it SHALL be containerizable as a Docker image for AWS Lambda
2. WHEN the service is deployed to Lambda THEN it SHALL auto-scale based on concurrent frame processing requests
3. WHEN the Node.js backend is deployed THEN it SHALL not require the Python service to be running (graceful degradation)
4. WHEN the pose service is updated THEN the Node.js backend SHALL continue functioning without redeployment

### Requirement 3

**User Story:** As a performance engineer, I want pose estimation to be fast and accurate, so that users get real-time feedback without waiting.

#### Acceptance Criteria

1. WHEN a frame is sent to the pose service THEN the service SHALL detect all 33 MediaPipe keypoints with confidence scores
2. WHEN keypoints are detected THEN the service SHALL return coordinates in pixel coordinates matching the frame dimensions
3. WHEN a frame contains a snowboarder in winter gear THEN the service SHALL achieve 70%+ accuracy on major joints (shoulders, hips, knees, ankles)
4. WHEN processing a frame THEN the service SHALL complete within 500ms including model loading and inference
5. WHEN keypoints are returned THEN the service SHALL include eye/head keypoints (nose, left_eye, right_eye, left_ear, right_ear) for gaze detection
6. WHEN keypoints are returned THEN the service SHALL include all arm keypoints (shoulders, elbows, wrists, pinkies, index, thumbs) for arm momentum analysis
7. WHEN keypoints are returned THEN the service SHALL include all leg keypoints (hips, knees, ankles, heels, foot_index) for leg bend and edge detection

### Requirement 4

**User Story:** As a mobile user, I want to see pose visualization on my video with frame navigation, so that I can understand what the system detected at each moment of the trick.

#### Acceptance Criteria

1. WHEN pose keypoints are returned from the service THEN the Node.js backend SHALL draw skeleton lines connecting related joints on the frame
2. WHEN skeleton lines are drawn THEN the backend SHALL composite them as an SVG overlay on the original frame image
3. WHEN the visualization is complete THEN the backend SHALL return the annotated frame as base64 PNG to the mobile app
4. WHEN confidence scores are low THEN the backend SHALL only draw keypoints with confidence > 0.3
5. WHEN gaze direction is needed THEN the backend SHALL draw an arrow from the rider's eyes (nose keypoint) pointing in the direction they are looking
6. WHEN the arrow is drawn THEN the backend SHALL use eye/head keypoints to calculate gaze direction relative to body orientation
7. WHEN the visualization is rendered THEN the backend SHALL draw all keypoints with color coding: green for high confidence (>0.7), yellow for medium (0.3-0.7), red for low (<0.3)
8. WHEN the snowboard is visible THEN the backend SHALL detect and outline the snowboard with a colored bounding box or polygon
9. WHEN the mobile app receives annotated frames THEN the app SHALL display them in a carousel with Previous/Next buttons
10. WHEN the user clicks Previous/Next THEN the app SHALL navigate between frames and display the current frame number and timestamp
11. WHEN a frame is displayed THEN the app SHALL show the frame index (e.g., "Frame 3 of 10") and timestamp in milliseconds

### Requirement 5

**User Story:** As a coach AI, I want pose data from multiple frames, so that I can analyze motion and provide comprehensive feedback using MCP tools.

#### Acceptance Criteria

1. WHEN a video is uploaded THEN the backend SHALL extract 10 key frames (evenly spaced or user-selected)
2. WHEN frames are extracted THEN the backend SHALL send all 10 frames to the pose service in parallel
3. WHEN pose data is returned for all frames THEN the backend SHALL batch the pose data with frame images and send to Gemini LLM
4. WHEN the LLM receives pose data THEN it SHALL call MCP tools to extract snowboarding-specific features:
   - `detect_stance` - identify regular vs switch stance
   - `detect_body_stack` - assess weight distribution and alignment
   - `measure_leg_bend` - quantify knee bend angles
   - `detect_upper_body_rotation` - measure upper body lead/follow
   - `detect_lower_body_rotation` - measure lower body lead/follow
   - `detect_edge` - identify toe vs heel edge engagement
   - `detect_arm_momentum` - assess arm control and momentum carry-through
   - `detect_spot_position` - determine where rider is looking (gaze direction)
   - `detect_takeoff_openness` - assess body position at takeoff
   - `detect_spin_control` - measure rotation control on landing
5. WHEN MCP tools process pose data THEN they SHALL return structured analysis that the LLM uses to generate coaching feedback
6. WHEN MCP tools are called THEN the backend SHALL log each tool call with:
   - Tool name and parameters
   - Frame number(s) analyzed
   - Result returned by the tool
   - Timestamp of the call
7. WHEN analysis is complete THEN the backend SHALL return a detailed analysis report including:
   - All MCP tool calls made (with parameters and results)
   - State transitions detected (e.g., pre-takeoff → airborne → landing)
   - Confidence scores for each analysis
   - Logs of the analysis process

### Requirement 6

**User Story:** As a coach, I want to track snowboard rotation, so that I can analyze trick execution and provide feedback on board control.

#### Acceptance Criteria

1. WHEN a frame is analyzed THEN the backend SHALL detect the snowboard outline and extract key points (nose, tail, edges)
2. WHEN snowboard points are detected THEN the backend SHALL return coordinates for nose tip, tail tip, and center point
3. WHEN multiple frames are processed THEN the backend SHALL track snowboard rotation angle between frames
4. WHEN snowboard rotation is calculated THEN the backend SHALL call MCP tools:
   - `count_rotations` - count full rotations and measure rotation speed
   - `detect_rotation_direction` - identify frontside vs backside rotation
   - `measure_snap_intensity` - quantify snap power and duration
   - `measure_windup_duration` - track windup timing before snap
   - `detect_momentum_transfer` - assess momentum carry-through off takeoff
5. WHEN snowboard visualization is rendered THEN the backend SHALL draw the snowboard outline with nose and tail labeled

### Requirement 7

**User Story:** As a coach, I want to understand jump timing, so that I can provide feedback on takeoff, apex, and landing phases.

#### Acceptance Criteria

1. WHEN a frame is analyzed THEN the backend SHALL detect the jump terrain outline (lip, landing slope)
2. WHEN jump features are detected THEN the backend SHALL classify the frame as pre-takeoff, airborne, or landing phase
3. WHEN the rider's position is known THEN the backend SHALL calculate distance from jump features to determine phase timing
4. WHEN phase timing is determined THEN the backend SHALL call MCP tools:
   - `detect_phase_transition` - identify which phase the rider is in
   - `get_phase_requirements` - retrieve phase-specific requirements
   - `get_phase_problems` - get common problems for this phase
   - `measure_snap_timing` - assess if snap carries momentum through lip
   - `detect_compromised_position` - detect if rider is wound up too long
5. WHEN phase analysis is complete THEN the backend SHALL pass phase context to the LLM for phase-specific coaching

### Requirement 8

**User Story:** As a mobile user, I want to see detailed analysis of how the system extracted features from the video, so that I can understand the coaching feedback.

#### Acceptance Criteria

1. WHEN analysis is complete THEN the mobile app SHALL display a detailed analysis panel below the frame carousel
2. WHEN the user views a frame THEN the analysis panel SHALL show:
   - Current frame number and timestamp
   - Detected phase (pre-takeoff, airborne, landing, etc.)
   - All MCP tool results for this frame (e.g., stance, edge, leg bend)
   - Confidence scores for each detection
3. WHEN the user scrolls through frames THEN the analysis panel SHALL update to show data for the current frame
4. WHEN the user wants to see the full analysis log THEN the app SHALL display:
   - Complete list of all MCP tool calls made during analysis
   - Parameters passed to each tool
   - Results returned by each tool
   - State transitions detected across all frames
   - Timestamps and processing times
5. WHEN the analysis log is displayed THEN it SHALL be formatted as readable text with clear sections for each phase

### Requirement 9

**User Story:** As a developer, I want clear error handling and logging, so that I can debug issues in production.

#### Acceptance Criteria

1. WHEN the pose service fails to process a frame THEN the backend SHALL log the error with frame ID and error details
2. WHEN the pose service times out THEN the backend SHALL retry up to 2 times before returning an error to the user
3. WHEN pose detection confidence is low THEN the backend SHALL log a warning with the frame ID and average confidence score
4. WHEN the visualization fails THEN the backend SHALL return a meaningful error message to the mobile app
5. WHEN the mobile app receives analysis data THEN it SHALL display any errors or warnings in the analysis panel
