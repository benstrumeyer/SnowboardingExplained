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
- **LLM Analysis via MCP Tools** - LLM calls 23 tools to fetch pre-computed data and generate comprehensive coaching response

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
- **4D-Humans** - Advanced human pose reconstruction and tracking using Transformers ([GitHub](https://github.com/shubham-goel/4D-Humans))
  - Extracts 3D joint positions from video frames
  - Runs on WSL service for GPU acceleration
  - Provides per-frame pose data with confidence scores
- **ViTDet** - Vision Transformer backbone for object detection ([Hugging Face](https://huggingface.co/docs/transformers/en/model_doc/vitdet))
  - Used for robust person detection in frames
  - Enables accurate pose estimation even in challenging angles
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

**Phase 2: LLM Analysis via MCP Tools (after pre-processing completes)**
- Backend initiates LLM call with video summary
- LLM calls MCP tools to fetch pre-computed data as needed
- LLM queries: get_takeoff_analysis, get_spin_control_analysis, get_air_analysis, etc.
- LLM generates one comprehensive coaching response
- All computation already done—LLM just interprets and coaches
- Fast response (no waiting for analysis)

## Mesh Data Management

### Stale Mesh Data Fix (December 2025)

The system now properly handles multiple video uploads with correct mesh data isolation:

**Problem Solved:**
- Previously, uploading a second video would display the first video's mesh
- Root cause: Frame extraction cache used only first 8 characters of videoId, causing collisions
- Both videos `v_1766516045056_1` and `v_1766516091051_2` mapped to same cache directory `v_176651`

**Solution Implemented:**
- Frame extraction now uses full videoId for unique cache directories
- MeshDataService implements three-layer verification:
  1. **Deletion Verification** - Confirms old frames deleted before new insertion
  2. **Insertion Verification** - Confirms all new frames saved with correct videoId
  3. **Retrieval Verification** - Confirms retrieved frames have correct videoId
- MongoDB stores mesh data in two collections:
  - `mesh_data` - Video metadata (fps, duration, frame count)
  - `mesh_frames` - Individual frame data with keypoints and mesh vertices

**Architecture:**
```
Upload Video
    ↓
Extract Frames (unique cache per videoId)
    ↓
Extract Pose Data
    ↓
Delete Old Mesh Data (Layer 1)
    ↓
Insert New Frames (Layer 2)
    ↓
Verify Insertion (Layer 3)
    ↓
Frontend Fetches Mesh Data
    ↓
Retrieve with VideoId Verification (Layer 3)
    ↓
Display Correct Mesh
```

**Key Components:**
- `meshDataService.ts` - MongoDB operations with verification
- `frameExtraction.ts` - Frame caching with unique directories
- `server.ts` - Upload endpoint with mesh data persistence
- `query-mesh-db.js` - Diagnostic tool for database inspection

## Three.js Web Visualization

### Real-Time 3D Mesh Rendering

The web interface provides interactive 3D visualization of rider pose and mesh data using Three.js:

**Features:**
- **3D Skeleton Visualization** - Render 24 SMPL joints as interactive 3D skeleton
- **Mesh Overlay** - Display mesh vertices and faces on top of skeleton
- **Frame-by-Frame Playback** - Scrub through video frames with synchronized mesh updates
- **Interactive Controls** - Rotate, zoom, and pan the 3D scene
- **Multiple Mesh Modes** - Toggle between skeleton-only, mesh-only, and combined views
- **Floating Control Panel** - Adjustable UI for playback and visualization settings

### Architecture

**Frontend Components:**
- `PoseOverlayViewer.tsx` - Main 3D viewer component using Three.js
- `SyncedSceneViewer.tsx` - Synchronized video and mesh playback
- `VideoFrameRenderer.tsx` - Frame extraction and rendering
- `FloatingControlPanel.tsx` - Playback controls and settings

**Services:**
- `meshDataService.ts` - Fetch mesh data from backend
- `playbackSyncService.ts` - Synchronize video and mesh playback
- `frameDataService.ts` - Manage frame data and caching
- `overlayToggleService.ts` - Toggle mesh visualization modes

**Hooks:**
- `usePlaybackSync.ts` - Manage playback state and synchronization
- `useFrameData.ts` - Load and cache frame data

### Three.js Scene Setup

```typescript
// Scene hierarchy
Scene
├── Camera (perspective)
├── Lighting
│   ├── Ambient light (uniform illumination)
│   └── Directional light (shadows)
├── Skeleton (LineSegments for joints and bones)
├── Mesh (BufferGeometry with vertices and faces)
└── Grid (reference plane)
```

### Mesh Data Flow

1. **Upload Video** → Backend extracts pose and mesh data
2. **Store in MongoDB** → `mesh_data` and `mesh_frames` collections
3. **Frontend Fetches** → Request mesh data for specific videoId
4. **Render in Three.js** → Create BufferGeometry from vertices/faces
5. **Playback Sync** → Update mesh as video plays frame-by-frame
6. **Interactive Controls** → User can rotate, zoom, and scrub through frames

### Performance Optimizations

- **Frame Caching** - Cache mesh data in memory to avoid repeated API calls
- **Lazy Loading** - Load mesh data only when needed
- **Geometry Reuse** - Reuse Three.js geometries across frames
- **Efficient Updates** - Update only changed vertices between frames
- **WebGL Rendering** - Hardware-accelerated 3D rendering

### Visualization Modes

1. **Skeleton Mode** - Show 24 SMPL joints connected by bones
2. **Mesh Mode** - Show mesh vertices and faces
3. **Combined Mode** - Show both skeleton and mesh
4. **Wireframe Mode** - Show mesh as wireframe for clarity

### Playback Controls

- **Play/Pause** - Control video and mesh playback
- **Frame Scrubbing** - Jump to specific frame
- **Speed Control** - Adjust playback speed (0.5x to 2x)
- **Frame Counter** - Display current frame and total frames
- **Mesh Toggle** - Show/hide mesh overlay
- **Camera Reset** - Reset 3D camera to default view

### Browser Compatibility

- **Chrome/Edge** - Full support with WebGL 2.0
- **Firefox** - Full support with WebGL 2.0
- **Safari** - Supported with WebGL 1.0 fallback
- **Mobile Browsers** - Touch controls for rotation and zoom

## Backend Services

### Core Services

#### MeshDataService (`backend/src/services/meshDataService.ts`)
Manages all MongoDB operations for mesh data persistence and retrieval with three-layer verification.

**Key Methods:**
- `connect()` - Establish MongoDB connection with authentication
- `saveMeshData(meshData)` - Save mesh data with deletion, insertion, and retrieval verification
- `getMeshData(videoId)` - Retrieve mesh data with videoId integrity checks
- `getFrame(videoId, frameNumber)` - Get single frame by videoId and frame number
- `getFrameRange(videoId, startFrame, endFrame)` - Get frame range
- `getMeshDataByIds(videoIds)` - Batch retrieve mesh data for multiple videos
- `deleteMeshData(videoId)` - Delete mesh data for specific video
- `getAllMeshData()` - Retrieve all mesh data entries
- `disconnect()` - Close MongoDB connection

**Collections:**
- `mesh_data` - Video metadata (fps, duration, frame count, role)
- `mesh_frames` - Individual frame data (keypoints, mesh vertices, skeleton)

#### FrameExtractionService (`backend/src/services/frameExtraction.ts`)
Extracts frames from videos with intelligent caching and frame rate normalization.

**Key Methods:**
- `extractFrames(videoPath, videoId, fps, frameIndices)` - Extract frames from video
- `getCachedFrames(videoId)` - Retrieve cached frames from filesystem
- `filterFramesToMeshData(videoId, frameIndices)` - Filter frames to keep only mesh-aligned ones
- `renameFramesToSequential(videoId, frameIndices)` - Rename frames to sequential order
- `normalizeFrameRates(videoFpsArray)` - Normalize frame rates between multiple videos

**Features:**
- Unique cache directory per videoId (prevents collisions)
- MongoDB cache checking before extraction
- Local filesystem caching
- Frame rate normalization
- Metadata persistence

#### FrameDataService (`backend/src/services/frameDataService.ts`)
Manages frame data operations and synchronization.

**Key Methods:**
- `getFrameData(videoId, frameNumber)` - Get frame data for specific frame
- `getFrameRange(videoId, startFrame, endFrame)` - Get range of frames
- `saveFrameData(frameData)` - Save frame data to database
- `deleteFrameData(videoId)` - Delete all frames for video

#### VideoExtractionService (`backend/src/services/videoExtractionService.ts`)
Handles video file extraction and processing.

**Key Methods:**
- `extractVideo(videoPath)` - Extract video metadata and frames
- `getVideoMetadata(videoPath)` - Get video duration, fps, resolution
- `validateVideo(videoPath)` - Validate video file format and integrity

#### VideoStorageService (`backend/src/services/videoStorageService.ts`)
Manages video file storage and retrieval.

**Key Methods:**
- `storeVideo(videoPath, videoId)` - Store video file with unique ID
- `getVideoPath(videoId)` - Get path to stored video
- `deleteVideo(videoId)` - Delete stored video file
- `listVideos()` - List all stored videos

#### RedisCacheService (`backend/src/services/redisCacheService.ts`)
Provides Redis-based caching for frequently accessed data.

**Key Methods:**
- `initializeRedisCache()` - Initialize Redis connection
- `get(key)` - Get cached value
- `set(key, value, ttl)` - Set cached value with TTL
- `delete(key)` - Delete cached value
- `clear()` - Clear all cache

**Use Cases:**
- Cache mesh data for quick retrieval
- Cache frame data during playback
- Cache API responses

#### MeshOverlayService (`backend/src/services/meshOverlayService.ts`)
Handles mesh overlay rendering and visualization logic.

**Key Methods:**
- `generateMeshOverlay(meshData, frameNumber)` - Generate overlay for specific frame
- `validateMeshData(meshData)` - Validate mesh data integrity
- `transformMeshCoordinates(meshData, transform)` - Apply coordinate transformations

### Frontend Services

#### MeshDataService (`backend/web/src/services/meshDataService.ts`)
Frontend service for fetching mesh data from backend API.

**Key Methods:**
- `getMeshData(videoId)` - Fetch mesh data for video
- `getFrame(videoId, frameNumber)` - Fetch specific frame
- `getFrameRange(videoId, startFrame, endFrame)` - Fetch frame range
- `listMeshData()` - List all available mesh data

#### PlaybackSyncService (`backend/web/src/services/playbackSyncService.ts`)
Synchronizes video playback with mesh animation.

**Key Methods:**
- `syncPlayback(videoElement, meshRenderer)` - Sync video and mesh playback
- `updateMeshFrame(frameNumber)` - Update mesh to specific frame
- `setPlaybackSpeed(speed)` - Set playback speed
- `seek(frameNumber)` - Seek to frame

**Features:**
- Frame-accurate synchronization
- Playback speed control
- Pause/resume handling
- Frame seeking

#### FrameDataService (`backend/web/src/services/frameDataService.ts`)
Frontend service for managing frame data and caching.

**Key Methods:**
- `loadFrameData(videoId)` - Load all frame data for video
- `getFrame(frameNumber)` - Get cached frame data
- `preloadFrames(startFrame, endFrame)` - Preload frame range
- `clearCache()` - Clear frame cache

#### OverlayToggleService (`backend/web/src/services/overlayToggleService.ts`)
Manages mesh overlay visibility and rendering modes.

**Key Methods:**
- `toggleOverlay()` - Toggle mesh overlay visibility
- `setRenderMode(mode)` - Set rendering mode (skeleton, mesh, combined)
- `toggleWireframe()` - Toggle wireframe mode
- `getOverlayState()` - Get current overlay state

**Render Modes:**
- `skeleton` - Show skeleton only
- `mesh` - Show mesh only
- `combined` - Show both skeleton and mesh
- `wireframe` - Show mesh as wireframe

#### SceneSyncService (`backend/web/src/services/sceneSyncService.ts`)
Manages Three.js scene synchronization and updates.

**Key Methods:**
- `initializeScene(canvas)` - Initialize Three.js scene
- `updateScene(meshData, frameNumber)` - Update scene with new frame data
- `renderFrame()` - Render current frame
- `resetCamera()` - Reset camera to default view

### Utility Services

#### AnalysisLogService (`backend/src/services/analysisLogService.ts`)
Provides structured logging for analysis operations.

**Key Methods:**
- `logFrameAnalysis(frameNumber, analysis)` - Log frame analysis
- `logPhaseDetection(phase, confidence)` - Log phase detection
- `getAnalysisLog(videoId)` - Get analysis log for video

#### ChatService (`backend/src/services/chatService.ts`)
Handles chat interactions and LLM integration.

**Key Methods:**
- `sendMessage(message, context)` - Send message to LLM
- `getResponse()` - Get LLM response
- `updateContext(context)` - Update chat context

#### TrickDetectionService (`backend/src/services/trickDetection.ts`)
Detects trick types from pose data.

**Key Methods:**
- `detectTrick(poseSequence)` - Detect trick type from pose sequence
- `getTrickConfidence()` - Get confidence score for detected trick

#### LLMTrickDetectionService (`backend/src/services/llmTrickDetection.ts`)
Uses LLM for advanced trick detection.

**Key Methods:**
- `detectTrickWithLLM(poseData, videoContext)` - Detect trick using LLM
- `generateTrickDescription(trickType)` - Generate description for trick

#### KnowledgeBaseService (`backend/src/services/knowledgeBase.ts`)
Manages knowledge base queries and retrieval.

**Key Methods:**
- `queryKnowledgeBase(query)` - Query knowledge base
- `getCoachingTips(trickType, phase)` - Get coaching tips for trick phase
- `searchSimilarContent(query)` - Search for similar content

### Python Services

#### PythonPoseService (`backend/src/services/pythonPoseService.ts`)
Interface to Python pose detection service running on WSL.

**Key Methods:**
- `detectPose(imageBase64, frameNumber)` - Detect pose from image
- `detectPoseParallel(images)` - Detect poses in parallel
- `detectPoseHybrid(imageBase64, frameNumber)` - Hybrid pose detection
- `detectPoseHybridBatch(images)` - Batch hybrid pose detection
- `checkPoseServiceHealth()` - Check if pose service is running

**Models:**
- 4D-Humans - Advanced pose reconstruction
- ViTDet - Person detection

## Service Architecture

### Service Dependencies

```
Frontend Services
├── MeshDataService (fetches from backend)
├── PlaybackSyncService (uses FrameDataService)
├── FrameDataService (caches frame data)
├── OverlayToggleService (controls rendering)
└── SceneSyncService (manages Three.js scene)

Backend Services
├── MeshDataService (MongoDB operations)
├── FrameExtractionService (frame caching)
├── FrameDataService (frame management)
├── VideoExtractionService (video processing)
├── VideoStorageService (file storage)
├── RedisCacheService (caching layer)
├── MeshOverlayService (mesh rendering)
├── PythonPoseService (pose detection)
├── AnalysisLogService (logging)
├── ChatService (LLM integration)
├── TrickDetectionService (trick detection)
├── LLMTrickDetectionService (LLM-based detection)
└── KnowledgeBaseService (knowledge base queries)
```

### Data Flow

```
Video Upload
    ↓
VideoExtractionService (extract frames)
    ↓
FrameExtractionService (cache frames)
    ↓
PythonPoseService (detect pose)
    ↓
MeshDataService (save to MongoDB)
    ↓
Frontend: MeshDataService (fetch data)
    ↓
FrameDataService (cache frames)
    ↓
PlaybackSyncService (sync playback)
    ↓
SceneSyncService (update Three.js)
    ↓
OverlayToggleService (render mesh)
```

### Caching Strategy

1. **Frame Cache** - FrameExtractionService caches extracted frames on filesystem
2. **Mesh Cache** - RedisCacheService caches mesh data in Redis
3. **Frame Data Cache** - Frontend FrameDataService caches frame data in memory
4. **MongoDB Cache** - MeshDataService checks MongoDB before extraction

### Error Handling

All services implement consistent error handling:
- Try-catch blocks with detailed logging
- Graceful fallbacks for missing data
- Validation of input data
- Connection retry logic for external services

## Pose Estimation Pipeline

The form analysis system uses state-of-the-art computer vision models to extract accurate 3D pose data from snowboarding videos.

### 4D-Humans: Advanced Pose Reconstruction

[4D-Humans](https://github.com/shubham-goel/4D-Humans) is a Transformer-based model that reconstructs 3D human pose and shape from video. It provides:

- **3D Joint Positions** - 24 SMPL joints with x, y, z coordinates per frame
- **Per-Frame Confidence** - Reliability score for each joint detection
- **Temporal Consistency** - Smooth pose tracking across frames using video context
- **Robust to Occlusion** - Handles partial visibility (e.g., arms behind body during rotation)

### ViTDet: Robust Person Detection

[ViTDet](https://huggingface.co/docs/transformers/en/model_doc/vitdet) (Vision Transformer Detection) provides the backbone for detecting people in frames before pose estimation:

- **Vision Transformer Backbone** - Transformer-based architecture for robust feature extraction
- **Multi-Scale Detection** - Handles riders at various distances and angles
- **High Accuracy** - Enables reliable pose estimation even in challenging snowboarding scenarios

### Processing Pipeline

1. **Frame Extraction** - Extract frames from uploaded video at consistent intervals
2. **Person Detection** - Use ViTDet to locate rider in each frame
3. **Pose Estimation** - Use 4D-Humans to extract 3D joint positions
4. **Pose Validation** - Filter out low-confidence detections
5. **Phase Detection** - Use pose timeline to identify trick phases
6. **Metric Computation** - Calculate biomechanical metrics from pose data

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

The MCP tools are called by the LLM during analysis to fetch pre-computed data from MongoDB. The LLM starts with a video summary and progressively calls tools to get the specific data it needs to generate coaching feedback.

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

### Spec-Driven Development

This project uses formal specification documents to guide feature development:

**Stale Mesh Data Fix Spec** (`.kiro/specs/stale-mesh-data-fix/`)
- Requirements: 4 user stories with 13 acceptance criteria (EARS format)
- Design: Architecture, data models, 7 correctness properties
- Tasks: 14 implementation tasks with property-based tests
- Status: Core implementation complete, property tests pending

**Synchronized Video-Mesh Playback Spec** (`.kiro/specs/synchronized-video-mesh-playback/`)
- Requirements: Frame synchronization and mesh display consistency
- Design: Playback sync service, frame seeking, overlay management
- Tasks: Implementation plan for synchronized playback

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
