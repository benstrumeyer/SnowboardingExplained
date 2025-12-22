# Snowboarding Coach API

Backend API for the Snowboarding Coach application - a real-time pose analysis and coaching system for snowboarders.

## Architecture Overview

### Core Components

1. **Video Upload & Processing**
   - Direct video upload with automatic frame extraction
   - Pose detection via Python service (4D-Humans HMR2)
   - Mesh data generation and storage

2. **MongoDB Persistence**
   - Mesh data caching with 30-day TTL
   - Frame rate normalization across videos
   - Duplicate detection to prevent redundant processing

3. **Frontend Integration**
   - Real-time mesh visualization (Three.js)
   - Synchronized playback of rider vs reference videos
   - Models browser with auto-polling

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (for MongoDB)
- Python 3.9+ (for pose service)

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start MongoDB:**
```bash
docker-compose up -d
```

3. **Configure environment:**
```bash
# Copy example env
cp .env.docker .env.local

# Update with your settings:
# POSE_SERVICE_URL=http://localhost:5000
# MONGODB_URI=mongodb://admin:password@localhost:27017/snowboarding?authSource=admin
```

4. **Start backend:**
```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Video Upload & Processing

**POST /api/upload-video-with-pose**
- Upload video and extract pose data
- Returns: `{ videoId, role, frameCount, meshSequence }`
- Stores mesh data in MongoDB automatically

**POST /api/mesh-data/:videoId**
- Store mesh data for a video
- Prevents duplicates (same videoId)

### Mesh Data Retrieval

**GET /api/mesh-data/list**
- List all models in database
- Returns: Array of mesh data with metadata

**GET /api/mesh-data/:videoId**
- Retrieve complete mesh sequence for a video
- Returns: `MeshSequence` with all frames, vertices, faces

**DELETE /api/mesh-data/:videoId**
- Delete a model from database

### Health & Status

**GET /api/health**
- Health check endpoint
- Returns: `{ status: 'ok', uptime, timestamp }`

## Data Flow

```
Video Upload
    ↓
Frame Extraction (FFmpeg)
    ↓
Pose Detection (Python Service)
    ↓
Mesh Generation
    ↓
MongoDB Storage (with duplicate check)
    ↓
Frontend Retrieval (MeshSequence format)
    ↓
Three.js Visualization
```

## Key Features

### Frame Rate Normalization
Automatically normalizes frame rates when comparing videos:
```typescript
// Videos at 60 FPS and 30 FPS → normalized to 30 FPS
const normalizedFps = FrameExtractionService.normalizeFrameRates([60, 30]);
```

### Duplicate Detection
Prevents saving the same video twice:
```typescript
// If videoId already exists, skips saving
await meshDataService.saveMeshData(meshData);
```

### Auto-Polling Models Browser
Frontend polls `/api/mesh-data/list` every 3 seconds to show new models.

### Immediate Upload Feedback
Upload dialog closes immediately after upload starts - processing continues in background.

## Database Schema

### Collections

**mesh_data**
```javascript
{
  _id: ObjectId,
  videoId: string,           // Unique identifier
  role: 'rider' | 'coach',   // Video type
  fps: number,               // Frames per second
  videoDuration: number,     // Duration in seconds
  frameCount: number,        // Total frames
  frames: [
    {
      frameNumber: number,
      timestamp: number,
      keypoints: array,      // Joint positions
      skeleton: {
        vertices: array,     // 3D mesh vertices
        faces: array,        // Face indices
        has3d: boolean,
        jointAngles3d: object,
        cameraTranslation: array
      }
    }
  ],
  createdAt: Date,           // Auto-cleanup after 30 days
  updatedAt: Date
}
```

## Frontend Integration

### MeshSequence Type
```typescript
interface MeshSequence {
  id: string;
  videoId: string;
  trick: string;
  phase: string;
  frameStart: number;
  frameEnd: number;
  fps: number;
  frames: MeshFrame[];
  bodyProportions: BodyProportions;
}
```

### Loading Models
```typescript
// Frontend fetches mesh data
const mesh = await fetchRiderMesh('video-id');

// Automatically polls for new models
// Updates every 3 seconds via ModelsBrowser component
```

## Development

### Environment Variables

```bash
# Pose Service
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=180000

# MongoDB
MONGODB_URI=mongodb://admin:password@localhost:27017/snowboarding?authSource=admin

# Server
PORT=3001
NODE_ENV=development
```

### Useful Commands

```bash
# Start backend
npm run dev

# Start MongoDB
docker-compose up -d

# View MongoDB
http://localhost:8081 (admin/password)

# Test endpoints
npm run test:endpoints

# Debug mesh loading
npx ts-node debug-mesh-load.ts
```

### File Structure

```
src/
├── server.ts                 # Main Express server
├── services/
│   ├── frameExtraction.ts   # Video frame extraction
│   ├── meshDataService.ts   # MongoDB mesh data operations
│   └── pythonPoseService.ts # Pose detection integration
├── types.ts                 # TypeScript interfaces
└── logger.ts                # Logging utility

web/
├── src/
│   ├── components/
│   │   ├── PoseOverlayViewer.tsx    # Main viewer
│   │   ├── ModelsBrowser.tsx        # Models list
│   │   └── VideoUploadModal.tsx     # Upload dialog
│   ├── services/
│   │   └── meshDataService.ts       # API client
│   └── types/
│       └── index.ts                 # Frontend types
```

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check containers
docker-compose ps

# View logs
docker-compose logs mongodb

# Restart
docker-compose down && docker-compose up -d
```

### Mesh Data Not Loading
1. Check `/api/mesh-data/list` returns models
2. Verify `/api/mesh-data/:videoId` returns MeshSequence
3. Check browser console for API errors
4. Ensure `response.data.data` is extracted correctly

### Pose Service Not Responding
```bash
# Check service health
curl http://localhost:5000/health

# Verify URL in .env.local
POSE_SERVICE_URL=http://localhost:5000
```

## Performance Considerations

- **Frame Rate Normalization**: Reduces processing by using lowest common FPS
- **MongoDB Caching**: 30-day TTL prevents database bloat
- **Duplicate Detection**: Avoids redundant processing
- **Auto-Polling**: 3-second interval balances responsiveness and server load

## Next Steps

- [ ] Implement frame pagination for large videos
- [ ] Add video comparison metrics
- [ ] Implement trick detection from pose data
- [ ] Add coaching feedback generation
- [ ] Optimize mesh rendering for mobile

## Support

For issues or questions, check:
1. Backend logs: `npm run dev` output
2. MongoDB: `http://localhost:8081`
3. Browser console: DevTools Network/Console tabs
4. API responses: Use debug scripts in root directory
