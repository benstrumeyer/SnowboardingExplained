# Design Document: Pose Estimation Service with AWS Lambda

## Architecture Overview

The Pose Estimation Service is a local system with three main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Express)                    │
│  - Video upload & frame extraction                              │
│  - Orchestrates pose estimation requests                        │
│  - Synthesizes pose data with LLM coaching                      │
│  - Renders pose visualization overlays                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST (localhost:3001)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Python MediaPipe Service (Local HTTP Server)            │
│  - Receives frame images (base64)                               │
│  - Runs MediaPipe pose detection model                          │
│  - Returns 33 keypoints with confidence scores                  │
│  - Runs on localhost:5000                                       │
└─────────────────────────────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Gemini LLM (Coaching Synthesis)                │
│  - Receives pose data + frame images                            │
│  - Calls MCP tools to extract snowboarding features             │
│  - Generates coaching feedback                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Node.js Backend (Express)

**Responsibilities:**
- Accept video uploads from mobile app
- Extract frames at configurable FPS (default: 4 FPS)
- Orchestrate parallel pose estimation requests to Lambda
- Batch pose data and send to Gemini LLM
- Render pose visualization overlays using Sharp
- Return annotated frames to mobile app

**Key Endpoints:**
- `POST /api/video/upload` - Accept video file
- `POST /api/video/test-pose` - Extract frames and estimate poses
- `GET /api/video/:videoId/frame/:frameNumber` - Get annotated frame

**Dependencies:**
- `ffmpeg` - Frame extraction from video
- `sharp` - Image manipulation and SVG overlay composition
- `axios` - HTTP calls to Lambda and Gemini
- `@google/generative-ai` - Gemini SDK

### 2. Python MediaPipe Service (Local HTTP Server)

**Responsibilities:**
- Receive frame image (base64 encoded)
- Load MediaPipe pose detection model
- Detect 33 skeletal keypoints
- Return keypoints with confidence scores and frame dimensions

**Input Schema:**
```json
{
  "image_base64": "string (base64 encoded PNG/JPG)",
  "frame_number": "number (optional, for logging)"
}
```

**Output Schema:**
```json
{
  "frame_number": "number",
  "frame_width": "number",
  "frame_height": "number",
  "keypoints": [
    {
      "name": "string (e.g., 'nose', 'left_shoulder')",
      "x": "number (pixel coordinate)",
      "y": "number (pixel coordinate)",
      "z": "number (depth, optional)",
      "confidence": "number (0-1)"
    }
  ],
  "processing_time_ms": "number",
  "model_version": "string"
}
```

**MediaPipe Keypoints (33 total):**
- Head: nose, left_eye, right_eye, left_ear, right_ear
- Torso: left_shoulder, right_shoulder, left_hip, right_hip
- Arms: left_elbow, right_elbow, left_wrist, right_wrist, left_pinky, right_pinky, left_index, right_index, left_thumb, right_thumb
- Legs: left_knee, right_knee, left_ankle, right_ankle, left_heel, right_heel, left_foot_index, right_foot_index

**Local Deployment:**
- Flask HTTP server running on localhost:5000
- Started with `python app.py` in `backend/pose-service/`
- Lazy-loads MediaPipe model on first request
- Single-threaded for simplicity (can be upgraded later)

### 3. Node.js Pose Visualization Service

**Responsibilities:**
- Receive pose keypoints from Python service
- Draw skeleton lines connecting joints
- Render gaze direction arrow
- Detect and outline snowboard
- Composite SVG overlay onto original frame
- Return annotated frame as base64 PNG

**Skeleton Connections:**
```
Head: nose → left_eye, nose → right_eye, left_eye → left_ear, right_eye → right_ear
Torso: left_shoulder → right_shoulder, left_shoulder → left_hip, right_shoulder → right_hip, left_hip → right_hip
Arms: left_shoulder → left_elbow → left_wrist, right_shoulder → right_elbow → right_wrist
Legs: left_hip → left_knee → left_ankle, right_hip → right_knee → right_ankle
```

**Gaze Direction:**
- Calculate vector from nose to midpoint between eyes
- Extend vector to create arrow pointing in gaze direction
- Use head rotation (shoulder alignment) to refine direction

**Snowboard Detection:**
- Use lower body keypoints (ankles, heels, foot_index) to estimate snowboard position
- Draw bounding box or polygon around detected snowboard area
- Color: blue or contrasting color to skeleton
- Include nose and tail labels if detectable

**Color Coding:**
- Green: confidence > 0.7 (high confidence)
- Yellow: confidence 0.3-0.7 (medium confidence)
- Red: confidence < 0.3 (low confidence)
- Skip drawing if confidence < 0.3

### 4. Mobile App UI Components

**Frame Carousel Component:**
- Display annotated frame image
- Show frame number and timestamp (e.g., "Frame 3 of 10 | 1250ms")
- Previous/Next buttons to navigate frames
- Smooth transitions between frames

**Analysis Panel Component:**
- Display current frame analysis:
  - Detected phase (pre-takeoff, airborne, landing)
  - MCP tool results (stance, edge, leg bend, etc.)
  - Confidence scores
- Expandable section for full analysis log
- Scrollable text area for detailed logs

**Analysis Log Display:**
- Formatted text showing all MCP tool calls
- Grouped by phase or frame
- Shows parameters and results for each tool
- State transitions highlighted
- Processing times and timestamps

## Data Models

### PoseFrame
```typescript
interface PoseFrame {
  frameNumber: number;
  timestamp: number; // milliseconds
  frameWidth: number;
  frameHeight: number;
  keypoints: Keypoint[];
  processingTimeMs: number;
  modelVersion: string;
}

interface Keypoint {
  name: string; // e.g., 'nose', 'left_shoulder'
  x: number; // pixel coordinate
  y: number; // pixel coordinate
  z?: number; // depth (optional)
  confidence: number; // 0-1
}
```

### VideoAnalysisRequest
```typescript
interface VideoAnalysisRequest {
  videoId: string;
  videoPath: string;
  fps: number; // frames per second to extract
  frameNumbers?: number[]; // specific frames to analyze (if not provided, extract evenly spaced)
}
```

### VideoAnalysisResult
```typescript
interface VideoAnalysisResult {
  videoId: string;
  totalFrames: number;
  analyzedFrames: PoseFrame[];
  visualizations: {
    frameNumber: number;
    timestamp: number; // milliseconds
    annotatedFrameBase64: string; // PNG with skeleton overlay + snowboard outline
  }[];
  analysisLog: AnalysisLog;
  errors: {
    frameNumber: number;
    error: string;
  }[];
}

interface AnalysisLog {
  mcpToolCalls: MCPToolCall[];
  stateTransitions: StateTransition[];
  phaseAnalysis: PhaseAnalysis[];
  summary: string;
}

interface MCPToolCall {
  toolName: string;
  frameNumber: number;
  parameters: Record<string, any>;
  result: Record<string, any>;
  confidence: number;
  timestamp: number;
}

interface StateTransition {
  fromPhase: string;
  toPhase: string;
  frameNumber: number;
  timestamp: number;
  confidence: number;
}

interface PhaseAnalysis {
  phase: string;
  frameRange: { start: number; end: number };
  keyFindings: string[];
  mcpToolResults: Record<string, any>;
}
```

### LLMCoachingRequest
```typescript
interface LLMCoachingRequest {
  videoId: string;
  poseFrames: PoseFrame[];
  frameImages: {
    frameNumber: number;
    imageBase64: string;
  }[];
  trickName?: string; // optional, for phase-specific coaching
}
```

## Correctness Properties

### Pose Estimation Accuracy
- **Property:** Keypoints must be within ±5 pixels of actual joint positions
- **Verification:** Test on labeled snowboarding videos with ground truth annotations
- **Acceptable Accuracy:** 70%+ on major joints (shoulders, hips, knees, ankles) in winter gear

### Visualization Accuracy
- **Property:** Skeleton lines must connect correct joints
- **Verification:** Visual inspection of annotated frames
- **Correctness:** All 33 keypoints must be included in output; skeleton connections must match MediaPipe standard

### Gaze Direction Accuracy
- **Property:** Arrow must point in direction rider is looking
- **Verification:** Compare arrow direction with rider's head position and eye gaze
- **Acceptable Accuracy:** Within ±30 degrees of actual gaze direction

### Performance SLA
- **Property:** Pose estimation must complete within 500ms per frame
- **Verification:** Measure end-to-end latency from request to response
- **Acceptable Performance:** 95th percentile latency < 500ms

### Confidence Score Validity
- **Property:** Confidence scores must correlate with actual accuracy
- **Verification:** Compare confidence scores with ground truth accuracy
- **Acceptable Correlation:** Pearson correlation > 0.7

## Integration Points

### Node.js Backend → Lambda
- **Protocol:** HTTP POST to Lambda function URL
- **Payload:** Frame image as base64 JSON
- **Response:** Pose keypoints as JSON
- **Error Handling:** Retry up to 2 times on timeout; return error to user after 3 failures
- **Timeout:** 10 seconds per request

### Node.js Backend → Gemini LLM
- **Protocol:** Gemini SDK (REST under the hood)
- **Payload:** Pose frames + frame images + MCP tool definitions
- **Response:** Coaching feedback with MCP tool calls
- **Error Handling:** Retry on rate limit (429); return cached response if available
- **Timeout:** 30 seconds per request

### Mobile App → Node.js Backend
- **Protocol:** HTTP POST to `/api/video/test-pose`
- **Payload:** Video file (multipart form data)
- **Response:** Annotated frames + coaching feedback
- **Error Handling:** Return meaningful error messages
- **Timeout:** 60 seconds per request

## Local Development Setup

### Starting the Services

1. **Python MediaPipe Service** (Terminal 1)
   ```bash
   cd SnowboardingExplained/backend/pose-service
   python app.py
   # Runs on localhost:5000
   ```

2. **Node.js Backend** (Terminal 2)
   ```bash
   cd SnowboardingExplained/backend
   npm run dev
   # Runs on localhost:3001
   ```

3. **Mobile App** (Terminal 3)
   ```bash
   cd SnowboardingExplained/backend/mobile
   npm start -- -c --tunnel
   # Connects to backend via ngrok tunnel
   ```

### Environment Configuration

**Backend `.env.local`:**
```
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=10000
```

## Performance Considerations

### Local Development
- **Bottleneck:** Frame extraction (CPU-bound)
- **Optimization:** Extract only key frames (4 FPS default)
- **Monitoring:** Log processing time for each frame

### Python Service
- **Model Loading:** ~2-3 seconds on first request (cached after)
- **Inference:** ~100-200ms per frame on CPU
- **Memory:** ~500MB for model + frame processing

### Node.js Backend
- **Frame Extraction:** ~50-100ms per frame (FFmpeg)
- **Visualization:** ~50-100ms per frame (Sharp)
- **Total:** ~200-400ms per frame end-to-end

## Error Handling Strategy

### Lambda Errors
- **Cold Start Timeout:** Retry with longer timeout
- **Model Loading Failure:** Log error; return 500 to backend
- **Invalid Image:** Return 400 with error message
- **Out of Memory:** Increase Lambda memory allocation

### Node.js Backend Errors
- **Lambda Timeout:** Retry up to 2 times; return error to user
- **Gemini Rate Limit:** Implement exponential backoff; queue requests
- **Frame Extraction Failure:** Log error; skip frame and continue
- **Visualization Failure:** Return error to user with frame number

### Mobile App Errors
- **Upload Failure:** Retry with exponential backoff
- **Timeout:** Show user-friendly error message
- **Invalid Video:** Return validation error

## Testing Strategy

### Unit Tests
- Test pose visualization skeleton connections
- Test gaze direction calculation
- Test confidence score filtering

### Integration Tests
- Test end-to-end flow: upload → extract frames → estimate poses → visualize → return to mobile
- Test error handling: Lambda timeout, Gemini rate limit, invalid video
- Test performance: measure latency for different video sizes

### Load Tests
- Test Lambda with 100+ concurrent requests
- Test Node.js backend with 10+ concurrent video uploads
- Measure end-to-end latency under load

## Future Enhancements

1. **Snowboard Detection:** Add computer vision to detect snowboard outline and track rotation
2. **Jump Terrain Detection:** Detect jump lip and landing slope for phase classification
3. **Caching:** Cache pose results for identical frames to reduce Lambda calls
4. **Batch Processing:** Support batch video uploads for offline analysis
5. **Custom Models:** Fine-tune MediaPipe model on snowboarding-specific data
