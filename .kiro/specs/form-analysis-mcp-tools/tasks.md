# Implementation Tasks: Form Analysis MCP Tools

## Overview

This implementation plan covers the two-phase architecture:
1. **Backend Pre-Processing Pipeline** (17 functions) - runs at video upload
2. **MCP Tools Layer** (23 tools) - data retrieval for LLM

**6 Phases**: setupCarve → windUp → snap → takeoff → air → landing

**Note**: 
- Momentum through lip is analyzed via `computeMomentumThroughLip()` function, not as a separate phase
- windUp and snap are null for straight airs
- Phase detection is trick-type aware (straight_air, frontside, backside)

---

## MVP PHASE: Validate Pose Detection Algorithm

The first priority is validating that pose detection works reliably before building out the full system.

---

## Task 1: Database Schema & Models (Foundation)

### 1.1 Create MongoDB Schemas
- [ ] Create `VideoAnalysis` schema with all fields from design doc
- [ ] Create `ReferencePose` schema for pose library
- [ ] Create `CoachingTip` schema for knowledge base integration
- [ ] Add indexes on `videoId`, `trickName`, `phase` for fast queries

### 1.2 Create TypeScript Types
- [ ] Define `PoseFrame` interface (joints3D, jointAngles, confidence)
- [ ] Define `PhaseMap` and `PhaseData` interfaces (with nullable windUp/snap)
- [ ] Define `TrickType` enum (straight_air, frontside, backside)
- [ ] Define `Verdict<T>` generic interface
- [ ] Define `SpinMetrics` interface with all numeric fields
- [ ] Define `EdgeTransition` and `ArmPosition` interfaces for detection
- [ ] Define measurement types per phase (TakeoffMeasurements, AirMeasurements, etc.)

**Files**: `backend/src/types/videoAnalysis.ts`, `backend/mcp-server/src/db/schemas.ts`

---

## Task 2: Phase Detection System (CORE MVP)

### 2.1 Implement Detection Signals (Pose-Based, No LLM)
- [ ] Calculate `edgeAngle` timeline (heel/toe pressure)
- [ ] Detect `edgeTransitions` array (heel↔toe transitions with smoothness score)
- [ ] Calculate `hipHeight`, `hipVelocity`, `hipAcceleration`
- [ ] Calculate `ankleToHipRatio` for airborne detection
- [ ] Calculate `chestRotation` and `chestRotationVelocity`
- [ ] Calculate `chestDirection` vector (for arrow overlay)
- [ ] Track `armPosition` per frame (angles, toward tail/nose flags)
- [ ] Calculate `gazeDirection` vector (eye/head direction for "spot" arrow)
- [ ] Calculate `bodyStackedness` (alignment over board)
- [ ] Calculate `formVariance` (rate of body position change)

**Note**: All phase detection is pure pose-based computation. No LLM involved.

### 2.2 Implement setupCarve Detection
- [ ] Find last heelside→toeside edge transition before takeoff
- [ ] Detect setupCarve start frame (edge transition start)
- [ ] Detect setupCarve end frame (when edge change sub-phase begins)
- [ ] Implement `edgeChange` sub-phase detection within setupCarve
- [ ] Store all poses during edge change for form review
- [ ] Calculate edge change smoothness score

### 2.3 Implement windUp Detection (Trick-Type Aware)
- [ ] **Frontside**: Detect windup on heelside edge, arms moving toward tail
- [ ] **Backside**: Detect windup SIMULTANEOUS with edge change
- [ ] **Straight Air**: Return null (no windup)
- [ ] Find max windup frame (peak chest rotation)
- [ ] Store all windup poses for form review

### 2.4 Implement snap Detection
- [ ] Detect snap start (frame after max windup)
- [ ] Detect snap end (takeoff frame)
- [ ] Calculate snap speed (deg/s)
- [ ] Calculate chest openness at takeoff with direction vector
- [ ] Determine chest openness verdict (too_closed, perfect_zone, too_open)

### 2.5 Implement takeoff Detection
- [ ] Detect single takeoff frame (ankleToHipRatio crosses 1.0)
- [ ] Store takeoff pose
- [ ] Calculate body stackedness at takeoff
- [ ] Calculate chest direction with vector for arrow overlay

### 2.6 Implement air Detection
- [ ] Detect air start (frame after takeoff)
- [ ] Detect air end (frame before landing)
- [ ] Detect optional grab sub-phase
- [ ] Detect peak height frame

### 2.7 Implement landing Detection
- [ ] Detect landing frame (ankleToHipRatio < 1.0 + acceleration spike)
- [ ] Detect ride-away stabilization frame
- [ ] Determine landing success (board landed properly, rider stable, clean ride-away)
- [ ] Calculate landing verdict (stomped, clean, sketchy, fall)

**Files**: `backend/src/utils/phaseDetector.ts` (major rewrite)

---

## Task 3: Pose Extraction Integration (MVP)

### 3.1 Pose Extraction Pipeline
- [ ] `extractPoseData()` - integrate with WSL pose service
- [ ] Store full pose timeline in VideoAnalysis document
- [ ] Validate N frames → N poses completeness

**Files**: `backend/src/services/videoAnalysisPipeline.ts`

---

## Task 4: MCP Tools - Pose Retrieval (MVP Validation)

These tools let you query poses to validate the detection algorithm is working.

### 4.1 Implement Pose Tools
- [ ] `get_pose_at_frame(videoId, frame)` - single pose with raw angles
- [ ] `get_poses_in_range(videoId, startFrame, endFrame)` - pose array
- [ ] `get_phase_poses(videoId, phaseName)` - all poses in phase
- [ ] `get_key_moment_poses(videoId)` - poses at key moments

**Files**: `backend/mcp-server/src/tools/poseRetrieval.ts`

---

## Task 5: MCP Tools - Phase Analysis (MVP Validation)

### 5.1 Implement Phase Tools
- [ ] `get_phase_info(videoId, phaseName?)` - phase boundaries + metrics
- [ ] `get_takeoff_analysis(videoId)` - all takeoff data
- [ ] `get_air_analysis(videoId)` - all air data
- [ ] `get_landing_analysis(videoId)` - all landing data

**Files**: `backend/mcp-server/src/tools/phaseAnalysis.ts`

---

## Task 6: Video Upload Pipeline (MVP)

### 6.1 Update Upload Endpoint
- [ ] Modify `/api/upload-video` to trigger pose extraction + phase detection
- [ ] Add `intendedTrick` and `stance` optional parameters
- [ ] Return `videoId` and processing status
- [ ] Store VideoAnalysis document with phases

**Files**: `backend/src/services/videoAnalysisPipeline.ts`, `backend/api/upload-video.ts`

---

## MVP CHECKPOINT

At this point you can:
1. Upload a video
2. Get pose data for any frame
3. See detected phases with frame boundaries
4. Validate if phase detection algorithm is working correctly

---

## POST-MVP: Full Feature Implementation

---

## Task 7: Backend Pre-Processing Functions (Metrics)

### 7.1 Phase-Specific Metric Functions
- [ ] `computeSetupCarveMetrics()` - arc, edge, transition timing
- [ ] `computeWindUpMetrics()` - max angle, duration, frame reference
- [ ] `computeSnapMetrics()` - snap speed (deg/s), power level 1-10
- [ ] `computeTakeoffMetrics()` - body position, pop timing
- [ ] `computeMomentumThroughLip()` - momentum loss detection
- [ ] `detectGrab()` - grab type, timing, duration
- [ ] `computeAirMetrics()` - drift, rotation, axis
- [ ] `computeLandingMetrics()` - absorption, board angle

### 7.2 Critical Analysis Functions
- [ ] `computeSpinControl()` - snap momentum, separation, sweetspot verdict
- [ ] `computeJumpMetrics()` - air time, jump size, knuckle risk

### 7.3 Evaluation & Comparison
- [ ] `generateEvaluations()` - convert metrics to verdicts with Pinecone tips
- [ ] `compareToReference()` - per-frame deviation scoring
- [ ] `generateSummary()` - key findings, recommendations

**Files**: `backend/src/services/videoAnalysisPipeline.ts`, `backend/src/services/metricsComputation.ts`

---

## Task 8: MCP Tools - Video Overview (3 tools)

### 8.1 Implement Overview Tools
- [ ] `get_video_summary(videoId)` - return pre-computed summary
- [ ] `get_video_metadata(videoId)` - duration, fps, stance, trick
- [ ] `list_available_videos()` - list all processed videos

**Files**: `backend/mcp-server/src/tools/videoOverview.ts`

---

## Task 9: MCP Tools - Critical Analysis (2 tools)

### 9.1 Implement Critical Tools
- [ ] `get_spin_control_analysis(videoId)` - **MOST IMPORTANT**
  - snapPower (1-10), snapSpeed (deg/s)
  - separation degrees, timeline
  - sweetspot verdict with reasoning
- [ ] `get_jump_metrics(videoId)` - air time, jump size, landing zone

**Files**: `backend/mcp-server/src/tools/criticalAnalysis.ts`

---

## Task 10: MCP Tools - Form Comparison (2 tools)

### 10.1 Implement Comparison Tools
- [ ] `get_form_comparison(videoId, phaseName?)` - deviation scores
- [ ] `compare_videos(videoId1, videoId2, phaseName?)` - side-by-side

**Files**: `backend/mcp-server/src/tools/formComparison.ts`

---

## Task 11: MCP Tools - Reference Data (4 tools)

### 11.1 Implement Reference Tools
- [ ] `get_reference_pose(trickName, phaseName?)` - ideal pose data
- [ ] `get_trick_rules(trickName, phaseName?)` - technique rules
- [ ] `get_common_problems(trickName, phaseName?)` - known issues + fixes
- [ ] `list_available_tricks()` - all tricks with references

**Files**: `backend/mcp-server/src/tools/referenceData.ts`

---

## Task 12: MCP Tools - Reference Library Management (3 tools)

### 12.1 Implement Library Tools
- [ ] `list_reference_poses(filters?)` - filtered reference list
- [ ] `add_reference_pose(data)` - add new reference
- [ ] `set_video_analysis_status(videoId, status)` - update status

**Files**: `backend/mcp-server/src/tools/referenceLibrary.ts`

---

## Task 13: Pinecone Integration for Coach Tips

### 13.1 Query Integration
- [ ] Create `attachCoachingTips()` function
- [ ] Build query from verdict context (trick, phase, problem)
- [ ] Filter by `trickName` metadata
- [ ] Select highest relevance tip for each verdict

### 13.2 Verdict Enhancement
- [ ] Add `coachTip`, `coachTipSource`, `coachTipTimestamp` to verdicts
- [ ] Handle missing tips gracefully (null fields)

**Files**: `backend/lib/pinecone.ts` (update), `backend/src/services/coachTipAttachment.ts`

---

## Task 14: MCP Tools - Coaching Knowledge (1 tool)

### 14.1 Implement Coaching Tool
- [ ] `get_coaching_tips(trickName, problem?, phase?)` - on-demand tips
  - Query Pinecone with filters
  - Return tips with videoId, timestamp, relevance

**Files**: `backend/mcp-server/src/tools/coachingKnowledge.ts`

---

## Task 15: Reference Video Upload & Frame Tagging (Mobile App)

### 15.1 Reference Video Upload Screen
- [ ] Create new `ReferenceVideoScreen` in mobile app
- [ ] Add navigation button from main screen
- [ ] Upload video endpoint that extracts frames (NOT poses yet)
- [ ] Store video with `referenceVideoId`, `trickName`, `trickType`, `stance`

### 15.2 Frame Browser Interface
- [ ] Display video frames in scrollable carousel
- [ ] Show frame index and timestamp
- [ ] **Before/Next buttons** for frame navigation
- [ ] Tap frame to view full size with details

### 15.3 Frame Selection for Pose Extraction
- [ ] **Single frame selection**: Tap to select individual frames
- [ ] **Range selection**: Select start frame + end frame to extract range
- [ ] Visual indicator for selected frames
- [ ] "Extract Poses" button to run pose service on selected frames only
- [ ] Show extraction progress

### 15.4 Frame Tagging Interface
- [ ] After pose extraction, show frame with mesh overlay
- [ ] Tag frame with: phase, subPhase, keyMoment, notes
- [ ] Save tagged frame as `ReferencePose` document
- [ ] Show existing tags for this trick/phase

### 15.5 Reference Library Browser
- [ ] List all reference videos grouped by trick
- [ ] Show frame thumbnails with phase labels
- [ ] Click to view frame + mesh + pose data
- [ ] Display trick info and coaching notes

**Files**: `backend/mobile/src/screens/ReferenceVideoScreen.tsx`, `backend/api/upload-reference-video.ts`, `backend/api/extract-poses-for-frames.ts`

---

## Task 16: Coaching Text Integration (Simple Semantic Search)

### 16.1 Simple Semantic Search for Problems
- [ ] Create `searchCoachingTips()` function
- [ ] Query Pinecone with detected problem text
- [ ] Return top 3-5 relevant coaching chunks
- [ ] Display in verdict response (rough draft, will optimize later)

### 16.2 Body Awareness Functions (MCP Tool References)
- [ ] Create `BodyAwarenessLibrary` with functions that map to Pinecone phrases
- [ ] `isArmsTowardTail(pose)` - check if arms positioned toward tail
- [ ] `isChestWoundUp(pose)` - check if chest is in wound position
- [ ] `isBodyStacked(pose)` - check if body is stacked over board
- [ ] `isKneesBent(pose)` - check knee flexion
- [ ] `isChestOpen(pose)` - check chest openness angle
- [ ] `isHipsOpening(pose)` - check hip rotation
- [ ] Each function returns boolean + confidence + angle value

### 16.3 MCP Tools for Body Awareness
- [ ] `get_body_position_check(videoId, frame, checkType)` - run specific body check
- [ ] `get_all_body_checks(videoId, frame)` - run all checks for a frame
- [ ] Return results with Pinecone phrase mapping

**Files**: `backend/src/services/bodyAwarenessLibrary.ts`, `backend/mcp-server/src/tools/bodyAwareness.ts`

---

## Task 17: Error Handling

### 17.1 Processing Errors
- [ ] Define `ProcessingError` type with stage, error, partialData
- [ ] Implement recovery for partial processing
- [ ] Store error details in VideoAnalysis

### 17.2 MCP Tool Errors
- [ ] Define `MCPToolError` with codes (VIDEO_NOT_FOUND, etc.)
- [ ] Return available videoIds on not found
- [ ] Return valid parameters on invalid input

**Files**: `backend/src/types/errors.ts`, `backend/mcp-server/src/utils/errorHandling.ts`

---

## Task 18: Testing & Documentation

### 18.1 Unit Tests
- [ ] Test each phase detection signal calculation
- [ ] Test phase boundary detection
- [ ] Test metric computation functions
- [ ] Test verdict generation

### 18.2 Property-Based Tests
- [ ] Pose extraction completeness (N frames → N poses)
- [ ] Phase detection coverage (100% frame coverage)
- [ ] Verdict schema consistency
- [ ] MCP tool response time (<100ms)

### 18.3 Integration Tests
- [ ] End-to-end video upload and processing
- [ ] MCP tool queries against processed videos
- [ ] Pinecone integration for coach tips

### 18.4 Documentation
- [ ] Document all 23 MCP tools with examples
- [ ] Document request/response schemas
- [ ] LLM prompt examples for each tool

**Files**: `backend/src/__tests__/`, `backend/mcp-server/src/__tests__/`, `docs/MCP_TOOLS_REFERENCE.md`

---

## Summary

| Category | Count |
|----------|-------|
| Backend Pre-Processing Functions | 17 |
| MCP Tools | 23 |
| Phases | 6 |
| Correctness Properties | 11 |

**Total Tasks**: 18 major tasks with ~90 subtasks

**MVP Tasks (1-6)**: Database, Phase Detection, Pose Extraction, Basic MCP Tools, Upload Pipeline
**Post-MVP Tasks (7-18)**: Full metrics, all MCP tools, reference library, coaching integration

**Note**: Visual verification is handled by the LLM using existing MCP tools + Playwright for DOM inspection when needed. No dedicated visual verification MCP tools required.
