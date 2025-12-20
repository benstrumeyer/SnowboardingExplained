# Requirements Document: Form Analysis MCP Tools

## Introduction

This feature implements a comprehensive form analysis system for snowboard trick coaching. The system has two distinct phases:

1. **Backend Pre-Processing**: When a video is uploaded, the backend automatically extracts pose data, computes all metrics, detects phases, and stores everything in a queryable database. This happens BEFORE any LLM interaction.

2. **MCP Tools for LLM Access**: The MCP tools are lightweight data retrieval endpoints that allow the LLM to query pre-computed results on-demand. The LLM starts with minimal context and uses tools to fetch only the data it needs to answer user questions.

This architecture ensures fast LLM responses (no waiting for computation), minimal context usage (fetch only what's needed), and enables the LLM to "learn" about the video progressively through tool calls.

## Glossary

- **Pre-Computed Data**: All pose metrics, phase detection, form analysis, and comparisons computed during video upload before any LLM interaction
- **MCP Tool**: A lightweight API endpoint that retrieves pre-computed data for the LLM to consume
- **Video Session**: A processed video with all its pre-computed data, identified by a unique videoId
- **Reference Pose Database**: Pre-stored ideal poses for each trick/phase combination
- **Takeoff Frame**: The exact video frame when the snowboard tail leaves the jump lip (pre-detected)
- **Landing Frame**: The exact video frame when the snowboard first contacts the landing surface (pre-detected)
- **Lip Line**: A 3D line representing the edge of the jump lip (pre-computed from foot trajectory)
- **Tail Pressure**: Technique of maintaining weight on the back foot through takeoff
- **Air Drift**: Lateral movement of the rider during the trick
- **Shoulder Drop**: When one shoulder drops significantly lower than the other during rotation
- **Rotation Axis**: The axis around which the rider spins (vertical/cork/unstable)
- **Stance**: Rider orientation - Regular (left foot forward) or Goofy (right foot forward)
- **Phase**: Distinct segments of a trick - Approach, Setup, Takeoff, Air, Landing

---

## PART 1: BACKEND PRE-PROCESSING REQUIREMENTS

These requirements define what the backend computes and stores BEFORE any LLM interaction.

### Requirement 1: Video Upload and Pose Extraction Pipeline

**User Story:** As a developer, I want the backend to automatically process uploaded videos and extract all pose data, so that MCP tools can retrieve pre-computed results instantly.

#### Acceptance Criteria

1. WHEN a video is uploaded THEN the Backend SHALL extract pose data for every frame using the pose service
2. WHEN pose extraction completes THEN the Backend SHALL store all 3D joint positions, joint angles, and confidence scores in the database
3. WHEN pose data is stored THEN the Backend SHALL index it by videoId and frame number for fast retrieval
4. WHEN processing completes THEN the Backend SHALL return a videoId that the LLM uses for all subsequent tool calls
5. WHEN processing fails THEN the Backend SHALL store error details and partial data if available

### Requirement 2: Automatic Phase Detection and Segmentation

**User Story:** As a developer, I want the backend to automatically detect and store trick phases, so that the LLM can query phase-specific data.

#### Acceptance Criteria

1. WHEN pose data is extracted THEN the Backend SHALL automatically detect phases (approach, setup, takeoff, air, landing)
2. WHEN phases are detected THEN the Backend SHALL store start_frame, end_frame, and confidence for each phase
3. WHEN takeoff is detected THEN the Backend SHALL store the exact takeoff_frame using velocity-based detection
4. WHEN landing is detected THEN the Backend SHALL store the exact landing_frame with board_angle and landing_quality
5. WHEN lip line is calculated THEN the Backend SHALL store center, height, direction, angle, and width

### Requirement 3: Automatic Form Metrics Computation

**User Story:** As a developer, I want the backend to compute all form metrics during processing, so that the LLM can retrieve them instantly.

#### Acceptance Criteria

1. WHEN takeoff frame is identified THEN the Backend SHALL compute and store: hip_angle, knee_bend, body_openness, spine_angle, shoulder_alignment, momentum_vector
2. WHEN approach frames are processed THEN the Backend SHALL compute and store: tail_pressure_analysis (pop_type, liftoff_delay, weight_distribution_timeline)
3. WHEN air frames are processed THEN the Backend SHALL compute and store: air_drift (distance, direction, trajectory), shoulder_alignment_timeline, rotation_axis_analysis
4. WHEN landing frames are processed THEN the Backend SHALL compute and store: landing_quality, board_angle, spin_control_score, absorption_quality, number of rotations and full rotation degrees, and trick name
5. WHEN all metrics are computed THEN the Backend SHALL store an overall_summary with key findings and outliers

### Requirement 3.1: Reasoning Metadata for All Computations

**User Story:** As a developer, I want all computed metrics to include reasoning metadata, so that coaches can understand and trust the analysis.

#### Acceptance Criteria

1. WHEN any metric is computed THEN the Backend SHALL store: confidence_score (0-100), detection_method, and reasoning_text explaining how the value was determined
2. WHEN a computation fails or is uncertain THEN the Backend SHALL store: failure_reason and fallback_value_used (if any)
3. WHEN multiple detection methods are available THEN the Backend SHALL store which method was used and why it was selected
4. WHEN confidence is below 70% THEN the Backend SHALL flag the metric as "low_confidence" with detailed explanation
5. WHEN returning metrics via MCP tools THEN the tool SHALL include the reasoning metadata for debuggability and trust

### Requirement 3.2: Flat Spin Verification (First-Class Concept)

**User Story:** As a developer, I want explicit flat spin verification as a dedicated analysis, so that technique-sensitive flat spins get a clear pass/fail verdict.

#### Acceptance Criteria

1. WHEN analyzing takeoff THEN the Backend SHALL compute flat_spin_verification as a dedicated first-class analysis
2. WHEN verifying flat spin THEN the Backend SHALL measure: chest_direction_at_takeoff (degrees from horizontal), arm_throw_direction (up/down/flat), arm_throw_intensity
3. WHEN verifying flat spin THEN the Backend SHALL return: is_flat (boolean), vertical_deviation_degrees, throw_direction, verdict ("clean_flat", "slight_cork", "significant_cork", "inverted_throw")
4. WHEN vertical deviation exceeds 10 degrees THEN the Backend SHALL flag as not flat with specific explanation of what caused the deviation
5. WHEN arm momentum indicates upward or downward throw THEN the Backend SHALL identify which arm caused the deviation, the severity, and corrective feedback


### Requirement 4: Automatic Stance Detection

**User Story:** As a developer, I want the backend to automatically detect rider stance, so that all metrics are computed with correct left/right orientation.

#### Acceptance Criteria

1. WHEN approach frames are processed THEN the Backend SHALL detect stance (regular/goofy) and store it with the video
2. WHEN stance is detected THEN the Backend SHALL apply stance-appropriate rules to all metric computations
3. WHEN stance cannot be determined THEN the Backend SHALL flag the video for manual stance specification

### Requirement 5: Automatic Comparison Against Reference Poses

**User Story:** As a developer, I want the backend to automatically compare user poses against reference poses, so that deviations are pre-computed.

#### Acceptance Criteria

1. WHEN a trick type is identified or specified THEN the Backend SHALL retrieve reference poses for that trick
2. WHEN reference poses exist THEN the Backend SHALL compute per-keypoint deviation scores for each phase
3. WHEN deviations are computed THEN the Backend SHALL store: deviation_scores, major_deviations, similarity_score, prioritized_feedback
4. WHEN comparison completes THEN the Backend SHALL store which body parts differ and by how much

### Requirement 6: Pre-Computed Summary Generation

**User Story:** As a developer, I want the backend to generate a summary of key findings, so that the LLM can get an overview without fetching all data.

#### Acceptance Criteria

1. WHEN all metrics are computed THEN the Backend SHALL generate an overall_summary identifying key touch points
2. WHEN generating summary THEN the Backend SHALL identify outliers (metrics significantly outside normal range)
3. WHEN generating summary THEN the Backend SHALL prioritize findings by importance (critical technique issues first)
4. WHEN generating summary THEN the Backend SHALL include: trick_identified, confidence, key_issues, key_positives, recommended_focus_areas

### Requirement 6.1: Technique Interpretation Layer (Pre-Computed)

**User Story:** As a developer, I want raw metrics converted into coach-meaningful technique verdicts, so that the LLM and UI can display intelligent assessments without additional processing.

#### Acceptance Criteria

1. WHEN raw metrics are computed THEN the Backend SHALL generate technique verdicts that translate biomechanics into coaching language
2. WHEN generating verdicts THEN the Backend SHALL produce interpretations including but not limited to:
   - `pop_type_verdict`: "proper_tail" | "two_footed" | "early_pop"
   - `pop_timing_verdict`: "early" | "ideal" | "late"
   - `rotation_axis_verdict`: "clean_flat" | "intentional_cork" | "unstable" | "inverted"
   - `shoulder_drop_cause`: "intentional_lean" | "loss_of_control" | "none"
   - `landing_verdict`: "stomped" | "survived" | "sketchy" | "crash"
   - `drift_verdict`: "straight" | "minor_drift" | "significant_drift"
   - `spin_control_verdict`: "controlled" | "rushed" | "over_rotated" | "under_rotated"
3. WHEN generating verdicts THEN the Backend SHALL use the Pinecone knowledge base to attach relevant coach_tips and fix_instructions
4. WHEN a verdict indicates a problem THEN the Backend SHALL include: problem_description, likely_cause, and recommended_fix from the knowledge base
5. WHEN verdicts are generated THEN the Backend SHALL store them alongside raw metrics for fast retrieval

### Requirement 6.2: Standardized Verdict Response Shape

**User Story:** As a developer, I want all evaluation results to follow a consistent structure, so that LLM prompting and UI rendering are simplified.

#### Acceptance Criteria

1. WHEN any evaluation/verdict is returned THEN it SHALL follow this standardized shape:
   ```
   {
     value: <raw measurement>,
     verdict: <categorical assessment>,
     confidence: <0-100>,
     reasoning: <explanation of how verdict was determined>,
     severity: "none" | "minor" | "moderate" | "critical",
     coach_tip: <actionable advice from knowledge base>
   }
   ```
2. WHEN a measurement has no evaluation component THEN it SHALL return only the value with confidence
3. WHEN coach_tip is not available THEN the field SHALL be null (not omitted)
4. WHEN severity is "critical" THEN the verdict SHALL be prioritized in summaries and highlighted in UI

### Requirement 6.3: Measurement vs Evaluation Separation

**User Story:** As a developer, I want clear separation between raw measurements and evaluations, so that the system is maintainable and interpretations can evolve independently.

#### Acceptance Criteria

1. WHEN storing computed data THEN the Backend SHALL separate into two categories:
   - **Measurements**: Raw values (angles in degrees, distances in meters, velocities in m/s, positions in 3D coordinates)
   - **Evaluations**: Judgments (good/bad/acceptable, verdicts, severity ratings, coach tips)
2. WHEN measurements are stored THEN they SHALL be immutable (never change after computation)
3. WHEN evaluations are stored THEN they MAY be re-computed if interpretation rules change
4. WHEN MCP tools return data THEN they SHALL clearly indicate which fields are measurements vs evaluations

### Requirement 6.4: User-Specified Trick Intent

**User Story:** As a user, I want to specify which trick I'm attempting, so that the system can compare my form against the intended trick rather than guessing.

#### Acceptance Criteria

1. WHEN uploading a video THEN the System SHALL allow the user to specify intended_trick (optional)
2. WHEN intended_trick is specified THEN the Backend SHALL compare against that trick's reference poses
3. WHEN intended_trick is NOT specified THEN the Backend SHALL attempt to infer the trick from rotation count, direction, and grab
4. WHEN inference is used THEN the Backend SHALL return inferred_trick with confidence and alternatives
5. WHEN intended_trick differs from inferred_trick THEN the Backend SHALL flag this discrepancy with explanation

### Requirement 6.5: Acceptable Form Range (Style Tolerance)

**User Story:** As a coach, I want the system to recognize a range of acceptable form variations, so that riders aren't penalized for stylistic differences that still result in successful tricks.

#### Acceptance Criteria

1. WHEN multiple reference poses exist for a trick/phase THEN the Backend SHALL compute an acceptable_range for each metric
2. WHEN comparing user form THEN the Backend SHALL evaluate against the acceptable_range, not just a single ideal
3. WHEN user form falls within acceptable_range THEN the verdict SHALL be "acceptable" or "good" even if not matching the primary reference exactly
4. WHEN user form falls outside acceptable_range THEN the verdict SHALL indicate deviation with severity
5. WHEN storing reference poses THEN the System SHALL support tagging style variations: "compact", "extended", "aggressive", "smooth", "counter_rotated", "squared"

### Requirement 6.6: Knowledge Base Integration for Coach Tips

**User Story:** As a developer, I want verdicts to include relevant coaching tips from the knowledge base, so that feedback is informed by expert tutorial content.

#### Acceptance Criteria

1. WHEN a verdict is generated THEN the Backend SHALL query Pinecone for relevant coaching content
2. WHEN querying Pinecone THEN the Backend SHALL use: trick_name, phase, problem_type as search parameters
3. WHEN relevant content is found THEN the Backend SHALL attach: coach_tip, fix_instructions, common_causes
4. WHEN no relevant content is found THEN the Backend SHALL return generic guidance based on the verdict type
5. WHEN multiple relevant chunks exist THEN the Backend SHALL select the highest relevance_score match

---

## PART 2: MCP TOOLS FOR LLM DATA RETRIEVAL

These tools are lightweight endpoints that retrieve pre-computed data. They do NOT perform computation - they only fetch and format data for the LLM.

### Requirement 7: Get Video Summary Tool

**User Story:** As an LLM, I want to get an overall summary of a video, so that I can understand the key points without fetching all data.

#### Acceptance Criteria

1. WHEN the LLM calls `get_video_summary(videoId)` THEN the tool SHALL return the pre-computed overall summary
2. WHEN returning summary THEN the tool SHALL include: trick_identified, confidence, phases_detected, key_issues, key_positives, recommended_focus_areas
3. WHEN returning summary THEN the tool SHALL include frame counts and duration for context
4. WHEN video is not found THEN the tool SHALL return an error with available videoIds

### Requirement 8: Get Pose Data Tool

**User Story:** As an LLM, I want to get pose data for specific frames or time ranges, so that I can analyze specific moments.

#### Acceptance Criteria

1. WHEN the LLM calls `get_pose_data(videoId, frameNumber)` THEN the tool SHALL return pose data for that specific frame
2. WHEN the LLM calls `get_pose_data(videoId, startFrame, endFrame)` THEN the tool SHALL return pose data for that range
3. WHEN the LLM calls `get_pose_data(videoId, timestamp, duration)` THEN the tool SHALL return pose data for that time range
4. WHEN returning pose data THEN the tool SHALL include: joint_positions_3d, joint_angles, confidence_scores, phase_tag
5. WHEN range is too large (>50 frames) THEN the tool SHALL return sampled data with a warning

### Requirement 9: Get Phase Info Tool

**User Story:** As an LLM, I want to get information about specific phases, so that I can analyze phase-specific technique.

#### Acceptance Criteria

1. WHEN the LLM calls `get_phase_info(videoId, phaseName)` THEN the tool SHALL return pre-computed data for that phase
2. WHEN returning phase info THEN the tool SHALL include: start_frame, end_frame, duration, key_metrics, issues_detected
3. WHEN the LLM calls `get_phase_info(videoId)` without phaseName THEN the tool SHALL return a list of all detected phases
4. WHEN phase is not found THEN the tool SHALL return available phases

### Requirement 10: Get Takeoff Analysis Tool

**User Story:** As an LLM, I want to get detailed takeoff analysis, so that I can provide feedback on pop technique.

#### Acceptance Criteria

1. WHEN the LLM calls `get_takeoff_analysis(videoId)` THEN the tool SHALL return all pre-computed takeoff metrics
2. WHEN returning takeoff analysis THEN the tool SHALL include: takeoff_frame, lip_line, form_metrics (hip_angle, knee_bend, body_openness, spine_angle)
3. WHEN returning takeoff analysis THEN the tool SHALL include: tail_pressure (pop_type, liftoff_delay, weight_distribution)
4. WHEN returning takeoff analysis THEN the tool SHALL include: momentum_analysis (snap_intensity, momentum_transfer, flat_spin_verification)
5. WHEN returning takeoff analysis THEN the tool SHALL include: comparison_to_reference (if available)

### Requirement 11: Get Air Analysis Tool

**User Story:** As an LLM, I want to get detailed air phase analysis, so that I can provide feedback on in-air technique.

#### Acceptance Criteria

1. WHEN the LLM calls `get_air_analysis(videoId)` THEN the tool SHALL return all pre-computed air phase metrics
2. WHEN returning air analysis THEN the tool SHALL include: air_drift (distance, direction, is_straight)
3. WHEN returning air analysis THEN the tool SHALL include: shoulder_alignment (max_drop, drop_frame, is_consistent)
4. WHEN returning air analysis THEN the tool SHALL include: rotation_axis (type, tilt_degrees, stability)
5. WHEN returning air analysis THEN the tool SHALL include: rotation_count, rotation_direction, grab_detected

### Requirement 12: Get Landing Analysis Tool

**User Story:** As an LLM, I want to get detailed landing analysis, so that I can provide feedback on landing technique.

#### Acceptance Criteria

1. WHEN the LLM calls `get_landing_analysis(videoId)` THEN the tool SHALL return all pre-computed landing metrics
2. WHEN returning landing analysis THEN the tool SHALL include: landing_frame, board_angle, landing_stance, landing_quality
3. WHEN returning landing analysis THEN the tool SHALL include: spin_control (is_controlled, counter_rotation_detected)
4. WHEN returning landing analysis THEN the tool SHALL include: absorption_quality (knee_bend_at_impact, straight_leg_pop_detected)

### Requirement 13: Get Form Comparison Tool

**User Story:** As an LLM, I want to get form comparison results, so that I can explain deviations from ideal technique.

#### Acceptance Criteria

1. WHEN the LLM calls `get_form_comparison(videoId, phaseName)` THEN the tool SHALL return pre-computed comparison for that phase
2. WHEN returning comparison THEN the tool SHALL include: similarity_score, major_deviations (keypoint, deviation_amount, direction)
3. WHEN returning comparison THEN the tool SHALL include: prioritized_feedback (ordered by importance)
4. WHEN no reference exists THEN the tool SHALL return a message indicating no reference available for that trick

### Requirement 14: Get Reference Pose Tool

**User Story:** As an LLM, I want to get reference pose data for a trick, so that I can explain what ideal technique looks like.

#### Acceptance Criteria

1. WHEN the LLM calls `get_reference_pose(trickName, phaseName)` THEN the tool SHALL return the stored reference pose
2. WHEN returning reference THEN the tool SHALL include: joint_angles, acceptable_ranges, key_points, common_mistakes
3. WHEN the LLM calls `get_reference_pose(trickName)` without phaseName THEN the tool SHALL return references for all phases
4. WHEN reference is not found THEN the tool SHALL return available tricks and phases

### Requirement 15: Get Trick Rules Tool

**User Story:** As an LLM, I want to get technique rules for a trick, so that I can validate and explain proper form.

#### Acceptance Criteria

1. WHEN the LLM calls `get_trick_rules(trickName, phaseName)` THEN the tool SHALL return structured rules for that phase
2. WHEN returning rules THEN the tool SHALL include: rule_name, expected_value, importance (critical/important/helpful)
3. WHEN the LLM calls `get_common_problems(trickName, phaseName)` THEN the tool SHALL return common mistakes and fixes
4. WHEN returning problems THEN the tool SHALL include: problem_name, indicators, correction, frequency

### Requirement 16: Get Metric Timeline Tool

**User Story:** As an LLM, I want to get metric values over time, so that I can analyze trends and identify specific moments.

#### Acceptance Criteria

1. WHEN the LLM calls `get_metric_timeline(videoId, metricName)` THEN the tool SHALL return that metric's values across all frames
2. WHEN returning timeline THEN the tool SHALL include: frame_number, timestamp, value, phase_tag
3. WHEN returning timeline THEN the tool SHALL identify: peak_frame, min_frame, significant_changes
4. WHEN metric is not found THEN the tool SHALL return available metrics

### Requirement 17: Compare Two Videos Tool

**User Story:** As an LLM, I want to compare two videos, so that I can explain differences between attempts or vs reference.

#### Acceptance Criteria

1. WHEN the LLM calls `compare_videos(videoId1, videoId2, phaseName)` THEN the tool SHALL return pre-computed comparison
2. WHEN returning comparison THEN the tool SHALL align videos by phase (not absolute time)
3. WHEN returning comparison THEN the tool SHALL include: per_metric_comparison, overall_similarity, key_differences
4. WHEN videos have different tricks THEN the tool SHALL return a warning with the comparison anyway

---

## PART 3: REFERENCE POSE LIBRARY MANAGEMENT (Mobile App)

### Requirement 18: Reference Pose Builder Interface

**User Story:** As a coach, I want to upload reference videos and manually tag ideal poses, so that I can build a pose library for each trick.

#### Acceptance Criteria

1. WHEN a user uploads a reference video THEN the System SHALL process it through the standard pipeline
2. WHEN viewing the builder THEN the System SHALL display a frame-by-frame viewer with Previous/Next navigation and keyboard shortcuts
3. WHEN a frame is selected THEN the System SHALL display the pre-computed pose data for that frame
4. WHEN tagging a frame THEN the System SHALL allow selection of: trick_name, phase, stance, quality_rating, notes
5. WHEN a frame is tagged THEN the System SHALL save it to the Reference Pose Database for that specific trick
6. WHEN all relevant frames are tagged THEN the System SHALL allow marking the video as "fully_analyzed" to prevent re-tagging

### Requirement 19: Video Manipulation in Builder

**User Story:** As a coach, I want to flip videos horizontally, so that I can normalize goofy footage to regular orientation.

#### Acceptance Criteria

1. WHEN viewing the builder THEN the System SHALL provide a "Flip Horizontal" button
2. WHEN flip is activated THEN the System SHALL mirror the video display and swap left/right joint labels
3. WHEN saving a flipped reference THEN the System SHALL store it with the normalized (regular) orientation

### Requirement 20: Reference Pose Database CRUD Operations

**User Story:** As a coach, I want full database management capabilities, so that I can maintain and organize the pose library.

#### Acceptance Criteria

1. WHEN viewing the pose library THEN the Mobile_App SHALL display all references in a searchable/sortable table view
2. WHEN searching THEN the Mobile_App SHALL support filtering by: trick_name, phase, stance, quality_rating, source_video, date_added, analyzed_status
3. WHEN adding a reference THEN the Mobile_App SHALL validate required fields and prevent duplicates
4. WHEN editing a reference THEN the Mobile_App SHALL allow updating all fields except pose_data (immutable)
5. WHEN deleting a reference THEN the Mobile_App SHALL require confirmation and support soft-delete with recovery
6. WHEN viewing a reference THEN the Mobile_App SHALL provide a button to view the source video at the tagged frame

### Requirement 21: Trick-Specific Pose Libraries

**User Story:** As a coach, I want separate pose libraries for each trick, so that references are organized and easy to find.

#### Acceptance Criteria

1. WHEN storing a reference pose THEN the System SHALL organize it under the trick_name in a dedicated collection
2. WHEN viewing the library THEN the Mobile_App SHALL display tricks as expandable sections with phase sub-sections
3. WHEN a trick has no references THEN the Mobile_App SHALL display a prompt to add references
4. WHEN multiple references exist for a trick/phase THEN the Mobile_App SHALL allow selecting a "primary" reference for comparisons

### Requirement 22: Video Analysis Status Tracking

**User Story:** As a coach, I want to track which videos have been fully analyzed, so that I don't waste time re-tagging.

#### Acceptance Criteria

1. WHEN viewing processed videos THEN the Mobile_App SHALL display analysis_status: "untagged", "in_progress", "fully_analyzed"
2. WHEN a video is marked "fully_analyzed" THEN the Mobile_App SHALL visually distinguish it in the video list
3. WHEN opening a "fully_analyzed" video THEN the Mobile_App SHALL show a warning before allowing edits
4. WHEN filtering videos THEN the Mobile_App SHALL support filtering by analysis_status

---

## PART 4: POSE CONSISTENCY VALIDATION

### Requirement 21: Multi-Angle Consistency Testing

**User Story:** As a developer, I want to validate pose detection consistency across camera angles, so that I can trust the measurements.

#### Acceptance Criteria

1. WHEN the same trick is filmed from multiple angles THEN the Backend SHALL compare joint angles across all videos
2. WHEN comparing angles THEN the Backend SHALL verify joint angles match within ±5 degrees
3. WHEN comparing poses THEN the Backend SHALL verify relative body proportions remain consistent
4. WHEN inconsistencies are found THEN the Backend SHALL flag which measurements deviate and by how much
5. WHEN the LLM calls `get_consistency_report(videoIds[])` THEN the tool SHALL return the pre-computed consistency analysis

---

## COMPLETE MCP TOOLS LIST (Data Retrieval Only)

All tools retrieve pre-computed data. No computation happens during tool calls.

### Video Overview Tools
1. `get_video_summary(videoId)` - Overall summary with key findings
2. `get_video_metadata(videoId)` - Duration, frame count, fps, stance, trick identified
3. `list_available_videos()` - List all processed videos

### Pose Data Retrieval Tools
4. `get_pose_data(videoId, frame/range/timestamp)` - Raw pose data for specific frames
5. `get_joint_angles(videoId, frame/range)` - Joint angles for specific frames
6. `get_metric_timeline(videoId, metricName)` - Metric values over time

### Phase Analysis Tools
7. `get_phase_info(videoId, phaseName?)` - Phase boundaries and metrics
8. `get_takeoff_analysis(videoId)` - Detailed takeoff metrics
9. `get_air_analysis(videoId)` - Detailed air phase metrics
10. `get_landing_analysis(videoId)` - Detailed landing metrics

### Form Comparison Tools
11. `get_form_comparison(videoId, phaseName)` - Comparison against reference
12. `compare_videos(videoId1, videoId2, phaseName?)` - Compare two videos
13. `get_consistency_report(videoIds[])` - Multi-angle consistency

### Reference Data Tools
14. `get_reference_pose(trickName, phaseName?)` - Ideal pose data
15. `get_trick_rules(trickName, phaseName?)` - Technique rules
16. `get_common_problems(trickName, phaseName?)` - Common mistakes and fixes
17. `list_available_tricks()` - List all tricks with references

### Specific Metric Tools (shortcuts for common queries)
18. `get_rotation_info(videoId)` - Rotation count, direction, speed
19. `get_tail_pressure_analysis(videoId)` - Pop type, timing, weight distribution
20. `get_air_drift_analysis(videoId)` - Drift distance, direction, trajectory
21. `get_shoulder_alignment(videoId)` - Shoulder drop analysis
22. `get_rotation_axis(videoId)` - Axis type, tilt, stability
23. `get_gaze_analysis(videoId)` - Head tracking, spot position, commitment
24. `get_arm_analysis(videoId)` - Arm momentum, trajectory, position
25. `get_snap_analysis(videoId)` - Snap intensity, timing, momentum transfer
26. `get_flat_spin_verification(videoId)` - Flat spin verdict with chest direction and arm throw analysis

### Reference Pose Library Management Tools (for Mobile App)
27. `list_reference_poses(trickName?, phase?, stance?)` - List all references with filters
28. `add_reference_pose(videoId, frameNumber, trickName, phase, stance, qualityRating, notes)` - Add new reference
29. `update_reference_pose(referenceId, updates)` - Update reference metadata
30. `delete_reference_pose(referenceId)` - Soft-delete a reference
31. `set_primary_reference(trickName, phase, referenceId)` - Set primary reference for comparisons
32. `get_video_analysis_status(videoId)` - Get tagging status (untagged/in_progress/fully_analyzed)
33. `set_video_analysis_status(videoId, status)` - Mark video as fully analyzed


---

## PART 5: DATA STRUCTURE REQUIREMENTS

### Requirement 34: Video Analysis Data Schema

**User Story:** As a developer, I want a well-defined data schema for video analysis results, so that all components can reliably read and write data.

#### Acceptance Criteria

1. WHEN storing video analysis THEN the Backend SHALL use this schema:
   ```typescript
   // Trick Enum - All supported tricks
   type TrickName = 
     | "straight_air"
     | "backside_180" | "backside_360" | "backside_540" | "backside_720" | "backside_900" 
     | "backside_1080" | "backside_1260" | "backside_1440" | "backside_1620" | "backside_1800"
     | "backside_1980" | "backside_2160" | "backside_2340"
     | "frontside_180" | "frontside_360" | "frontside_540" | "frontside_720" | "frontside_900"
     | "frontside_1080" | "frontside_1260" | "frontside_1440" | "frontside_1620" | "frontside_1800"
     | "frontside_1980" | "frontside_2160" | "frontside_2340";
   
   // Grab Types
   type GrabType = "method" | "mute" | "melon" | "indy" | "tail" | "nose" | "stalefish" | "roast_beef" | "none";
   
   interface VideoAnalysis {
     videoId: string;
     uploadedAt: timestamp;
     duration: number;
     frameCount: number;
     fps: number;
     
     // User-specified or inferred
     intendedTrick: TrickName | null;
     inferredTrick: { name: TrickName; confidence: number; alternatives: TrickName[] } | null;
     stance: "regular" | "goofy";
     analysisStatus: "processing" | "complete" | "failed" | "untagged" | "in_progress" | "fully_analyzed";
     
     // Phase boundaries (each phase can have sub-phases)
     phases: {
       setupCarve: PhaseData & {
         subPhases?: {
           heelsideToToeside?: PhaseData;  // For backside setup
           toesideToHeelside?: PhaseData;  // For frontside setup
         };
       };
       windUp: PhaseData & {
         timeInCompromisedPosition: number;  // Frames spent wound up (should be ~4 frames)
         compromisedPositionMs: number;      // Time in ms
       };
       snap: PhaseData;
       takeoff: PhaseData & { lipLine: LipLine };
       momentumThroughLip: PhaseData & {    // Critical: chest momentum carrying through lip
         chestMomentumDirection: Vector3;
         momentumCarryThrough: number;       // 0-100 score
         isClean: boolean;
       };
       air: PhaseData & {
         subPhases?: {
           grab?: PhaseData & {              // Grab is a sub-phase of air
             grabType: GrabType;
             grabTiming: "early" | "peak" | "late";
             grabDuration: number;           // Frames held
             rotationDuringGrab: "none" | "rotating" | "counter_rotating";
           };
           rotation1?: PhaseData;
           rotation2?: PhaseData;
           peakHeight?: PhaseData;
         };
       };
       landing: PhaseData;
       rideAway: PhaseData;
     };
     
     // Pre-computed metrics (measurements) - per phase
     measurements: {
       setupCarve: SetupCarveMeasurements;
       windUp: WindUpMeasurements;
       snap: SnapMeasurements;
       takeoff: TakeoffMeasurements;
       momentumThroughLip: MomentumMeasurements;
       air: AirMeasurements;
       landing: LandingMeasurements;
       rideAway: RideAwayMeasurements;
     };
     
     // Pre-computed evaluations (verdicts) - per phase
     evaluations: {
       setupCarve: SetupCarveEvaluations;
       windUp: WindUpEvaluations;
       snap: SnapEvaluations;
       takeoff: TakeoffEvaluations;
       momentumThroughLip: MomentumEvaluations;
       air: AirEvaluations;
       landing: LandingEvaluations;
       rideAway: RideAwayEvaluations;
       overall: OverallEvaluations;
       
       // Critical: Spin Control Analysis
       spinControl: SpinControlEvaluation;
     };
     
     // Comparison results (if reference exists)
     comparison: FormComparison | null;
     
     // Summary for quick access
     summary: VideoSummary;
   }
   
   interface PhaseData {
     startFrame: number;
     endFrame: number;
     confidence: number;
     detectionMethod: string;
   }
   
   // Critical evaluation for spin control
   interface SpinControlEvaluation {
     snapMomentum: "fast" | "medium" | "slow";
     airRotationSpeed: "fast" | "medium" | "slow";
     counterRotationNeeded: boolean;
     counterRotationDetected: boolean;
     counterRotationTiming: "early" | "mid" | "late" | "none";
     landingControl: "controlled" | "rushed" | "over_rotated" | "under_rotated";
     
     // The key insight
     spinControlVerdict: {
       verdict: "sweetspot" | "too_fast_needs_counter" | "too_slow_needs_speed" | "uncontrolled";
       reasoning: string;
       coachTip: string;
     };
   }
   ```

### Requirement 35: Standardized Verdict Schema

**User Story:** As a developer, I want all verdicts to follow a consistent schema, so that UI and LLM can handle them uniformly.

#### Acceptance Criteria

1. WHEN storing any verdict THEN the Backend SHALL use this schema:
   ```typescript
   interface Verdict<T> {
     value: T;                           // Raw measurement
     verdict: string;                    // Categorical assessment
     confidence: number;                 // 0-100
     reasoning: string;                  // How verdict was determined
     severity: "none" | "minor" | "moderate" | "critical";
     coachTip: string | null;           // From knowledge base
     fixInstructions: string | null;    // How to correct
     detectionMethod: string;           // Which algorithm was used
   }
   ```

### Requirement 36: Reference Pose Schema

**User Story:** As a developer, I want a well-defined schema for reference poses, so that the pose library is consistent and queryable.

#### Acceptance Criteria

1. WHEN storing a reference pose THEN the Backend SHALL use this schema:
   ```typescript
   interface ReferencePose {
     referenceId: string;
     trickName: TrickName;
     phase: "setupCarve" | "windUp" | "snap" | "takeoff" | "momentumThroughLip" | "air" | "landing" | "rideAway";
     subPhase: string | null;           // e.g., "heelsideToToeside", "grab", "rotation1"
     stance: "regular" | "goofy";
     
     // For grab references
     grabType: GrabType | null;
     
     // Source info
     sourceVideoId: string;
     frameNumber: number;
     frameImageBase64: string;
     
     // Pose data (immutable)
     joints3D: Joint3D[];
     jointAngles: JointAngles;
     
     // Metadata
     qualityRating: 1 | 2 | 3 | 4 | 5;
     notes: string;
     isPrimary: boolean;
     
     // Timestamps
     createdAt: timestamp;
     updatedAt: timestamp;
     deletedAt: timestamp | null;  // Soft delete
   }
   ```

### Requirement 37: Knowledge Base Integration Schema

**User Story:** As a developer, I want coaching tips linked to specific problems, so that verdicts can include relevant guidance.

#### Acceptance Criteria

1. WHEN storing coaching knowledge THEN the Backend SHALL use this schema:
   ```typescript
   interface CoachingTip {
     tipId: string;
     trickName: string | "*";           // "*" for universal tips
     phase: string | "*";
     problemType: string;               // e.g., "two_footed_pop", "shoulder_drop"
     
     // Content
     description: string;
     likelyCauses: string[];
     fixInstructions: string;
     drillSuggestions: string[];
     
     // Source
     sourceVideoId: string | null;
     sourceTimestamp: number | null;
     sourceText: string;                // Original transcript chunk
     
     // Pinecone
     embedding: number[];
     relevanceScore: number;
   }
   ```

---

## PART 6: BACKEND FUNCTIONS vs MCP TOOLS (Clear Separation)

### Backend Pre-Processing Functions (Computed at Upload Time)

These functions run automatically when a video is uploaded. They compute and store all data BEFORE any LLM interaction.

**IMPORTANT: All calculations leverage the full pose timeline (every frame) stored in the pose library. This enables:**
- Frame-by-frame tracking of all body positions
- Precise detection of transitions and key moments
- Velocity and acceleration calculations from position deltas
- Comparison against reference poses at any point in the trick

| Function | Purpose | Output Stored | Pose Data Used |
|----------|---------|---------------|----------------|
| `extractPoseData()` | Extract 3D joints from all frames | joints3D, jointAngles per frame | Creates the pose timeline |
| `detectPhases()` | Identify all phase boundaries | phases object with start/end frames | Velocity from hip positions |
| `detectSubPhases()` | Identify sub-phases within phases | subPhases within each phase | Body orientation changes |
| `computeSetupCarveMetrics()` | Analyze setup carve quality | arc, edge, transition timing | Hip/shoulder trajectory |
| `computeWindUpMetrics()` | Analyze wind-up duration/intensity | duration, intensity, timeInCompromisedPosition | Chest rotation angle timeline |
| `computeSnapMetrics()` | Analyze snap power/timing | intensity, duration, timing, momentum | Chest rotation velocity |
| `computeTakeoffMetrics()` | Analyze takeoff form | hip angle, knee bend, openness | Full body pose at takeoff frame |
| `computeMomentumThroughLip()` | Analyze chest momentum through lip | chestMomentumDirection, carryThrough score | Chest position delta across frames |
| `detectGrab()` | Detect and classify grab (sub-phase of air) | grab type, timing, duration, rotation during grab | Hand-to-board distance |
| `computeAirMetrics()` | Analyze air phase | drift, rotation, axis, shoulders | Full pose timeline during air |
| `computeSpinControl()` | **CRITICAL**: Analyze spin control dynamics | snapMomentum, counterRotation, sweetspot verdict | Upper/lower body rotation separation |
| `computeJumpMetrics()` | Analyze jump size and landing zone | airTime, jumpSize, knuckleRisk | Hip height timeline |
| `computeLandingMetrics()` | Analyze landing | board angle, absorption, control | Knee angles, body position |
| `computeRideAwayMetrics()` | Analyze ride away | stability, speed, control | Balance indicators |
| `generateEvaluations()` | Convert metrics to verdicts | all evaluations with coach tips | Comparison to reference poses |
| `compareToReference()` | Compare against reference poses | deviation scores, feedback | Per-frame pose comparison |
| `generateSummary()` | Create overall summary | key findings, recommendations | Aggregated from all metrics |

### Spin Control Analysis (Critical Backend Function)

The `computeSpinControl()` function is the most important analysis. It determines:

1. **Snap Momentum**: How fast did the rider snap off the lip?
   - Fast snap = lots of rotational momentum = needs counter-rotation to slow down
   - Slow snap = not enough momentum = needs to speed up rotation in air

2. **Counter-Rotation Detection**: Did the rider counter-rotate their upper body?
   - If snap was fast: counter-rotation is GOOD (slowing down)
   - If snap was slow: counter-rotation is BAD (need to speed up, not slow down)

3. **Sweetspot Verdict**: Is the rider in control?
   - "sweetspot" = controlled rotation, can slow down to land
   - "too_fast_needs_counter" = fast snap, needs counter-rotation (and detected it)
   - "too_slow_needs_speed" = slow snap, needs to speed up rotation
   - "uncontrolled" = rotation is not manageable

### Numeric Spin Metrics (Required for Coaching Feedback)

All spin-related metrics MUST be calculated as numeric values so the LLM can provide specific feedback like "throw harder" or "go faster":

```typescript
interface SpinMetrics {
  // Snap Speed Calculation
  // Measured from chest rotation: fully wound position → through takeoff
  snapSpeed: number;                    // deg/s at takeoff (e.g., 450)
  snapSpeedCategory: "slow" | "medium" | "fast";
  snapSpeedIdealRange: { min: number; max: number };  // e.g., 400-600 for 720
  
  // Wind-up to Snap Tracking
  maxWindUpAngle: number;               // Chest angle at most wound position
  windUpFrame: number;                  // Frame of max wind-up
  chestAngleAtTakeoff: number;          // Chest angle when leaving lip
  snapDuration: number;                 // Frames from wind-up release to takeoff
  
  // Rotational Momentum
  rotationalMomentum: number;           // Arbitrary units, higher = more spin
  momentumCategory: "insufficient" | "optimal" | "excessive";
  
  // CRITICAL: Momentum Loss Detection
  // Detects if rider had good snap but lost momentum right after takeoff
  momentumThroughLip: {
    snapMomentum: number;               // Momentum at snap
    momentumAtLipExit: number;          // Momentum when leaving lip
    momentumLoss: number;               // Difference (should be ~0)
    momentumLossPercent: number;        // % lost (>20% = problem)
    lossDetected: boolean;              // True if significant loss
    lossFrame: number | null;           // Frame where loss occurred
    lossCause: "arm_flail" | "body_open_too_early" | "edge_catch" | "unknown" | null;
  };
  
  // Post-Takeoff Momentum Check (first 5-10 frames after lip)
  postTakeoffMomentum: {
    frame: number;
    rotationSpeed: number;
    momentumRetained: number;           // % of snap momentum retained
  }[];
  
  // Air Rotation Speed
  airRotationSpeed: number;             // deg/s during air
  airRotationSpeedChange: number;       // + = speeding up, - = slowing
  
  // Upper/Lower Body Separation
  upperBodyRotation: number;            // Degrees rotated (upper body)
  lowerBodyRotation: number;            // Degrees rotated (lower body)
  separationDegrees: number;            // Difference (+ = counter-rotating)
  separationTimeline: { frame: number; separation: number }[];
  
  // Rotation Control
  rotationAcceleration: number;         // deg/s² (positive = speeding up)
  peakRotationSpeed: number;            // Max rotation speed during air
  landingRotationSpeed: number;         // Rotation speed at landing
  
  // Actionable Calculations
  degreesShortOfTarget: number;         // e.g., -45 means 45° under-rotated
  degreesOverTarget: number;            // e.g., +30 means 30° over-rotated
  recommendedSnapSpeedAdjustment: number;  // e.g., +50 deg/s means "throw harder"
  recommendedAirAdjustment: string;     // "speed up rotation" or "slow down rotation"
}
```

**Snap Speed Calculation Method:**
1. Detect max wind-up position (chest most rotated away from travel direction)
2. Track chest rotation through snap and takeoff
3. Calculate angular velocity: `(chestAngleAtTakeoff - maxWindUpAngle) / snapDuration`
4. This gives snap speed in degrees per second

**Snap Power Level:**
```typescript
interface SnapPower {
  powerLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  powerDescription: "very_weak" | "weak" | "moderate" | "strong" | "very_strong" | "explosive";
  snapSpeed: number;                    // deg/s
  snapSpeedIdealRange: { min: number; max: number };
}
// Power mapping:
// 1-2: very_weak, 3-4: weak, 5-6: moderate, 7-8: strong, 9: very_strong, 10: explosive
```

**Jump Metrics:**
```typescript
interface JumpMetrics {
  // Air Time (primary measure of jump size)
  airTime: number;                      // Seconds (e.g., 2.4)
  airTimeFrames: number;                // Frame count
  
  // Jump Size Category (based on air time)
  jumpSize: "small" | "medium" | "large" | "XL";
  // small: <1.5s, medium: 1.5-2.5s, large: 2.5-3.5s, XL: >3.5s
  
  // Jump Distance (inferred from air time + approach speed)
  estimatedDistance: number | null;     // Meters (if calculable)
  
  // Peak Height
  peakHeightFrame: number;
  estimatedPeakHeight: number | null;   // Meters above takeoff (if calculable)
  
  // Landing Zone Analysis
  landingZone: {
    hitLanding: boolean;                // Did rider land in the landing zone?
    hitKnuckle: boolean;                // Did rider hit the knuckle (too slow)?
    overshoot: boolean;                 // Did rider overshoot (too fast)?
    landingQuality: "clean" | "knuckle" | "flat" | "overshoot";
  };
  
  // Speed Assessment
  approachSpeed: {
    category: "too_slow" | "optimal" | "too_fast";
    speedForJumpSize: "insufficient" | "appropriate" | "excessive";
    knuckleRisk: boolean;               // True if speed suggests knuckle landing
  };
}
```

**Momentum Loss Detection:**
Even with a good snap, riders can lose momentum right after takeoff due to:
- Arm flailing (arms go wide, slowing rotation)
- Opening body too early (losing compact position)
- Edge catch or balance issue
- Unknown/other factors

The system tracks momentum through the first 5-10 frames after takeoff to detect if the rider "killed" their spin despite a good snap.

These numeric values enable specific coaching feedback:
- "You're rotating at 380°/s but need 450°/s for a clean 720 - throw harder off the lip"
- "Your upper body is 25° ahead of your lower body - good counter-rotation"
- "You landed 45° short - increase snap speed by ~15%"
- "Good snap (420°/s) but you lost 35% of your momentum right after takeoff - keep your arms tight"

### MCP Tools (Data Retrieval for LLM)

These tools are lightweight endpoints that retrieve pre-computed data. They do NOT compute - they only fetch.

| Tool | Purpose | Returns |
|------|---------|---------|
| `get_video_summary(videoId)` | Quick overview | summary object |
| `get_video_metadata(videoId)` | Basic info | duration, fps, stance, trick |
| `get_pose_data(videoId, frame)` | Raw pose for frame | joints3D, angles |
| `get_phase_info(videoId, phase)` | Phase boundaries + metrics | phase data + measurements |
| `get_phase_evaluation(videoId, phase)` | Phase verdicts | evaluations with coach tips |
| `get_takeoff_analysis(videoId)` | All takeoff data | measurements + evaluations |
| `get_air_analysis(videoId)` | All air data | measurements + evaluations |
| `get_landing_analysis(videoId)` | All landing data | measurements + evaluations |
| `get_form_comparison(videoId)` | Comparison results | deviations, feedback |
| `get_reference_pose(trick, phase)` | Ideal pose | reference pose data |
| `get_trick_rules(trick, phase)` | Technique rules | rules with importance |
| `get_common_problems(trick, phase)` | Known issues | problems with fixes |

---

## SUMMARY: COMPLETE TOOL LIST (33 Tools)

### Video Overview (3)
1. `get_video_summary(videoId)`
2. `get_video_metadata(videoId)`
3. `list_available_videos()`

### Pose Data (3)
4. `get_pose_data(videoId, frame/range)`
5. `get_joint_angles(videoId, frame/range)`
6. `get_metric_timeline(videoId, metricName)`

### Phase Analysis (4)
7. `get_phase_info(videoId, phaseName?)`
8. `get_takeoff_analysis(videoId)`
9. `get_air_analysis(videoId)`
10. `get_landing_analysis(videoId)`

### Form Comparison (3)
11. `get_form_comparison(videoId, phaseName)`
12. `compare_videos(videoId1, videoId2, phaseName?)`
13. `get_consistency_report(videoIds[])`

### Reference Data (4)
14. `get_reference_pose(trickName, phaseName?)`
15. `get_trick_rules(trickName, phaseName?)`
16. `get_common_problems(trickName, phaseName?)`
17. `list_available_tricks()`

### Specific Metrics (11)
18. `get_rotation_info(videoId)` - Rotation count, direction, speed
19. `get_tail_pressure_analysis(videoId)` - Pop type, timing, weight distribution
20. `get_air_drift_analysis(videoId)` - Drift distance, direction, trajectory
21. `get_shoulder_alignment(videoId)` - Shoulder drop analysis
22. `get_rotation_axis(videoId)` - Axis type, tilt, stability
23. `get_gaze_analysis(videoId)` - Head tracking, spot position, commitment
24. `get_arm_analysis(videoId)` - Arm momentum, trajectory, position
25. `get_snap_analysis(videoId)` - Snap power (1-10), speed, momentum transfer
26. `get_flat_spin_verification(videoId)` - Flat spin verdict with chest direction
27. `get_spin_control_analysis(videoId)` - **CRITICAL**: Snap momentum, counter-rotation, sweetspot verdict
28. `get_jump_metrics(videoId)` - Air time, jump size, landing zone, knuckle risk

### Reference Library Management (7)
28. `list_reference_poses(trickName?, phase?, stance?)`
29. `add_reference_pose(videoId, frameNumber, trickName, phase, stance, qualityRating, notes)`
30. `update_reference_pose(referenceId, updates)`
31. `delete_reference_pose(referenceId)`
32. `set_primary_reference(trickName, phase, referenceId)`
33. `get_video_analysis_status(videoId)`
34. `set_video_analysis_status(videoId, status)`
