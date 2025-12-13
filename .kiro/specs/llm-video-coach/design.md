# Design Document: LLM-Powered Video Coaching System

## Overview

The LLM-Powered Phase-Based Video Coaching System is a video-first architecture that combines phase-based trick structure with multimodal LLM analysis. The system extracts frames from uploaded videos, uses lightweight pose estimation and heuristic tools to provide structured data, and orchestrates an LLM to reason about body position, motion, and technique within each phase. The LLM compares observations against a phase-specific knowledge base and produces natural language coaching feedback organized by phase, with frame-level timestamps and actionable corrections.

The key insight: the LLM does the reasoning within a phase-based framework. Extraction tools provide raw data (frames, pose keypoints, edge detection, etc.), but the LLM interprets what it means and connects it to phase-specific coaching knowledge. Each phase has specific requirements, common problems, and fixes that guide the analysis.

**Phase Structure:**
1. **Setup Carve**: Rider approaches the feature with edge control and prepares for takeoff. For backside tricks: transitions from heelside to toeside and takes off toeside. For frontside tricks: starts toeside and takes off heelside. Evaluated on form, path shape, and weight balance (slightly shifted toward back foot).
2. **Windup/Snap**: Rider loads the board and executes the rotation snap/throw, initiating upper/lower body separation and committing to the trick.
3. **Grab** (Optional): Rider grabs the board during the trick for style and control. This phase is optional and depends on the trick and rider preference.
4. **Landing**: Rider counter-rotates to control the spin or lands blind depending on the trick, completing the rotation and preparing for the next feature.

**Concurrent Behavior:**
- **Spotting**: Rider tracks the landing zone throughout the trick (asynchronously during windup/snap, grab, and landing phases). Head gaze and visual focus are evaluated continuously rather than as a separate phase.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Mobile App                   │
│              (Video upload, chat interface)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js/Express Backend                     │
│         (Video processing, LLM orchestration)                │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Extraction   │  │ Extraction   │  │ Knowledge    │
│ Tools        │  │ Tools        │  │ Base (RAG)   │
│ (FFmpeg,     │  │ (MediaPipe,  │  │ (Text        │
│ frame cache) │  │ OpenCV)      │  │ corpus)      │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Multimodal LLM (GPT-4V, Claude 3.5)            │
│  (Analyzes frames, reasons about motion, generates feedback)│
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Video Processing Pipeline

**Frame Extraction Service**
- Input: Video file (MP4, MOV, WebM)
- Process: Use FFmpeg to extract frames at 4 FPS
- Output: Frame images stored in temp directory with timestamps
- Caching: Store frames in Redis/disk cache with 24-hour TTL

```typescript
interface FrameExtractionResult {
  frameCount: number;
  videoDuration: number;
  frames: Array<{
    frameNumber: number;
    timestamp: number; // seconds
    imagePath: string;
  }>;
  cacheHit: boolean;
}
```

### 2. Extraction Tools (MCP-Style)

These are utility functions the LLM can call to get structured data from frames:

#### Visual & Frame Data
**Tool: extract_frames**
- Input: video_id, frame_numbers (optional)
- Output: Frame images as base64 or URLs
- Purpose: Provide visual data to LLM

**Tool: detect_head_gaze**
- Input: frame_number
- Output: { direction: "forward" | "down" | "up" | "left" | "right", angle: number, context: string }
- Purpose: Track where rider is looking throughout trick (critical for spotting and commitment)
- Context: Before lip of jump should be looking at takeoff; after takeoff should be spotting for trick or landing

#### Rider Stance & Position
**Tool: pose_estimate**
- Input: frame_number
- Output: Skeletal keypoints with confidence scores (head, shoulders, elbows, hips, knees, ankles)
- Purpose: Give LLM structured body position data

**Tool: detect_stance**
- Input: frame_number
- Output: "regular" | "goofy"
- Purpose: Identify rider's natural stance

**Tool: detect_body_stack**
- Input: frame_number
- Output: { isStacked: boolean, weightDistribution: "forward" | "centered" | "back" | "backfoot", edge: "toeside" | "heelside", combinations: string[], alignment: "aligned" | "misaligned" }
- Purpose: Assess weight positioning, alignment, and foot pressure distribution
- Combinations: Can be combined (e.g., "toeside_forward", "toeside_backfoot", "heelside_centered")

**Tool: measure_leg_bend**
- Input: frame_number
- Output: { leftKneeBend: number, rightKneeBend: number, averageBend: number, isStraightLegs: boolean }
- Purpose: Ensure minimum 10-15% leg bend maintained (critical for shock absorption and control)

**Tool: detect_upper_body_rotation**
- Input: frame_number
- Output: { rotation: "leading" | "following" | "aligned", degreesSeparation: number }
- Purpose: Assess upper/lower body separation with degree calculation
- Why it matters: Upper body should lead to create separation and load the board

**Tool: detect_lower_body_rotation**
- Input: frame_number
- Output: { rotation: "leading" | "following" | "aligned", degreesSeparation: number }
- Purpose: Assess lower body commitment relative to upper body with degree calculation
- Why it matters: Lower body should follow upper body to complete the rotation

#### Board & Edge Control
**Tool: detect_edge**
- Input: frame_number
- Output: "toe_edge" | "heel_edge" | "unknown"
- Purpose: Help LLM understand edge control

**Tool: estimate_board_angle**
- Input: frame_number
- Output: Angle in degrees relative to horizon
- Purpose: Quantify rotation and carving

**Tool: estimate_jump_size**
- Input: frame_range (start, end) - from takeoff to peak
- Output: { estimatedHeight: number, estimatedDistance: number, jumpSize: "small" | "medium" | "large" }
- Purpose: Quantify feature size and rider's commitment

#### Motion & Rotation
**Tool: count_rotations**
- Input: frame_range (start, end)
- Output: { totalRotations: number, rotationDirection: "frontside" | "backside", degreesPerFrame: number }
- Purpose: Track how many full rotations completed

**Tool: detect_rotation_direction**
- Input: frame_range (start, end)
- Output: "frontside" | "backside"
- Purpose: Identify rotation direction

**Tool: measure_snap_intensity**
- Input: frame_range (start, end)
- Output: { intensity: number (0-100), snapDuration: number, peakForce: number }
- Purpose: Quantify snap power and duration

**Tool: measure_windup_duration**
- Input: frame_range (start, end)
- Output: { windupFrames: number, windupDuration: number (ms), windupIntensity: number (0-100) }
- Purpose: Track how long rider winds up before releasing

**Tool: detect_momentum_transfer**
- Input: frame_range (start, end)
- Output: { momentumTransferred: boolean, transferEfficiency: number (0-100), momentumLoss: number (0-100) }
- Purpose: Assess if rider truly transfers momentum off takeoff or loses it

#### Arm & Momentum Tracking
**Tool: detect_arm_momentum**
- Input: frame_range (start, end)
- Output: { hasConsistentMomentum: boolean, armPosition: "tight" | "extended" | "flailing", momentumCarryThrough: number (0-100) }
- Purpose: Assess momentum carry-through and arm control

**Tool: track_arm_trajectory**
- Input: frame_range (start, end)
- Output: { beforeTakeoff: { leftArm: string, rightArm: string }, afterTakeoff: { leftArm: string, rightArm: string }, consistency: number (0-100) }
- Purpose: Track arm position before and after takeoff

**Tool: detect_spot_position**
- Input: frame_range (start, end)
- Output: { spotUnderArms: boolean, spotPosition: "under_arms" | "outside_arms" | "unclear", timing: "early" | "on_time" | "late" }
- Purpose: Assess spot positioning for rotations (critical for backside/frontside)

**Tool: measure_snap_timing**
- Input: frame_range (start, end)
- Output: { snapCarriesMomentum: boolean, momentumThroughLip: number (0-100), snapConsistency: number (0-100) }
- Purpose: Assess if snap carries momentum through the lip of the jump
- Why it matters: Momentum should transfer through takeoff, not be lost

**Tool: detect_compromised_position**
- Input: frame_range (start, end)
- Output: { isCompromised: boolean, windupDuration: number (frames), recommendedDuration: number (4), severity: "none" | "minor" | "moderate" | "critical" }
- Purpose: Detect if rider is wound up for too long (should be ~4 frames for spins)
- Why it matters: Prolonged windup = loss of power and control

#### Takeoff & Landing
**Tool: detect_takeoff_openness**
- Input: frame_number (at takeoff)
- Output: { isOpen: boolean, openness: number (0-100), bodyAlignment: "compact" | "open" | "too_open", chestFacingJump: boolean, cleanSnap: boolean, armMomentumCarried: boolean }
- Purpose: Assess if rider is open or closed at takeoff with clean snap assessment
- Why it matters: Bad if chest faces jump for prolonged period; good if clean snap with arms carrying momentum before and after lip

**Tool: detect_straight_leg_pop**
- Input: frame_range (start, end) - takeoff phase
- Output: { popsToStraightLegs: boolean, legBendAtPop: number, severity: "minor" | "moderate" | "critical" }
- Purpose: Identify if rider is popping to straight legs (bad) instead of maintaining bend

**Tool: detect_spin_control**
- Input: frame_range (start, end) - landing phase
- Output: { isSlowingDown: boolean, counterRotationDetected: boolean, controlQuality: number (0-100), spinSpeed: number }
- Purpose: Assess if rider is controlling spin with counter-rotation on landing

#### Speed & Approach
**Tool: estimate_approach_speed**
- Input: frame_range (start, end) - setup phase
- Output: { speedCategory: "too_slow" | "too_fast" | "optimal", speedRating: number (0-100), speedChecks: number }
- Purpose: Assess if rider has right speed for jump

**Tool: detect_setup_carve_arc**
- Input: frame_range (start, end) - setup phase
- Output: { arcQuality: "tight" | "moderate" | "wide" | "flat", arcRadius: number, carveConsistency: number (0-100), edgeControl: "good" | "poor" }
- Purpose: Analyze the arc and quality of setup carve

**Tool: detect_spin_axis**
- Input: frame_range (start, end)
- Output: { axis: "vertical" | "forward_lean" | "backward_lean" | "sideways_lean", axisAlignment: number (0-100), description: string }
- Purpose: Identify the axis the snowboarder is spinning on (vertical for clean spins, forward/backward lean for tweaked tricks, sideways for off-axis rotations)
- Why it matters: Axis alignment determines trick style and landing quality; off-axis spins are harder to land cleanly

#### Phase & Context
**Tool: detect_phase_transition**
- Input: frame_range (start, end)
- Output: { phase: string, confidence: number, transitionFrame: number }
- Purpose: Identify which phase the rider is in

**Tool: get_phase_requirements**
- Input: trick_name, phase_name
- Output: Array of phase requirements with descriptions
- Purpose: Provide phase-specific requirements to LLM

**Tool: get_phase_problems**
- Input: trick_name, phase_name
- Output: Array of common problems and fixes for the phase
- Purpose: Help LLM identify phase-specific issues

**Tool: get_phase_knowledge_context**
- Input: trick_name, phase_name, query (optional)
- Output: Relevant text from knowledge base for this phase
- Purpose: Provide phase-specific coaching context to LLM

### 3. LLM Orchestration

The LLM receives:
1. Frame images (visual data)
2. Pose keypoints (structured body data)
3. Extracted features (edge, angle, stability)
4. Knowledge base context (coaching knowledge)
5. System prompt (coaching persona, analysis framework)

The LLM produces:
1. Frame-by-frame analysis (what it observes)
2. Motion inference (patterns across frames)
3. Issue identification (what went wrong)
4. Corrections (how to fix it)
5. Timestamps (where in the video)

```typescript
interface LLMAnalysisRequest {
  videoId: string;
  frames: Array<{
    frameNumber: number;
    timestamp: number;
    imageBase64: string;
    poseKeypoints?: Array<{ x: number; y: number; confidence: number }>;
    extractedFeatures?: {
      edgeType?: string;
      boardAngle?: number;
      stabilityScore?: number;
    };
  }>;
  knowledgeContext: string;
  systemPrompt: string;
}

interface CoachingFeedback {
  primaryIssue: {
    description: string;
    frameNumbers: number[];
    timestamps: number[];
    severity: "minor" | "major" | "critical";
  };
  secondaryIssues: Array<{
    description: string;
    frameNumbers: number[];
    timestamps: number[];
  }>;
  corrections: Array<{
    issue: string;
    correction: string;
    reasoning: string;
    relatedFrames: number[];
  }>;
  progressionAdvice: string;
  knowledgeReferences: string[];
}
```

### 4. Knowledge Base Integration

**Text Corpus Sources:**
- YouTube transcript chunks (existing)
- Coach notes and interpretations
- Snowboarding technique manuals
- Common mistakes and corrections
- Progression sequences

**RAG Implementation:**
- Embed knowledge base using OpenAI embeddings or similar
- Store embeddings in vector DB (Pinecone, Weaviate, or simple in-memory)
- Retrieve relevant context when analyzing video

```typescript
interface KnowledgeBaseEntry {
  id: string;
  content: string;
  source: "transcript" | "notes" | "manual" | "progression";
  topic: string;
  embedding?: number[];
}
```

### 5. Chat Interface

**Message Flow:**
1. User uploads video → System extracts frames, runs analysis → Returns initial coaching feedback
2. User asks follow-up question → System retrieves video analysis context → LLM answers with reference to frames
3. User requests drill → System recommends progression based on identified issues

```typescript
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  videoId?: string;
  frameReferences?: number[];
  timestamp?: number;
}

interface ChatSession {
  sessionId: string;
  videoId: string;
  messages: ChatMessage[];
  analysisContext: CoachingFeedback;
}
```

### 6. Caching Layer

**What to Cache:**
- Extracted frames (24-hour TTL)
- Pose estimation results (24-hour TTL)
- Knowledge base embeddings (7-day TTL)
- LLM analysis results (7-day TTL)

**Cache Keys:**
- `frames:{videoId}` → Frame images
- `pose:{videoId}:{frameNumber}` → Pose data
- `analysis:{videoId}` → Full coaching feedback

## Data Models

### Video Document
```typescript
interface Video {
  _id: string;
  userId: string;
  filename: string;
  uploadedAt: Date;
  duration: number;
  frameCount: number;
  format: "mp4" | "mov" | "webm";
  trickName: string; // e.g., "backside-180"
  rotationDirection: "frontside" | "backside";
  status: "processing" | "completed" | "failed";
  cachedFramesPath?: string;
  phaseBoundaries?: {
    setupCarve: { startFrame: number; endFrame: number };
    windupSnap: { startFrame: number; endFrame: number };
    grab?: { startFrame: number; endFrame: number }; // Optional
    landing: { startFrame: number; endFrame: number };
  };
  analysis?: PhaseBasedCoachingFeedback;
  createdAt: Date;
}
```

### Phase-Based Coaching Feedback
```typescript
interface PhaseBasedCoachingFeedback {
  trickName: string;
  rotationDirection: "frontside" | "backside";
  phases: Array<{
    phaseName: "setupCarve" | "windupSnap" | "grab" | "landing";
    frameRange: { start: number; end: number };
    requirements: Array<{
      requirement: string;
      met: boolean;
      observation: string;
      frameReferences: number[];
    }>;
    issues: Array<{
      issue: string;
      rootCause: string;
      severity: "minor" | "major" | "critical";
      frameReferences: number[];
      correction: string;
      reasoning: string;
    }>;
    summary: string;
  }>;
  overallAssessment: string;
  progressionAdvice: string;
  knowledgeReferences: string[];
}
```

### Analysis Cache
```typescript
interface AnalysisCache {
  videoId: string;
  frameData: Map<number, FrameAnalysis>;
  fullAnalysis: CoachingFeedback;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
  createdAt: Date;
  expiresAt: Date;
}

interface FrameAnalysis {
  frameNumber: number;
  timestamp: number;
  poseKeypoints: Array<{ x: number; y: number; confidence: number }>;
  edgeType: string;
  boardAngle: number;
  stabilityScore: number;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Extraction Completeness
*For any* uploaded video, the system SHALL extract frames at 4 FPS with timestamps that accurately reflect the original video timeline.
**Validates: Requirements 1.2, 1.3**

### Property 2: Pose Data Consistency
*For any* frame with detected pose keypoints, the keypoints SHALL form a valid human skeleton with anatomically plausible joint relationships.
**Validates: Requirements 2.1, 2.2**

### Property 3: Feature Extraction Validity
*For any* extracted feature (edge type, board angle, stability score), the feature SHALL be derived consistently from the same frame data across multiple analyses.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Phase-Specific Analysis Grounding
*For any* coaching feedback generated by the LLM, all identified issues SHALL be associated with the correct phase (setup carve, windup/snap, grab, or landing), reference specific frame numbers within that phase, and be grounded in phase-specific requirements.
**Validates: Requirements 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8**

### Property 5: Phase Detection Accuracy
*For any* video, the system SHALL correctly identify phase boundaries and assign each frame to the correct phase with at least 80% accuracy.
**Validates: Requirements 1.5, 1.4**

### Property 5.1: Setup Carve Edge Transition Validation
*For any* video with a specified rotation direction, the system SHALL verify that the setup carve phase contains the correct edge transitions (backside: heelside→toeside→takeoff toeside; frontside: toeside→takeoff heelside).
**Validates: Requirements 6.7**

### Property 5.2: Setup Carve Weight Balance Assessment
*For any* setup carve phase, the system SHALL assess whether the rider's weight is slightly shifted toward the back foot, which is required for proper takeoff.
**Validates: Requirements 6.6**

### Property 6: Phase-Specific Knowledge Base Relevance
*For any* knowledge base context provided to the LLM for a specific phase, the context SHALL be semantically related to that phase and the video content being analyzed.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 7: Phase-Specific Feedback Actionability
*For any* correction provided in coaching feedback for a specific phase, the correction SHALL include specific, measurable guidance grounded in the rider's actual performance in that phase.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 8: Phase-Aware Multi-Frame Reasoning Consistency
*For any* motion inference across frames within a phase, the LLM's description of movement SHALL be consistent with the pose keypoint trajectories across those frames and aligned with phase-specific requirements (setup carve, windup/snap, grab, landing).
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8.1: Continuous Spotting Evaluation
*For any* video, the system SHALL continuously evaluate spotting quality (head gaze direction and visual focus on landing zone) throughout the trick, independent of phase boundaries.
**Validates: Requirements 1.5.5, 6.8**

### Property 9: Cost Optimization Effectiveness
*For any* video analysis, the system SHALL reduce token usage by at least 30% compared to analyzing every frame without sampling or batching.
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 10: Error Recovery Completeness
*For any* error during video processing, the system SHALL either complete analysis with available data or return a clear error message with recovery instructions.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 11: Cache Consistency
*For any* cached frame or pose data, re-analyzing the same video SHALL produce identical results to the cached analysis.
**Validates: Requirements 10.1, 10.2, 10.3**

### Property 12: Chat Context Preservation
*For any* follow-up question in a chat session, the LLM's response SHALL reference the original video analysis, maintain consistency with previous messages, and provide phase-specific context.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 13: Biomechanical Metric Accuracy
*For any* video, the system SHALL extract all biomechanical metrics (head gaze, leg bend, rotation count, arm position, etc.) with sufficient accuracy for the LLM to provide actionable coaching feedback.
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10**

### Property 14: Performance SLA Compliance
*For any* video upload, the system SHALL complete frame extraction within 30 seconds, pose estimation within 60 seconds, and return initial feedback within 120 seconds.
**Validates: Requirements 13.1, 13.2, 13.3**

## Error Handling

- Video upload failure → Return 400 with supported formats and size limits
- Frame extraction timeout → Return 504 with partial frames processed
- Pose estimation failure on frame → Skip frame, continue with others, note in metadata
- LLM API unavailable → Return 503 with retry suggestion and estimated wait time
- Knowledge base query failure → Continue analysis without context, note limitation
- Cache miss → Proceed with fresh analysis, cache result for future use

## Testing Strategy

### Unit Testing
- Test frame extraction with various video formats and durations
- Test pose estimation with synthetic frames
- Test feature extraction (edge detection, angle estimation) with known inputs
- Test cache hit/miss logic
- Test error handling for each failure mode

### Property-Based Testing
- Generate random videos and verify frame extraction produces correct frame counts
- Generate random pose keypoints and verify skeleton validity
- Generate random feature values and verify consistency across analyses
- Generate random knowledge base queries and verify relevance

### Integration Testing
- Test end-to-end video upload → frame extraction → pose estimation → LLM analysis
- Test chat interface with follow-up questions
- Test cache reuse on repeated video analysis
- Test knowledge base integration with RAG

### Performance Testing
- Measure frame extraction time for videos of various lengths
- Measure pose estimation time for different frame counts
- Measure LLM API latency and token usage
- Verify 30/60/120 second SLAs are met

</content>
</invoke>