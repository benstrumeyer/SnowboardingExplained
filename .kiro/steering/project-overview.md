---
inclusion: always
---

# SnowboardingExplained Project Overview

## Project Structure

This is a full-stack snowboarding analysis platform with video processing, pose estimation, and AI coaching.

### Key Directories

- **backend/**: Node.js/TypeScript backend server
  - `src/`: Main server code (services, types, utils)
  - `api/`: API endpoints
  - `mobile/`: React Native mobile app
  - `pose-service/`: Python Flask service for pose estimation
  - `mcp-server/`: Model Context Protocol server for LLM integration

- **data-pipeline/**: Data processing scripts and datasets
  - `scripts/`: TypeScript scripts for data processing
  - `data/`: Video metadata, trick taxonomy, chunks

- **docs/**: Documentation
  - `MCP_TOOLS_REFERENCE.md`: Reference for MCP tools

### Technology Stack

- **Backend**: Node.js, TypeScript, Express
- **Mobile**: React Native
- **Pose Service**: Python, Flask, 4D-Humans, ViTDet
- **Database**: SQLite (via MCP server)
- **LLM Integration**: Gemini API via MCP

## Key Features

1. **Video Upload & Processing**: Upload snowboarding videos for analysis
2. **Pose Estimation**: Extract 3D pose data using 4D-Humans model
3. **Mesh Rendering**: Render 3D mesh overlays on video frames
4. **Phase Detection**: Identify trick phases (approach, takeoff, rotation, landing)
5. **AI Coaching**: Provide feedback using Gemini LLM
6. **Perfect Phases**: Save and manage perfect trick execution examples

## Development Workflow

### Starting Services

1. **Backend**: `npm run dev` (port 3000)
2. **Mobile**: `npm run dev` (Expo)
3. **Pose Service**: `python app.py` (port 5000)

See `STARTUP_ORDER.md` and `INSTALL_DEPENDENCIES.md` for detailed setup.

## Important Files

- `backend/src/server.ts`: Main backend server
- `backend/pose-service/app.py`: Pose estimation service
- `backend/mobile/src/screens/VideoAnalysisScreen.tsx`: Video analysis UI
- `backend/src/services/videoAnalysisPipelineImpl.ts`: Video processing pipeline
- `backend/mcp-server/src/index.ts`: MCP server entry point

## Common Tasks

### Adding a New API Endpoint

1. Create handler in `backend/api/`
2. Register in `backend/src/server.ts`
3. Add types to `backend/src/types.ts`

### Modifying Pose Service

1. Edit Python files in `backend/pose-service/`
2. Test with `test_*.py` scripts
3. Restart service to apply changes

### Updating Mobile UI

1. Edit React components in `backend/mobile/src/`
2. Changes hot-reload in Expo
3. Test on device or emulator

## Debugging

- Backend logs: `backend/logs/`
- Pose service: Check Flask console output
- Mobile: Use Expo DevTools or React Native Debugger
- MCP: Check `backend/mcp-server/` logs

## Performance Notes

- Video processing is async (max_frames parameter controls frame count)
- Pose estimation is CPU/GPU intensive
- Mesh rendering uses canvas for performance
- Frame extraction is cached when possible
