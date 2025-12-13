# Requirements Document: LLM-Powered Phase-Based Video Coaching System

## Introduction

The LLM-Powered Phase-Based Video Coaching System analyzes user-uploaded snowboarding videos using multimodal LLMs to provide real-time, personalized coaching feedback. The system combines phase-based trick structure (setup, windup, throw, lip timing, takeoff) with LLM video analysis. Rather than relying on pre-trained classifiers, the system uses an LLM to extract structured text descriptions from video frames, reason about body position and motion within each phase, and compare observations against a phase-specific knowledge base of snowboarding techniques. The system provides phase-by-phase analysis with frame-level timestamps, identifies technical issues at each phase, and recommends specific corrections grounded in the user's actual performance.

## Glossary

- **Trick Phase**: A distinct stage in trick execution (setup carve, windup, throw, lip timing, momentum/body position off takeoff)
- **Phase Requirement**: A specific technical requirement that must be executed correctly during a phase (e.g., upper body lead, toeside edge, stacked position)
- **Video Frame**: A single image extracted from the uploaded video at regular intervals
- **Pose Estimation**: Detection of skeletal keypoints (joints) in a frame using lightweight models like MediaPipe or MoveNet
- **Frame Description**: Structured text extracted by the LLM describing what it observes in a frame (body position, edge control, rotation, etc.)
- **Motion Inference**: LLM reasoning about movement patterns across multiple frames within a phase
- **Phase Analysis**: LLM evaluation of whether phase requirements are met in the user's video
- **Knowledge Base**: Text-based corpus of snowboarding techniques organized by trick and phase, including common mistakes, corrections, and progressions
- **Coaching Feedback**: Natural language response from the LLM identifying issues at each phase and recommending corrections with timestamps
- **Extraction Tool**: MCP-style utility function that provides raw data to the LLM (frames, pose data, edge detection, etc.)
- **Phase Detector**: Tool that identifies which phase the rider is in at each frame

## Requirements

### Requirement 1: Video Upload and Frame Extraction

**User Story:** As a rider, I want to upload a video of my trick attempt, so that the system can analyze my performance by phase.

#### Acceptance Criteria

1. WHEN a user uploads a video file THEN the system SHALL accept MP4, MOV, and WebM formats
2. WHEN a video is uploaded THEN the system SHALL extract frames at 4 FPS (frames per second) and store them temporarily
3. WHEN frames are extracted THEN the system SHALL preserve frame timestamps relative to the original video
4. WHEN frame extraction completes THEN the system SHALL return the total frame count, video duration, and estimated phase boundaries

### Requirement 1.5: Trick and Phase Identification

**User Story:** As a coach, I want to know which trick the rider is attempting and which phase they're in at each frame, so that I can provide phase-specific feedback.

#### Acceptance Criteria

1. WHEN a user uploads a video THEN the system SHALL ask the user to specify the trick being attempted
2. WHEN the trick is specified THEN the system SHALL load phase requirements for that trick (setup, windup, throw, lip timing, takeoff)
3. WHEN analyzing frames THEN the system SHALL estimate which phase the rider is in at each frame
4. WHEN phase boundaries are unclear THEN the system SHALL ask the LLM to identify phase transitions based on body position and motion

### Requirement 2: Pose and Motion Extraction

**User Story:** As a coach, I want to understand the rider's body position and movement, so that I can diagnose technical issues.

#### Acceptance Criteria

1. WHEN frames are extracted THEN the system SHALL run pose estimation on each frame using MediaPipe or MoveNet
2. WHEN pose estimation completes THEN the system SHALL return skeletal keypoints (joints) with confidence scores
3. WHEN analyzing motion THEN the system SHALL track keypoint positions across consecutive frames to infer movement direction and speed
4. WHEN pose data is unavailable THEN the system SHALL gracefully degrade and continue analysis with visual frame descriptions

### Requirement 3: Video Feature Extraction

**User Story:** As the system, I want to extract snowboarding-specific features from frames, so that the LLM has rich context for reasoning.

#### Acceptance Criteria

1. WHEN analyzing a frame THEN the system SHALL estimate board angle relative to the horizon
2. WHEN analyzing a frame THEN the system SHALL detect whether the rider is on toe edge or heel edge
3. WHEN analyzing a frame THEN the system SHALL estimate slope grade from visual cues
4. WHEN analyzing motion THEN the system SHALL calculate stability metrics (wobbliness, center of mass drift) across frames

### Requirement 4: LLM Frame Analysis

**User Story:** As an LLM, I want to receive structured frame data and knowledge context, so that I can reason about what I observe.

#### Acceptance Criteria

1. WHEN the system sends a frame to the LLM THEN it SHALL include the frame image, pose keypoints, extracted features, and relevant knowledge base context
2. WHEN the LLM analyzes a frame THEN it SHALL produce a structured description of body position, edge control, rotation, and timing
3. WHEN the LLM analyzes multiple frames THEN it SHALL infer motion patterns and identify when issues occur
4. WHEN the LLM identifies an issue THEN it SHALL reference specific frame numbers and timestamps where the issue is visible

### Requirement 5: Phase-Specific Knowledge Base Integration

**User Story:** As a coach, I want the LLM to reference phase-specific coaching knowledge, so that feedback is tailored to each phase of the trick.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL load the phase-based knowledge base organized by trick and phase
2. WHEN analyzing a video THEN the system SHALL retrieve phase requirements, common problems, and fixes for each phase
3. WHEN the LLM analyzes a phase THEN it SHALL have access to phase-specific knowledge base sections via RAG or context injection
4. WHEN the LLM provides feedback THEN it SHALL cite specific phase requirements and techniques from the knowledge base
5. WHEN the knowledge base is updated THEN the system SHALL make new content available to the LLM within 5 minutes

### Requirement 6: Phase-Specific Coaching Feedback Generation

**User Story:** As a rider, I want specific, actionable feedback about what went wrong in each phase and how to fix it, so that I can improve systematically.

#### Acceptance Criteria

1. WHEN video analysis completes THEN the system SHALL return coaching feedback organized by phase (setup, windup, throw, lip timing, takeoff)
2. WHEN returning feedback for a phase THEN the system SHALL identify which phase requirements were met and which were not
3. WHEN a phase requirement is not met THEN the system SHALL identify the root cause and provide a specific correction
4. WHEN returning feedback THEN the system SHALL include frame timestamps showing where each issue occurs within the phase
5. WHEN returning feedback THEN the system SHALL provide specific corrections with reasoning grounded in the rider's actual performance

### Requirement 7: Multi-Frame Reasoning

**User Story:** As the LLM, I want to reason across multiple frames, so that I can understand motion and timing issues.

#### Acceptance Criteria

1. WHEN analyzing a video THEN the system SHALL provide the LLM with frame sequences (e.g., frames 10-50 for the takeoff phase)
2. WHEN the LLM reasons about motion THEN it SHALL compare body position across frames to infer rotation speed, edge control consistency, and timing
3. WHEN the LLM identifies a timing issue THEN it SHALL explain which frames show the correct timing and which show the error
4. WHEN the LLM analyzes a trick THEN it SHALL break down the analysis by phase (setup, windup, throw, lip timing, takeoff)

### Requirement 8: Cost Optimization

**User Story:** As an operator, I want to minimize API costs while maintaining coaching quality, so that the system remains economically viable.

#### Acceptance Criteria

1. WHEN analyzing a video THEN the system SHALL use frame sampling strategies to reduce the number of frames sent to the LLM
2. WHEN the LLM identifies an issue THEN the system SHALL focus detailed analysis on the problematic frames rather than the entire video
3. WHEN analyzing a long video THEN the system SHALL batch frame analysis to reduce API calls
4. WHEN a video is analyzed THEN the system SHALL log token usage and provide cost estimates to the user

### Requirement 9: Error Handling and Fallbacks

**User Story:** As a user, I want the system to handle errors gracefully, so that I get useful feedback even when something goes wrong.

#### Acceptance Criteria

1. WHEN video upload fails THEN the system SHALL return a clear error message and allow retry
2. WHEN pose estimation fails on some frames THEN the system SHALL continue analysis with available data and note which frames were skipped
3. WHEN the LLM API is unavailable THEN the system SHALL return a user-friendly error and suggest retry timing
4. WHEN frame extraction times out THEN the system SHALL return partial results with frames processed so far

### Requirement 10: Video Metadata and Caching

**User Story:** As the system, I want to cache extracted frames and pose data, so that repeated analysis is fast and cheap.

#### Acceptance Criteria

1. WHEN frames are extracted THEN the system SHALL cache them with a 24-hour TTL
2. WHEN pose data is computed THEN the system SHALL cache it with a 24-hour TTL
3. WHEN a user re-analyzes the same video THEN the system SHALL reuse cached frames and pose data
4. WHEN cache is used THEN the system SHALL note this in the response metadata

### Requirement 11: Chat-Style Coaching Interface

**User Story:** As a rider, I want to have a conversation with the coach about my video, so that I can ask follow-up questions and get clarifications.

#### Acceptance Criteria

1. WHEN a user uploads a video THEN the system SHALL return initial coaching feedback in a chat message
2. WHEN a user asks a follow-up question THEN the system SHALL reference the video analysis and provide context-aware answers
3. WHEN a user asks about a specific frame THEN the system SHALL retrieve that frame and provide detailed analysis
4. WHEN a user requests a drill or progression THEN the system SHALL recommend next steps based on the identified issues

### Requirement 12: Detailed Biomechanical Metrics

**User Story:** As a coach, I want detailed biomechanical data about the rider's performance, so that I can provide precise, actionable feedback on specific technical issues.

#### Acceptance Criteria

1. WHEN analyzing a video THEN the system SHALL extract head gaze direction at each frame
2. WHEN analyzing a video THEN the system SHALL detect rider stance (regular or goofy)
3. WHEN analyzing a video THEN the system SHALL count total rotations and rotation direction
4. WHEN analyzing a video THEN the system SHALL estimate jump size and approach speed
5. WHEN analyzing a video THEN the system SHALL measure leg bend and detect straight-leg pops
6. WHEN analyzing a video THEN the system SHALL track arm position before and after takeoff
7. WHEN analyzing a video THEN the system SHALL detect spin control and counter-rotation on landing
8. WHEN analyzing a video THEN the system SHALL measure windup duration and momentum transfer efficiency
9. WHEN analyzing a video THEN the system SHALL analyze setup carve arc quality and consistency
10. WHEN analyzing a video THEN the system SHALL detect takeoff openness and body alignment

### Requirement 13: Performance and Responsiveness

**User Story:** As a user, I want fast feedback on my videos, so that I can iterate quickly during practice sessions.

#### Acceptance Criteria

1. WHEN a video is uploaded THEN frame extraction SHALL complete within 30 seconds for a 60-second video
2. WHEN frames are extracted THEN pose estimation SHALL complete within 60 seconds for 240 frames
3. WHEN analysis is complete THEN the system SHALL return initial coaching feedback within 120 seconds total
4. WHEN a user asks a follow-up question THEN the system SHALL respond within 10 seconds

</content>
</invoke>