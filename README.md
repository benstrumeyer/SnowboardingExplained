# Snowboarding Coach AI

An AI-powered snowboarding coach mobile app with real-time form analysis. Upload your trick videos to get instant biomechanical feedback, or chat with your pocket coach trained on Snowboarding Explained YouTube content.

## Overview

This system provides two complementary coaching experiences:

1. **Form Analysis** - Upload trick videos to get detailed biomechanical analysis with frame-by-frame feedback on technique
2. **Knowledge Chat** - Chat interface trained on Snowboarding Explained YouTube content for conceptual coaching

The form analysis system uses a two-phase architecture:
- **Backend Pre-Processing**: Automatically extracts pose data, detects trick phases, computes metrics, and generates verdicts when videos are uploaded
- **MCP Tools Layer**: Lightweight data retrieval endpoints that allow the LLM to query pre-computed results on-demand

## Key Features

### Form Analysis
- **Real-Time Pose Detection** - Extract 3D joint positions from uploaded videos using 4D-Humans model
- **Automatic Phase Detection** - Identify 6 trick phases: setupCarve → windUp → snap → takeoff → air → landing
- **Biomechanical Metrics** - Compute form metrics per phase (pop timing, body stackedness, rotation axis, etc.)
- **Technique Verdicts** - Convert raw measurements into coaching language (e.g., "proper_tail", "clean_flat", "stomped")
- **Reference Comparison** - Compare user form against ideal poses for each trick/phase
- **Coach Tips Integration** - Attach relevant coaching content from Pinecone knowledge base to each verdict
- **Frame-by-Frame Feedback** - LLM analyzes specific frames to provide targeted corrections

### Knowledge Chat
- **Guided Coaching Flow** - Structured questions to understand your trick, skill level, and issues
- **AI-Powered Responses** - Natural language coaching using Gemini 1.5 Flash
- **Video References** - Every response includes relevant video clips with timestamps
- **Cost-Optimized** - Smart caching and local processing to minimize API costs
- **Offline-Capable** - Transcripts and embeddings stored locally
- **ChatGPT-Style UI** - Familiar, clean mobile interface

## Tech Stack

### Mobile App
- React Native (Expo)
- TypeScript
- NativeWind + twrnc (Tailwind styling)
- React Navigation
- Expo Video (video playback)
- Frame carousel for reference video tagging

### Backend - Form Analysis
- Node.js + TypeScript
- MongoDB (video analysis storage)
- 4D-Humans pose estimation (WSL service)
- MCP (Model Context Protocol) for LLM tool integration
- Pinecone (coaching tips knowledge base)

### Backend - Knowledge Chat
- Vercel Serverless Functions
- TypeScript
- Google Gemini 1.5 Flash API
- Pinecone (vector database)
- Vercel KV (caching)

### Data Pipeline
- YouTube transcript scraper
- Sentence embeddings
- Vector similarity search
- Reference pose library management

## Project Structure

```
SnowboardingExplained/
├── mobile/                      # React Native app
│   ├── src/
│   │   ├── screens/            # App screens (VideoCoachScreen, ReferenceVideoScreen)
│   │   ├── components/         # Reusable components (FrameCarousel, AnalysisPanel)
│   │   ├── services/           # API services
│   │   ├── hooks/              # Custom hooks
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utilities
│   └── app.json
├── backend/                     # Node.js API
│   ├── src/
│   │   ├── types/
│   │   │   ├── formAnalysis.ts # Form analysis type definitions
│   │   │   └── types.ts        # Legacy types
│   │   ├── services/           # Business logic
│   │   │   ├── videoAnalysisPipeline.ts    # Pre-processing pipeline
│   │   │   ├── metricsComputation.ts       # Metric calculations
│   │   │   └── chatService.ts              # Chat logic
│   │   ├── utils/
│   │   │   ├── phaseDetector.ts            # Phase detection algorithm
│   │   │   └── analysisLogger.ts           # Logging utilities
│   │   ├── api/                # API endpoints
│   │   └── routes/             # Route definitions
│   ├── mcp-server/             # MCP tools for LLM
│   │   ├── src/
│   │   │   ├── tools/          # MCP tool implementations
│   │   │   │   ├── poseRetrieval.ts       # Pose data tools
│   │   │   │   ├── phaseAnalysis.ts       # Phase analysis tools
│   │   │   │   ├── criticalAnalysis.ts    # Spin control, jump metrics
│   │   │   │   ├── formComparison.ts      # Comparison tools
│   │   │   │   ├── referenceData.ts       # Reference pose tools
│   │   │   │   ├── referenceLibrary.ts    # Library management
│   │   │   │   ├── coachingKnowledge.ts   # Coaching tips
│   │   │   │   └── videoOverview.ts       # Summary tools
│   │   │   ├── db/
│   │   │   │   ├── connection.ts          # MongoDB connection
│   │   │   │   └── schemas.ts             # Collection schemas
│   │   │   └── index.ts         # MCP server entry point
│   │   └── package.json
│   ├── pose-service/           # Python pose extraction (WSL)
│   │   ├── app.py              # Flask service
│   │   ├── video_processor.py   # Video frame extraction
│   │   ├── hybrid_pose_detector.py # Pose detection
│   │   └── 4D-Humans/          # 4D-Humans model
│   └── package.json
├── data-pipeline/              # Transcript & reference processing
│   ├── scripts/
│   │   ├── scrape-trick-playlist.ts
│   │   ├── generate-video-summaries.ts
│   │   ├── upload-trick-tutorials.ts
│   │   └── semantic-chunker.ts
│   └── data/
│       ├── chunks/             # Semantic chunks
│       ├── trick-tutorials/    # Reference video metadata
│       └── all-videos.json     # Video database
├── .kiro/
│   ├── specs/
│   │   └── form-analysis-mcp-tools/
│   │       ├── requirements.md  # 22 acceptance criteria
│   │       ├── design.md        # Architecture & data models
│   │       └── tasks.md         # 18 implementation tasks
│   └── steering/               # Development guidelines
└── docs/                       # Documentation
    ├── SETUP.md               # Installation guide
    └── MCP_TOOLS_REFERENCE.md # MCP tool documentation
```

## Form Analysis Architecture

### Two-Phase Design

**Phase 1: Backend Pre-Processing (at video upload)**
- Extract pose data for every frame using 4D-Humans model
- Detect 6 trick phases using pose-based signals (no LLM)
- Compute biomechanical metrics per phase
- Generate technique verdicts with Pinecone coaching tips
- Compare against reference poses
- Store all results in MongoDB for instant retrieval

**Phase 2: MCP Tools for LLM (on-demand queries)**
- 23 lightweight data retrieval tools
- LLM starts with minimal context (video summary)
- Progressively fetches only needed data via tool calls
- Fast responses (no waiting for computation)
- Minimal token usage (pre-computed results)

### 6 Trick Phases

1. **setupCarve** - Final approach into jump (includes edgeChange sub-phase)
2. **windUp** - Build rotational tension (null for straight airs)
3. **snap** - Explosive release through takeoff (null for straight airs)
4. **takeoff** - Single frame when board leaves lip
5. **air** - Airborne phase (includes optional grab sub-phase)
6. **landing** - Board contact through ride-away stabilization

### Trick-Type Aware Detection

- **straight_air** - No windup/snap, focus on body stackedness
- **frontside** - Windup on heelside edge, snap throws off takeoff
- **backside** - Windup simultaneous with edge change, momentum continues through air

### 23 MCP Tools

**Video Overview (3)**: get_video_summary, get_video_metadata, list_available_videos

**Pose Retrieval (4)**: get_pose_at_frame, get_poses_in_range, get_phase_poses, get_key_moment_poses

**Phase Analysis (4)**: get_phase_info, get_takeoff_analysis, get_air_analysis, get_landing_analysis

**Critical Analysis (2)**: get_spin_control_analysis, get_jump_metrics

**Form Comparison (2)**: get_form_comparison, compare_videos

**Reference Data (4)**: get_reference_pose, get_trick_rules, get_common_problems, list_available_tricks

**Reference Library (3)**: list_reference_poses, add_reference_pose, set_video_analysis_status

**Coaching Knowledge (1)**: get_coaching_tips

## Cost Analysis

**One-time Setup:**
- Scrape ~200 videos: FREE
- Generate embeddings: ~$0.50
- Build reference pose library: FREE (manual tagging)
- Total: $0.50

**Per User Session:**
- Video upload & pose extraction: ~$0.001 (4D-Humans inference)
- Form analysis: FREE (pre-computed)
- Chat query: $0.00004 (Gemini Flash)
- Caching reduces by 80%

**Monthly (1000 users, 5 sessions each):**
- Form analysis: ~$5 (pose extraction)
- Chat: $0.04 (with caching)
- Total: ~$5.04/month

## Development Phases

### MVP Phase (Tasks 1-6)
Focus on validating pose detection algorithm:
1. Database schema & TypeScript types
2. Phase detection system (pose-based signals)
3. Pose extraction integration
4. MCP tools - pose retrieval
5. MCP tools - phase analysis
6. Video upload pipeline

### Post-MVP Phase (Tasks 7-18)
Full feature implementation:
- Backend pre-processing functions (17 total)
- All 23 MCP tools
- Reference pose library management
- Pinecone integration for coach tips
- Mobile app reference video upload screen
- Testing & documentation

See `.kiro/specs/form-analysis-mcp-tools/` for detailed specification and implementation tasks.

## Getting Started

See `docs/SETUP.md` for installation and setup instructions.
