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
                            JSON Response (Pose Timeline)
                                      ↓
                    Three.js Visualization → MongoDB
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

## Data Flow

1. **Upload** - User uploads video via web modal
2. **Backend** - Receives video, sends to pose service
3. **Pose Service** - Processes entire video:
   - Extract frames
   - 4D-Humans pose estimation
   - PHALP temporal tracking
   - Mesh rendering
4. **Response** - JSON with pose timeline (native FPS)
5. **Visualization** - Three.js renders 3D skeleton
6. **Storage** - Save to MongoDB

## Key Decisions

- **Full Video Processing** - Not frame-by-frame (enables PHALP tracking)
- **Native FPS** - Playback at original video FPS (60FPS interpolation later)
- **Frozen Stack** - All ML dependencies cloned locally, installed in order
- **PHALP Critical** - Provides temporal consistency across video

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
