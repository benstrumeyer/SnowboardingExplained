# Implementation Tasks: Pose Estimation Service

## Phase 1: Python MediaPipe Service Setup

### Task 1.1: Create Python Pose Service Project Structure
- [ ] Create `SnowboardingExplained/backend/pose-service/` directory
- [ ] Create `requirements.txt` with dependencies:
  - `flask==3.0.0`
  - `mediapipe==0.10.0`
  - `pillow==10.0.0`
  - `numpy==1.24.0`
  - `opencv-python==4.8.0.0`
- [ ] Create `app.py` with Flask HTTP server
- [ ] Create `.gitignore` to exclude model cache and dependencies
- [ ] Create `README.md` with setup instructions

**Acceptance Criteria:**
- [ ] Project structure is clean and organized
- [ ] All dependencies are pinned to specific versions
- [ ] Flask app starts without errors

### Task 1.2: Implement MediaPipe Pose Detection
- [ ] Create `pose_detector.py` module with `PoseDetector` class
- [ ] Implement `__init__` to lazy-load MediaPipe model on first request
- [ ] Implement `detect_pose(image_base64)` method:
  - Decode base64 image to numpy array
  - Run MediaPipe inference
  - Extract 33 keypoints with confidence scores
  - Return structured JSON response
- [ ] Add error handling for invalid images
- [ ] Add logging for debugging

**Acceptance Criteria:**
- [ ] `detect_pose()` returns all 33 keypoints with x, y, confidence
- [ ] Processing time is < 500ms per frame (excluding model load)
- [ ] Handles edge cases: corrupted images, empty images, non-human frames

### Task 1.3: Implement Flask HTTP Server
- [ ] Create `app.py` with Flask application
- [ ] Implement `POST /pose` endpoint:
  - Accept JSON with base64 image
  - Call `PoseDetector.detect_pose()`
  - Return JSON with keypoints, frame dimensions, processing time
- [ ] Add error handling and logging
- [ ] Add CORS headers for cross-origin requests
- [ ] Add health check endpoint `GET /health`

**Acceptance Criteria:**
- [ ] Server accepts HTTP POST requests with base64 image
- [ ] Returns JSON with keypoints, frame dimensions, processing time
- [ ] Handles errors gracefully with meaningful error messages
- [ ] Logs all requests and errors to console
- [ ] Health check endpoint returns 200 OK

### Task 1.4: Test Pose Service Locally
- [ ] Start Flask server: `python app.py`
- [ ] Test with sample snowboarding frames
- [ ] Verify output format matches design spec
- [ ] Measure processing time and optimize if needed
- [ ] Test error handling with invalid images

**Acceptance Criteria:**
- [ ] Flask server runs successfully on localhost:5000
- [ ] Output matches expected JSON schema
- [ ] Processing time < 500ms per frame
- [ ] All 33 keypoints are detected
- [ ] Error handling works correctly

## Phase 2: Node.js Backend Integration

### Task 2.1: Create Pose Estimation Service Module
- [ ] Create `SnowboardingExplained/backend/src/services/lambdaPoseService.ts`
- [ ] Implement `callLambdaPose(frameBase64, frameNumber)` function:
  - Encode frame as base64
  - Make HTTP POST to Lambda endpoint
  - Parse response and return typed `PoseFrame`
  - Implement retry logic (up to 2 retries on timeout)
  - Add error handling and logging
- [ ] Implement `callLambdaPoseParallel(frames)` for batch processing:
  - Send multiple frames to Lambda in parallel
  - Wait for all responses
  - Return array of `PoseFrame` objects
  - Handle partial failures gracefully

**Acceptance Criteria:**
- [ ] Service successfully calls Lambda endpoint
- [ ] Retry logic works on timeout
- [ ] Parallel processing completes faster than sequential
- [ ] Error handling returns meaningful messages

### Task 2.2: Update Pose Visualization Service
- [ ] Update `SnowboardingExplained/backend/src/services/poseVisualization.ts`
- [ ] Implement `drawSkeleton(frame, keypoints)` function:
  - Draw lines connecting skeleton joints
  - Color code by confidence (green > 0.7, yellow 0.3-0.7, red < 0.3)
  - Skip keypoints with confidence < 0.3
- [ ] Implement `drawGazeArrow(frame, keypoints)` function:
  - Calculate gaze direction from eye/head keypoints
  - Draw arrow from nose pointing in gaze direction
  - Use head rotation to refine direction
- [ ] Implement `drawSnowboard(frame, keypoints)` function:
  - Use lower body keypoints (ankles, heels, foot_index) to estimate snowboard position
  - Draw bounding box or polygon around snowboard
  - Label nose and tail if detectable
- [ ] Implement `composeSVGOverlay(frame, skeleton, gaze, snowboard)` function:
  - Create SVG with skeleton lines, gaze arrow, and snowboard outline
  - Composite SVG onto original frame using Sharp
  - Return annotated frame as base64 PNG
- [ ] Add error handling for missing keypoints

**Acceptance Criteria:**
- [ ] Skeleton lines connect correct joints
- [ ] Color coding matches confidence scores
- [ ] Gaze arrow points in reasonable direction
- [ ] Snowboard outline is visible and labeled
- [ ] Annotated frame is valid PNG and can be displayed

### Task 2.3: Create Analysis Log Service
- [ ] Create `SnowboardingExplained/backend/src/services/analysisLogService.ts`
- [ ] Implement `logMCPToolCall(toolName, frameNumber, parameters, result)` function
- [ ] Implement `trackStateTransition(fromPhase, toPhase, frameNumber)` function
- [ ] Implement `generateAnalysisLog(mcpCalls, transitions, phaseAnalysis)` function:
  - Format all MCP tool calls with parameters and results
  - Show state transitions with frame numbers
  - Group analysis by phase
  - Generate human-readable summary
- [ ] Return structured AnalysisLog object

**Acceptance Criteria:**
- [ ] MCP tool calls are logged with all details
- [ ] State transitions are tracked
- [ ] Analysis log is formatted clearly
- [ ] Summary is human-readable

### Task 2.4: Update Video Coach Endpoint
- [ ] Update `SnowboardingExplained/backend/src/server.ts` `/api/video/test-pose` endpoint:
  - Extract frames from uploaded video
  - Call `lambdaPoseService.callLambdaPoseParallel()` for all frames
  - Call `poseVisualization.composeSVGOverlay()` for each frame (with snowboard)
  - Call `analysisLogService.generateAnalysisLog()` to create analysis report
  - Return annotated frames + pose data + analysis log to mobile app
- [ ] Add error handling and logging
- [ ] Add performance monitoring (log processing time)

**Acceptance Criteria:**
- [ ] Endpoint accepts video upload
- [ ] Returns annotated frames with skeleton overlay and snowboard outline
- [ ] Returns detailed analysis log with MCP tool calls
- [ ] Processing completes within 60 seconds for typical video
- [ ] Error messages are meaningful

### Task 2.4: Configure Lambda Endpoint
- [ ] Create environment variable `LAMBDA_POSE_ENDPOINT` in `.env.local`
- [ ] Update `lambdaPoseService.ts` to use environment variable
- [ ] Add validation to ensure endpoint is configured
- [ ] Add fallback error message if endpoint is missing

**Acceptance Criteria:**
- [ ] Lambda endpoint is configurable via environment variable
- [ ] Service validates endpoint on startup
- [ ] Clear error message if endpoint is not configured

## Phase 4: Mobile App Integration

### Task 4.1: Create Frame Carousel Component
- [ ] Create `SnowboardingExplained/backend/mobile/src/components/FrameCarousel.tsx`
- [ ] Implement frame display with annotated image
- [ ] Add Previous/Next buttons for frame navigation
- [ ] Display frame number and timestamp (e.g., "Frame 3 of 10 | 1250ms")
- [ ] Add smooth transitions between frames
- [ ] Handle edge cases (first/last frame)

**Acceptance Criteria:**
- [ ] Carousel displays annotated frames correctly
- [ ] Previous/Next buttons work
- [ ] Frame counter updates correctly
- [ ] Timestamps are displayed accurately

### Task 4.2: Create Analysis Panel Component
- [ ] Create `SnowboardingExplained/backend/mobile/src/components/AnalysisPanel.tsx`
- [ ] Display current frame analysis:
  - Detected phase
  - MCP tool results (stance, edge, leg bend, etc.)
  - Confidence scores
- [ ] Add expandable section for full analysis log
- [ ] Format analysis log as readable text
- [ ] Update panel when frame changes

**Acceptance Criteria:**
- [ ] Analysis panel displays current frame data
- [ ] MCP tool results are formatted clearly
- [ ] Analysis log is expandable and readable
- [ ] Panel updates when navigating frames

### Task 4.3: Update VideoCoachScreen
- [ ] Update `SnowboardingExplained/backend/mobile/src/screens/VideoCoachScreen.tsx`
- [ ] Integrate FrameCarousel component
- [ ] Integrate AnalysisPanel component
- [ ] Add "Test Pose" button (already exists, verify it works)
- [ ] Show loading indicator during processing
- [ ] Show error message if processing fails
- [ ] Pass analysis data to AnalysisPanel

**Acceptance Criteria:**
- [ ] VideoCoachScreen displays carousel and analysis panel
- [ ] Loading indicator shows during processing
- [ ] Error messages are displayed
- [ ] Analysis data flows correctly to components

### Task 4.4: Test Mobile Integration
- [ ] Test video upload from mobile app
- [ ] Test frame carousel navigation
- [ ] Test analysis panel display
- [ ] Test with different video sizes
- [ ] Test error handling on mobile
- [ ] Verify performance on mobile device

**Acceptance Criteria:**
- [ ] Mobile app successfully uploads video
- [ ] Frame carousel works smoothly
- [ ] Analysis panel displays correctly
- [ ] Performance is acceptable on mobile device
- [ ] Error handling works on mobile

## Phase 5: LLM Integration (Future)

### Task 5.1: Batch Pose Data to Gemini
- [ ] Update `SnowboardingExplained/backend/src/services/chatService.ts`
- [ ] Implement `sendPoseDataToLLM(poseFrames, frameImages)` function:
  - Batch pose data with frame images
  - Send to Gemini LLM with MCP tool definitions
  - Parse LLM response and extract MCP tool calls
  - Return coaching feedback
- [ ] Add error handling and logging

**Acceptance Criteria:**
- [ ] Pose data is successfully sent to Gemini
- [ ] LLM returns coaching feedback
- [ ] MCP tool calls are parsed correctly

### Task 5.2: Implement MCP Tool Calls
- [ ] Implement MCP tools in `SnowboardingExplained/backend/mcp-server/src/tools/`
- [ ] Implement `detect_stance`, `detect_body_stack`, `measure_leg_bend`, etc.
- [ ] Each tool should accept pose data and return structured analysis
- [ ] Add caching to avoid redundant computation

**Acceptance Criteria:**
- [ ] All MCP tools are implemented
- [ ] Tools return structured analysis
- [ ] Caching works correctly

### Task 5.3: Generate Coaching Feedback
- [ ] Update LLM prompt to use MCP tool results
- [ ] Generate coaching feedback based on pose analysis
- [ ] Return feedback to mobile app
- [ ] Test with sample videos

**Acceptance Criteria:**
- [ ] Coaching feedback is generated
- [ ] Feedback is relevant and actionable
- [ ] Feedback is displayed on mobile app

## Timeline Estimate

- **Phase 1 (Pose Service Setup):** 1-2 days
- **Phase 2 (Backend Integration):** 2-3 days
- **Phase 3 (Mobile Integration):** 2-3 days
- **Phase 4 (LLM Integration):** 2-3 days (future)

**Total:** 7-11 days (excluding Phase 4)

## Dependencies

- Python 3.11+ installed locally
- Node.js 18+ installed locally
- FFmpeg installed locally
- Sample snowboarding videos for testing

## Success Criteria

- [ ] Pose estimation service runs locally on localhost:5000
- [ ] Node.js backend successfully calls pose service
- [ ] Annotated frames with skeleton overlay are generated
- [ ] Mobile app displays annotated frames
- [ ] End-to-end latency is < 60 seconds for typical video
- [ ] Error handling works for all failure scenarios
