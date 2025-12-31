# Development Guide

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Prerequisites

- Node.js 18+
- Python 3.10+
- WSL2 (Windows users)
- Cloned repos: `4D-Humans`, `PHALP`, `ViTDet`, `detectron2`

## Installation

### Backend
```bash
cd backend
npm install
```

### Pose Service
```bash
cd backend/pose-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frozen Dependencies (in order)
```bash
cd ~/repos
cd detectron2 && pip install -e .
cd ../ViTDet && pip install -e .
cd ../4D-Humans && pip install -e .
cd ../PHALP && pip install -e .
```

## Running Services

**Terminal 1:**
```bash
cd backend && npm run dev
```

**Terminal 2:**
```bash
cd backend/pose-service
source venv/bin/activate
python app.py
```

## Code Organization

```
backend/
├── src/
│   ├── server.ts              # Express server
│   ├── types.ts               # TypeScript types
│   └── services/
│       └── videoAnalysisPipelineImpl.ts
├── api/
│   └── upload-video.ts        # Upload handler
└── pose-service/
    ├── app.py                 # Flask server
    ├── track_wrapper.py       # PHALP wrapper
    ├── hybrid_pose_detector.py # 4D-Humans
    └── requirements.txt
```

## Common Tasks

### Add API Endpoint
1. Create handler in `backend/api/`
2. Register in `backend/src/server.ts`
3. Add types to `backend/src/types.ts`

### Modify Pose Service
1. Edit Python file
2. Restart: Stop and run `python app.py`
3. Check logs for errors

### Test Video Processing
1. Upload short video (< 30 seconds)
2. Monitor backend logs
3. Check pose service output
4. Retrieve results via `/api/video/job_status/:jobId`

## Debugging

| Issue | Solution |
|-------|----------|
| Port in use | `lsof -i :3001` → `kill -9 <PID>` |
| Module not found | `pip install -r requirements.txt` |
| PHALP error | Verify detectron2 installed first |
| Slow processing | Use `max_frames=15` for testing |

## Useful Commands

```bash
# Backend
npm run dev          # Start dev server
npm run build        # Build for production

# Pose Service
python app.py        # Start service
python -m pytest     # Run tests

# Virtual Environment
source venv/bin/activate    # Activate
deactivate                  # Deactivate
```

## Resources

- Architecture: `.kiro/steering/architecture.md`
- Dependencies: `.kiro/steering/dependency-setup.md`
- WSL Setup: `.kiro/steering/wsl-integration.md`
