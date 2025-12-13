# MCP Tools Reference: Snowboarding Video Analysis

This document defines all extraction tools the LLM can call to analyze snowboarding videos. These tools provide structured data that the LLM uses to reason about technique and provide coaching feedback.

## Tool Categories

### 1. Visual & Frame Data

#### extract_frames
- **Input:** `video_id: string, frame_numbers?: number[]`
- **Output:** `{ frames: Array<{ frameNumber: number, imageBase64: string, timestamp: number }> }`
- **Purpose:** Provide raw frame images to LLM for visual analysis

#### detect_head_gaze
- **Input:** `frame_number: number`
- **Output:** `{ direction: "forward" | "down" | "up" | "left" | "right", angle: number, context: string }`
- **Purpose:** Track where rider is looking (critical for spotting and commitment)
- **Why it matters:** Head position indicates commitment, spotting technique, and awareness
- **Context:** Before lip of jump should be looking at takeoff; after takeoff should be spotting for trick or landing

---

### 2. Rider Stance & Position

#### pose_estimate
- **Input:** `frame_number: number`
- **Output:** `{ keypoints: Array<{ name: string, x: number, y: number, confidence: number }> }`
- **Purpose:** Get skeletal keypoints (head, shoulders, elbows, hips, knees, ankles)
- **Keypoints:** head, neck, shoulders, elbows, wrists, hips, knees, ankles

#### detect_stance
- **Input:** `frame_number: number`
- **Output:** `"regular" | "goofy"`
- **Purpose:** Identify rider's natural stance
- **Why it matters:** Determines which foot is forward and how to interpret body position

#### detect_body_stack
- **Input:** `frame_number: number`
- **Output:** `{ isStacked: boolean, weightDistribution: "forward" | "centered" | "back" | "backfoot", edge: "toeside" | "heelside", combinations: string[], alignment: "aligned" | "misaligned" }`
- **Purpose:** Assess weight positioning and upper/lower body alignment
- **Why it matters:** Stacked position = weight over toes, upper body aligned with lower body = control and power
- **Combinations:** Can be combined (e.g., "toeside_forward", "toeside_backfoot", "heelside_centered")

#### measure_leg_bend
- **Input:** `frame_number: number`
- **Output:** `{ leftKneeBend: number, rightKneeBend: number, averageBend: number, isStraightLegs: boolean }`
- **Purpose:** Measure knee bend angle (should maintain minimum 10-15%)
- **Why it matters:** Straight legs = loss of shock absorption and control; bent legs = stability and responsiveness

#### detect_upper_body_rotation
- **Input:** `frame_number: number`
- **Output:** `{ rotation: "leading" | "following" | "aligned", degreesSeparation: number }`
- **Purpose:** Assess if upper body is leading, following, or aligned with lower body
- **Why it matters:** Upper body should lead to create separation and load the board
- **Degree Separation:** Quantifies how far ahead/behind upper body is relative to lower body

#### detect_lower_body_rotation
- **Input:** `frame_number: number`
- **Output:** `{ rotation: "leading" | "following" | "aligned", degreesSeparation: number }`
- **Purpose:** Assess lower body commitment relative to upper body
- **Why it matters:** Lower body should follow upper body to complete the rotation
- **Degree Separation:** Quantifies how far ahead/behind lower body is relative to upper body

---

### 3. Board & Edge Control

#### detect_edge
- **Input:** `frame_number: number`
- **Output:** `"toe_edge" | "heel_edge" | "unknown"`
- **Purpose:** Identify which edge rider is on
- **Why it matters:** Edge control determines carving quality and trick execution

#### estimate_board_angle
- **Input:** `frame_number: number`
- **Output:** `{ angle: number, relativeTo: "horizon" }`
- **Purpose:** Quantify board rotation angle
- **Why it matters:** Shows rotation progress and carving angle

#### estimate_jump_size
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ estimatedHeight: number, estimatedDistance: number, jumpSize: "small" | "medium" | "large" }`
- **Purpose:** Estimate feature size and rider's commitment
- **Why it matters:** Determines if rider has appropriate speed and commitment for the feature

---

### 4. Motion & Rotation

#### count_rotations
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ totalRotations: number, rotationDirection: "frontside" | "backside", degreesPerFrame: number }`
- **Purpose:** Count full rotations and measure rotation speed
- **Why it matters:** Verifies trick completion and rotation consistency

#### detect_rotation_direction
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `"frontside" | "backside"`
- **Purpose:** Identify rotation direction
- **Why it matters:** Determines which techniques apply (frontside vs backside have different requirements)

#### measure_snap_intensity
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ intensity: number (0-100), snapDuration: number, peakForce: number }`
- **Purpose:** Quantify snap power and duration
- **Why it matters:** Shows how hard the rider is snapping the board

#### measure_windup_duration
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ windupFrames: number, windupDuration: number (ms), windupIntensity: number (0-100) }`
- **Purpose:** Track how long rider winds up before releasing
- **Why it matters:** Windup duration affects snap power and timing

#### detect_momentum_transfer
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ momentumTransferred: boolean, transferEfficiency: number (0-100), momentumLoss: number (0-100) }`
- **Purpose:** Assess if rider truly transfers momentum off takeoff or loses it
- **Why it matters:** Momentum transfer = clean takeoff; momentum loss = weak rotation

---

### 5. Arm & Momentum Tracking

#### detect_arm_momentum
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ hasConsistentMomentum: boolean, armPosition: "tight" | "extended" | "flailing", momentumCarryThrough: number (0-100) }`
- **Purpose:** Assess momentum carry-through and arm control
- **Why it matters:** Arms should stay tight to maintain rotation momentum

#### track_arm_trajectory
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ beforeTakeoff: { leftArm: string, rightArm: string }, afterTakeoff: { leftArm: string, rightArm: string }, consistency: number (0-100) }`
- **Purpose:** Track arm position before and after takeoff
- **Why it matters:** Shows if rider maintains arm control through takeoff

#### detect_spot_position
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ spotUnderArms: boolean, spotPosition: "under_arms" | "outside_arms" | "unclear", timing: "early" | "on_time" | "late" }`
- **Purpose:** Assess spot positioning for rotations
- **Why it matters:** Spot should be under arms for backside rotations; outside arms for frontside

---

### 6. Takeoff & Landing

#### detect_takeoff_openness
- **Input:** `frame_number: number` (at takeoff)
- **Output:** `{ isOpen: boolean, openness: number (0-100), bodyAlignment: "compact" | "open" | "too_open", chestFacingJump: boolean, cleanSnap: boolean, armMomentumCarried: boolean }`
- **Purpose:** Assess if rider is open or closed at takeoff with clean snap assessment
- **Why it matters:** Bad if chest faces jump for prolonged period; good if clean snap with arms carrying momentum before and after lip
- **Clean Snap:** Arms should carry momentum before and after the lip of the takeoff

#### detect_straight_leg_pop
- **Input:** `frame_range: { start: number, end: number }` (takeoff phase)
- **Output:** `{ popsToStraightLegs: boolean, legBendAtPop: number, severity: "minor" | "moderate" | "critical" }`
- **Purpose:** Identify if rider is popping to straight legs (bad)
- **Why it matters:** Straight legs = loss of shock absorption and control

#### detect_spin_control
- **Input:** `frame_range: { start: number, end: number }` (landing phase)
- **Output:** `{ isSlowingDown: boolean, counterRotationDetected: boolean, controlQuality: number (0-100), spinSpeed: number }`
- **Purpose:** Assess if rider is controlling spin with counter-rotation on landing
- **Why it matters:** Good riders slow down spin with counter-rotation; beginners let it spin out

---

### 7. Speed & Approach

#### estimate_approach_speed
- **Input:** `frame_range: { start: number, end: number }` (setup phase)
- **Output:** `{ speedCategory: "too_slow" | "too_fast" | "optimal", speedRating: number (0-100), speedChecks: number }`
- **Purpose:** Assess if rider has right speed for jump
- **Why it matters:** Too slow = weak tricks; too fast = loss of control

#### detect_setup_carve_arc
- **Input:** `frame_range: { start: number, end: number }` (setup phase)
- **Output:** `{ arcQuality: "tight" | "moderate" | "wide" | "flat", arcRadius: number, carveConsistency: number (0-100), edgeControl: "good" | "poor" }`
- **Purpose:** Analyze the arc and quality of setup carve
- **Why it matters:** Good carve = proper edge control and approach angle

---

### 8. Phase & Context

#### detect_phase_transition
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ phase: string, confidence: number, transitionFrame: number }`
- **Purpose:** Identify which phase the rider is in
- **Why it matters:** Phases have different requirements and common problems

#### get_phase_requirements
- **Input:** `trick_name: string, phase_name: string`
- **Output:** `Array<{ requirement: string, description: string, importance: "critical" | "important" | "helpful" }>`
- **Purpose:** Get phase-specific requirements
- **Why it matters:** LLM needs to know what should happen in each phase

#### get_phase_problems
- **Input:** `trick_name: string, phase_name: string`
- **Output:** `Array<{ problem: string, indicators: string[], fixes: string[], frequency: "common" | "rare" }>`
- **Purpose:** Get common problems for this phase
- **Why it matters:** LLM can identify issues faster with phase-specific problem list

#### get_phase_knowledge_context
- **Input:** `trick_name: string, phase_name: string, query?: string`
- **Output:** `{ context: string, sources: string[] }`
- **Purpose:** Get coaching knowledge for this phase
- **Why it matters:** LLM needs context to provide accurate coaching

#### measure_snap_timing
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ snapCarriesMomentum: boolean, momentumThroughLip: number (0-100), snapConsistency: number (0-100) }`
- **Purpose:** Assess if snap carries momentum through the lip of the jump
- **Why it matters:** Momentum should transfer through takeoff, not be lost
- **Key Metric:** momentumThroughLip shows if rider maintains power through the lip

#### detect_compromised_position
- **Input:** `frame_range: { start: number, end: number }`
- **Output:** `{ isCompromised: boolean, windupDuration: number (frames), recommendedDuration: number (4), severity: "none" | "minor" | "moderate" | "critical" }`
- **Purpose:** Detect if rider is wound up for too long (should be ~4 frames for spins)
- **Why it matters:** Prolonged windup = loss of power and control
- **Recommended Duration:** ~4 frames for optimal snap timing

---

## How the LLM Uses These Tools

**Example: Analyzing a Backside 180 Setup Phase**

1. LLM receives frames 10-30 (setup phase)
2. LLM calls `get_phase_requirements("backside-180", "setup")`
   - Returns: ["maintain toeside edge", "upper body leads rotation", "stacked position"]
3. LLM calls `detect_edge(15)` → "heel_edge" (problem!)
4. LLM calls `detect_upper_body_rotation(15)` → "following" (problem!)
5. LLM calls `detect_body_stack(15)` → { isStacked: false, weightDistribution: "back" } (problem!)
6. LLM calls `get_phase_problems("backside-180", "setup")`
   - Returns: [{ problem: "heel edge catch", indicators: ["on heel edge", "weight back"], fixes: [...] }]
7. LLM reasons: "I see three issues in the setup phase..."
8. LLM provides coaching feedback with specific corrections

---

## Implementation Notes

- All tools should return structured JSON for easy LLM parsing
- Tools should handle edge cases gracefully (e.g., pose detection failure)
- Tools should cache results to avoid redundant computation
- Tools should provide confidence scores where applicable
- Tools should be fast enough to complete within SLA (60s for all metrics on 240 frames)

