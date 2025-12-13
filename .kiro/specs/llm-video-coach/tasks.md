# Implementation Plan: LLM-Powered Video Coaching System

- [x] 1. Set up Node.js backend infrastructure and load phase-based knowledge base



  - Create Express.js server with TypeScript configuration
  - Set up environment variables for LLM API keys, storage paths, cache settings
  - Configure multer for video file uploads with size limits and format validation
  - Load phase-based knowledge base from MongoDB or JSON files (tricks, phases, requirements, problems, fixes)
  - Set up error handling middleware and request logging
  - _Requirements: 1.1, 1.5, 5.1, 12.1_

- [ ]* 1.1 Write unit tests for server initialization
  - Test Express app creation and middleware setup
  - Test environment variable loading
  - Test error handling middleware
  - _Requirements: 1.1_


- [ ] 2. Implement video frame extraction service
  - Create FFmpeg wrapper to extract frames at 4 FPS from uploaded videos
  - Store extracted frames with timestamps in temporary directory
  - Implement frame caching with 24-hour TTL
  - Return frame metadata (count, duration, paths)
  - _Requirements: 1.2, 1.3, 1.4, 10.1_

- [ ]* 2.1 Write property test for frame extraction completeness
  - **Property 1: Frame Extraction Completeness**
  - **Validates: Requirements 1.2, 1.3**

- [ ]* 2.2 Write unit tests for frame extraction
  - Test frame extraction with various video formats (MP4, MOV, WebM)
  - Test frame count accuracy for known video durations
  - Test timestamp preservation
  - Test cache hit/miss behavior
  - _Requirements: 1.2, 1.3, 1.4_


- [ ] 3. Implement pose estimation service
  - Integrate MediaPipe or MoveNet for skeletal keypoint detection
  - Create service to run pose estimation on extracted frames
  - Cache pose results with 24-hour TTL
  - Handle frames where pose detection fails gracefully
  - _Requirements: 2.1, 2.2, 2.3_


- [ ] 3.5 Implement phase detection service
  - Create service to identify trick phases from frame sequences (setup carve, windup/snap, grab, landing)
  - Implement phase boundary detection using pose keypoints and motion analysis
  - Create phase-to-frame mapping for the video
  - Integrate with LLM for phase transition identification when boundaries are unclear
  - Implement continuous spotting evaluation (head gaze tracking throughout trick)
  - _Requirements: 1.5, 1.4, 1.5.5_

- [ ]* 3.6 Write property test for phase detection accuracy
  - **Property 5: Phase Detection Accuracy**
  - **Validates: Requirements 1.5, 1.4**

- [ ]* 3.7 Write unit tests for phase detection
  - Test phase boundary detection with known videos
  - Test phase-to-frame mapping accuracy
  - Test LLM-assisted phase identification
  - _Requirements: 1.5, 1.4_

- [ ]* 3.1 Write property test for pose data consistency
  - **Property 2: Pose Data Consistency**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 3.2 Write unit tests for pose estimation
  - Test pose detection on synthetic frames with known poses
  - Test keypoint confidence scores
  - Test graceful degradation when pose detection fails

  - Test cache behavior for pose data
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Implement comprehensive snowboarding-specific feature extraction

  - Create head gaze detection (direction and angle tracking, where is the head looking at all points in the trick? Before lip of jump, should be looking at the jump takeoff. After the takeoff of the jump, should be spotting for the trick or landing)
  - Create stance detection (regular vs goofy)
  - Create upper/lower body rotation detection (leading, following, aligned. Calculate with degrees of separation)
  - Create body stack detection (weight distribution: forward, centered, back, backfoot, toeside, or heelside, toeside forward, toeside backfoot, they can be combined)
  - Create leg bend measurement (ensure minimum 10-15% bend maintained)
  - Create straight-leg pop detection (identify when rider pops to straight legs)
  - Create edge detection heuristic (toe edge vs heel edge from frame analysis)
  - Create board angle estimation from visual cues
  - Create rotation counter (count full rotations and direction)
  - Create jump size estimation (height and distance)
  - Create snap intensity measurement across frame sequences
  - Create windup duration measurement
  - Create momentum transfer detection (true transfer vs momentum loss)
  - Create arm momentum detection for rotation consistency
  - Create arm trajectory tracking (before and after takeoff)
  - Create spin axis detection (vertical, forward lean, backward lean, sideways lean with alignment score)
  - Create takeoff openness detection (assess if rider is winding up for prolonged period right before takeoff, we need a clean snap with arm momentum)
  - Create spin control detection (counter-rotation on landing)
  - Create approach speed estimation
  - Create setup carve arc analysis
  - Create stability metric calculation across frame sequences
  - Create snap timing calculation (does snap carry momentum through lip?)
  - Create compromised position detection (for spins, is person wound up for too long? Should only be ~4 frames)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_

- [ ]* 4.1 Write property test for feature extraction validity
  - **Property 3: Feature Extraction Validity**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ]* 4.1 Write property test for biomechanical metric accuracy
  - **Property 13: Biomechanical Metric Accuracy**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10**

- [ ]* 4.2 Write unit tests for feature extraction
  - Test head gaze detection with various head positions
  - Test stance detection (regular vs goofy)
  - Test leg bend measurement accuracy
  - Test rotation counting accuracy
  - Test jump size estimation
  - Test arm trajectory tracking
  - Test spin control detection
  - Test approach speed estimation
  - Test setup carve arc analysis
  - Test edge detection with known frame patterns
  - Test board angle estimation accuracy
  - Test stability calculation across frame sequences
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_

- [x] 5. Implement phase-based knowledge base loading and RAG


  - Load phase-based knowledge base (tricks, phases, requirements, problems, fixes)
  - Create embeddings for knowledge base entries using OpenAI embeddings API
  - Set up vector storage (in-memory or Pinecone) for semantic search
  - Implement phase-specific RAG query function to retrieve relevant context for each phase
  - Implement trick-specific RAG query function to retrieve trick requirements and progressions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 5.1 Write unit tests for knowledge base integration
  - Test knowledge base loading from files
  - Test embedding generation
  - Test RAG retrieval accuracy
  - Test knowledge base update propagation
  - _Requirements: 5.1, 5.2, 5.3_


- [ ] 6. Implement phase-based LLM orchestration and analysis
  - Create system prompt for LLM coaching persona with phase-based analysis framework
  - Implement function to analyze each phase separately with phase-specific frames
  - Implement function to batch frames by phase and send to multimodal LLM (GPT-4V or Claude 3.5)
  - Implement frame sampling strategy to reduce token usage while preserving phase transitions
  - Parse LLM response into structured phase-based coaching feedback
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.1, 8.2_

- [ ]* 6.1 Write property test for phase-specific analysis grounding
  - **Property 4: Phase-Specific Analysis Grounding**
  - **Validates: Requirements 1.5, 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ]* 6.2 Write unit tests for LLM orchestration
  - Test frame batching logic
  - Test system prompt injection
  - Test response parsing into structured feedback
  - Test token usage calculation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_


- [ ] 7. Implement phase-specific knowledge base context injection
  - Create function to retrieve phase-specific requirements for each phase
  - Create function to retrieve common problems and fixes for each phase
  - Implement context injection into LLM prompts for each phase
  - Ensure LLM references phase-specific knowledge base in feedback
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 7.1 Write property test for phase-specific knowledge base relevance
  - **Property 6: Phase-Specific Knowledge Base Relevance**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ]* 7.2 Write unit tests for context injection
  - Test context retrieval for various video types
  - Test context formatting for LLM consumption
  - Test knowledge base reference tracking

  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Implement phase-based coaching feedback generation
  - Create response parser to extract structured feedback from LLM output organized by phase
  - Implement feedback formatting with phase names, frame numbers, and timestamps
  - Create feedback validation to ensure all issues reference valid frames within the correct phase
  - Implement phase requirement validation (which requirements were met, which were not)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 8.1 Write property test for phase-specific feedback actionability
  - **Property 7: Phase-Specific Feedback Actionability**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ]* 8.2 Write unit tests for feedback generation
  - Test response parsing from LLM
  - Test frame reference validation
  - Test timestamp accuracy

  - Test feedback formatting
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Implement multi-frame motion reasoning
  - Create frame sequence grouping by trick phase (setup carve, windup/snap, grab, landing)
  - Implement LLM prompting for motion analysis across frame sequences
  - Create motion inference validation against pose keypoint trajectories
  - Implement continuous spotting evaluation across all phases
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 9.1 Write property test for phase-aware multi-frame reasoning consistency
  - **Property 8: Phase-Aware Multi-Frame Reasoning Consistency**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [ ]* 9.1.1 Write property test for continuous spotting evaluation
  - **Property 8.1: Continuous Spotting Evaluation**
  - **Validates: Requirements 1.5.5, 6.8**

- [ ]* 9.2 Write unit tests for motion reasoning
  - Test frame sequence grouping

  - Test motion inference accuracy
  - Test consistency with pose trajectories
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 10. Implement cost optimization strategies
  - Create frame sampling algorithm (e.g., keyframe detection, adaptive sampling)
  - Implement progressive analysis (analyze problem frames in detail)
  - Create token usage tracking and cost estimation
  - Implement batch processing for multiple videos
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 10.1 Write property test for cost optimization effectiveness
  - **Property 9: Cost Optimization Effectiveness**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [x]* 10.2 Write unit tests for cost optimization

  - Test frame sampling strategies
  - Test token usage calculation
  - Test cost estimation accuracy
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Implement error handling and fallbacks
  - Create error handlers for video upload failures
  - Implement graceful degradation when pose estimation fails
  - Create LLM API error handling with retry logic
  - Implement partial result return on timeout
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 11.1 Write property test for error recovery completeness
  - **Property 10: Error Recovery Completeness**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ]* 11.2 Write unit tests for error handling
  - Test video upload error scenarios
  - Test pose estimation failure handling
  - Test LLM API error handling
  - Test timeout handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Implement caching layer

  - Create Redis or in-memory cache for frames, pose data, and analysis results
  - Implement 24-hour TTL for frame and pose caches
  - Implement 7-day TTL for analysis results
  - Create cache invalidation logic
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 12.1 Write property test for cache consistency
  - **Property 11: Cache Consistency**
  - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ]* 12.2 Write unit tests for caching
  - Test cache hit/miss behavior
  - Test TTL expiration
  - Test cache invalidation
  - Test cache key generation
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 13. Implement chat interface and session management


  - Create chat session storage (in-memory or database)
  - Implement message history tracking
  - Create follow-up question handler that references video analysis
  - Implement frame-specific query handler
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 13.1 Write unit tests for chat interface
  - Test session creation and management
  - Test message history tracking
  - Test follow-up question context preservation
  - Test frame-specific queries
  - _Requirements: 11.1, 11.2, 11.3, 11.4_



- [ ] 14. Implement chat API endpoints
  - Create POST /api/chat/upload endpoint for video upload
  - Create POST /api/chat/message endpoint for follow-up questions
  - Create GET /api/chat/session/:sessionId endpoint for session retrieval
  - Create GET /api/chat/frame/:videoId/:frameNumber endpoint for frame details
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 14.1 Write property test for chat context preservation
  - **Property 12: Chat Context Preservation**
  - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [ ]* 14.2 Write integration tests for chat API
  - Test video upload flow
  - Test follow-up question flow
  - Test session persistence
  - Test frame retrieval

  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 15. Implement performance monitoring and SLA tracking
  - Create timing instrumentation for each pipeline stage
  - Implement SLA tracking (30s frame extraction, 60s pose estimation, 120s total)
  - Create performance logging and alerting
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ]* 15.1 Write property test for performance SLA compliance
  - **Property 14: Performance SLA Compliance**
  - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ]* 15.2 Write performance tests
  - Test frame extraction timing for various video lengths
  - Test pose estimation timing for different frame counts
  - Test biomechanical metric extraction timing


  - Test end-to-end latency
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 16. Integrate with React Native mobile app
  - Update mobile app to support video upload from device camera or gallery
  - Implement video upload progress tracking

  - Create chat UI for coaching feedback display
  - Implement frame viewer for detailed analysis
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 16.1 Implement real-time detection visualization overlay
  - Create VideoAnalysisOverlay component with SVG rendering
  - Draw snowboard outline (green dashed rectangle) with rotation angle
  - Draw snowboard path trail (phase-colored dots showing trajectory)
  - Draw pose skeleton (stick figure with joints and bones)
  - Implement detection indicators panel (right side showing metrics)
  - Add phase label indicator (top-left with color coding)
  - Create detection info badges (bottom panel with real-time metrics)
  - Color scheme: Red (setup) → Orange (windup) → Yellow (throw) → Cyan (lip timing) → Green (takeoff)
  - Display metrics: head gaze, body stack, leg bend angle, upper body rotation degrees, edge type, snap intensity
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 16.2 Write unit tests for visualization components
  - Test snowboard outline rendering with various angles
  - Test path trail rendering with phase colors
  - Test pose skeleton rendering with keypoints
  - Test detection badge rendering with metrics
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x]* 16.3 Write integration tests for mobile app

  - Test video upload from mobile
  - Test chat message display

  - Test frame viewer functionality
  - Test visualization overlay rendering during playback
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 18. Performance testing and optimization
  - Load test with 100+ concurrent video uploads
  - Measure LLM API latency and token usage
  - Optimize frame sampling for cost reduction
  - Verify SLA compliance under load
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

</content>
</invoke>