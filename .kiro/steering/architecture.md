# Architecture

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## System Overview

```
Web Upload → Backend (Node.js) → Pose Service (Python)
                                      ↓
                    [4D-Humans] → [PHALP] → [Mesh Renderer]
                                      ↓
                    JSON Response (Pose Timeline + Videos)
                                      ↓
                    Save to MongoDB (Mesh Data + Videos)
                                      ↓
                    Side-by-Side View:
                    ┌─────────────────────────────────────┐
                    │ Left: Video Toggle                  │
                    │ (Original ↔ PHALP Overlay)         │
                    │                                     │
                    │ Right: Three.js 3D Mesh             │
                    │ (Synced frame-by-frame)             │
                    └─────────────────────────────────────┘
```

## Components

| Component | Tech | Port | Purpose |
|-----------|------|------|---------|
| Backend | Node.js/Express | 3001 | Video upload, orchestration |
| Pose Service | Flask | 5000 | Pose estimation, PHALP tracking |
| 4D-Humans | PyTorch | - | 3D pose per frame |
| PHALP | Python | - | Temporal tracking |
| Frontend | Three.js | Browser | 3D visualization |
| Database | MongoDB | 27017 | Store results |

## Frontend Playback Architecture

**PlaybackEngine** is the single source of truth for all timing and playback state:

```
PlaybackEngine (RAF Loop @ 60fps)
    ├→ Global playback (video cells)
    │   ├→ emits play/pause/speedChanged events
    │   ├→ maintains playbackTime (ms)
    │   └→ owns play/pause/seek/speed controls
    │
    └→ Independent mesh playback (mesh cells)
        ├→ emits meshPlay/meshPause/meshFrameNext/meshFramePrev/meshSpeedChanged
        ├→ tracks meshPlaybackTime per cell
        ├→ mesh cells have independent playback state
        └→ syncs both at loop boundaries (waits for both to reach end)
             ↓
         ├→ MeshScrubber (independent playback)
         │   ├→ manages meshPlaybackTimeRef (independent from global)
         │   ├→ has own play/pause/frame advance buttons
         │   ├→ updates tracker via updateTrackerDirect()
         │   ├→ control mode toggle (Orbit ↔ Arcball)
         │   └→ speed multiplier (1x, 1.5x, 2x, 0.125x, 0.25x, 0.5x, 0.75x)
         │
         ├→ MeshViewer (Three.js rendering)
         │   ├→ receives controlMode prop from MeshScrubber
         │   ├→ onMouseMove uses controlMode to determine rotation:
         │   │   ├→ Orbit: spherical coordinates (theta/phi/radius)
         │   │   └→ Arcball: quaternion-based rotation around center
         │   ├→ useMeshSampler listens to frameUpdate
         │   ├→ updates Three.js geometry via BufferAttribute.copyArray()
         │   └→ geometry reuse pattern (create once, update vertices per frame)
         │
         ├→ CellNativeScrubber (video playback)
         │   ├→ syncs video.currentTime to engine.playbackTime
         │   ├→ video is renderer, not clock
         │   └→ updates tracker based on video duration
         │
         └→ GlobalScrubberOverlay (global controls)
             ├→ routes play/pause to appropriate cell type
             ├→ mesh cells get meshPlay/meshPause events
             ├→ video cells get play/pause events
             ├→ frame advance routes to meshFrameNext/meshFramePrev
             └→ speed changes route to meshSpeedChanged

Key Patterns:
- Geometry reuse: create BufferGeometry once, update position attribute per frame
- Loop sync: both video and mesh pause at end, seek to frame 0, resume together
- Independent mesh playback: mesh cells have own playback state, not tied to global
- Control mode toggle: switch between orbit and arcball without recreating controls
```

## Data Flow

1. **Upload** - User uploads video via web modal
2. **Backend** - Receives video, sends to pose service
3. **Pose Service** - Processes entire video:
   - Extract frames
   - 4D-Humans pose estimation
   - PHALP temporal tracking
   - Mesh rendering
   - Save output video with mesh overlay
4. **Response** - JSON with pose timeline + video files
5. **Storage** - Save to MongoDB:
   - Original video
   - PHALP mesh overlay video
   - Mesh data (vertices, faces, camera params)
   - Video metadata (fps, duration, resolution)
6. **Visualization** - Side-by-side view:
   - PlaybackEngine initializes with fps/totalFrames from metadata
   - Left: Toggle between original and overlay videos (synced to engine)
   - Right: Three.js renders 3D mesh (synced to engine)
   - Scrubber shows progress based on engine.playbackTime
   - All components follow engine time, never their own clocks

## Key Decisions

- **Full Video Processing** - Not frame-by-frame (enables PHALP tracking)
- **Native FPS** - Playback at original video FPS
- **Frozen Stack** - All ML dependencies cloned locally, installed in order
- **PHALP Critical** - Provides temporal consistency across video
- **PlaybackEngine as Source of Truth** - Single RAF loop drives all rendering
- **Independent Mesh Playback** - Mesh cells have own playback state, not tied to global engine
- **Geometry Reuse** - Pre-create Three.js geometry once, update vertices per frame via BufferAttribute.copyArray()
- **Event-Based Sync** - All components listen to engine events, never own clocks
- **Responsive Scrubber** - Native DOM scrubber updates at 60fps without React state
- **Three.js Essential** - 3D mesh visualization is the core value proposition
- **Perfect Frame Sync** - Mesh, video, and scrubber all follow engine time
- **Loop Boundary Sync** - Both video and mesh pause at end, seek to frame 0, resume together
- **Dual Control Modes** - Orbit (spherical) and Arcball (quaternion) for 3D mesh manipulation
- **Speed Multipliers** - Independent speed control for mesh playback (1x, 1.5x, 2x, 0.125x, 0.25x, 0.5x, 0.75x)

## Deployment

- **Local Development** - WSL2 + Kiro IDE
- **Services** - Run in separate terminals
- **Database** - MongoDB (local or cloud)
- **Frontend** - Web-based (no mobile for MVP)

## File Structure

```
backend/
├── src/server.ts              # Express server
├── api/upload-video.ts        # Upload handler
├── pose-service/
│   ├── app.py                 # Flask server
│   ├── track_wrapper.py       # PHALP wrapper
│   ├── hybrid_pose_detector.py # 4D-Humans
│   └── requirements.txt
└── logs/
```

## API Endpoints

- `POST /api/video/upload` - Upload video
- `GET /api/video/job_status/:jobId` - Check status
- `GET /api/video/frame/:jobId/:frameIndex` - Get frame data
