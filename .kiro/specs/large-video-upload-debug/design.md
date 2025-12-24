# Large Video Upload Debug Design

## Overview

This design fixes the large video upload issue by implementing proper error handling, async/await patterns, timeout configuration, and progress tracking. The solution ensures users get clear feedback about upload status and can debug issues effectively.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  VideoUploadModal with proper error handling & progress     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  Upload Endpoint                │
        │  /api/upload-video-with-pose    │
        │  - Validate file                │
        │  - Extract frames               │
        │  - Detect pose (with timeout)   │
        │  - Save to MongoDB              │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  Status Tracking                │
        │  - In-memory cache              │
        │  - Redis (optional)             │
        │  - MongoDB (persistent)         │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  Debugging Endpoints            │
        │  - /api/upload-status/:videoId  │
        │  - /api/upload-logs/:videoId    │
        │  - /api/upload-health           │
        └─────────────────────────────────┘
```

## Components

### 1. Frontend: VideoUploadModal (Updated)

**Changes**:
- Remove "fire and forget" pattern
- Properly await upload response
- Show error messages
- Track upload progress
- Show processing progress

```typescript
interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  uploadProgress: number; // 0-100 (file upload)
  processingProgress: number; // 0-100 (frame processing)
  currentFrame: number; // Current frame being processed
  totalFrames: number; // Total frames to process
  error: string | null;
  videoId: string | null;
}

const handleUpload = async () => {
  setUploadState({ status: 'uploading', uploadProgress: 0, ... });
  
  try {
    // Wait for upload to complete
    const response = await axios.post(
      `${API_URL}/api/upload-video-with-pose`,
      formData,
      {
        timeout: 600000, // 10 minutes
        onUploadProgress: (e) => {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadState(prev => ({ ...prev, uploadProgress: progress }));
        }
      }
    );
    
    // Upload succeeded
    const { videoId, frameCount } = response.data;
    setUploadState({ 
      status: 'processing', 
      videoId, 
      totalFrames: frameCount,
      processingProgress: 0
    });
    
    // Poll for processing progress
    pollProcessingProgress(videoId);
    
  } catch (err) {
    // Show error to user
    setUploadState({ 
      status: 'error', 
      error: err.response?.data?.error || err.message 
    });
  }
};

const pollProcessingProgress = async (videoId: string) => {
  const interval = setInterval(async () => {
    try {
      const status = await axios.get(`${API_URL}/api/upload-status/${videoId}`);
      
      if (status.data.status === 'complete') {
        setUploadState(prev => ({ ...prev, status: 'success', processingProgress: 100 }));
        clearInterval(interval);
        onVideoLoaded(videoId, role);
        onClose();
      } else if (status.data.status === 'error') {
        setUploadState(prev => ({ ...prev, status: 'error', error: status.data.error }));
        clearInterval(interval);
      } else {
        setUploadState(prev => ({
          ...prev,
          processingProgress: status.data.progress,
          currentFrame: status.data.currentFrame,
          totalFrames: status.data.totalFrames
        }));
      }
    } catch (err) {
      console.error('Error polling status:', err);
    }
  }, 1000); // Poll every second
};
```

### 2. Backend: Upload Status Tracking

**New Service**: `uploadStatusService.ts`

```typescript
interface UploadStatus {
  videoId: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  uploadProgress: number; // 0-100
  processingProgress: number; // 0-100
  currentFrame: number;
  totalFrames: number;
  error: string | null;
  startTime: number;
  endTime: number | null;
  logs: string[];
}

class UploadStatusService {
  private statuses = new Map<string, UploadStatus>();
  
  createStatus(videoId: string): UploadStatus {
    const status: UploadStatus = {
      videoId,
      status: 'uploading',
      uploadProgress: 0,
      processingProgress: 0,
      currentFrame: 0,
      totalFrames: 0,
      error: null,
      startTime: Date.now(),
      endTime: null,
      logs: []
    };
    this.statuses.set(videoId, status);
    return status;
  }
  
  getStatus(videoId: string): UploadStatus | null {
    return this.statuses.get(videoId) || null;
  }
  
  updateProgress(videoId: string, updates: Partial<UploadStatus>): void {
    const status = this.statuses.get(videoId);
    if (status) {
      Object.assign(status, updates);
    }
  }
  
  addLog(videoId: string, message: string): void {
    const status = this.statuses.get(videoId);
    if (status) {
      status.logs.push(`[${new Date().toISOString()}] ${message}`);
    }
  }
  
  markComplete(videoId: string): void {
    const status = this.statuses.get(videoId);
    if (status) {
      status.status = 'complete';
      status.endTime = Date.now();
      status.processingProgress = 100;
    }
  }
  
  markError(videoId: string, error: string): void {
    const status = this.statuses.get(videoId);
    if (status) {
      status.status = 'error';
      status.error = error;
      status.endTime = Date.now();
    }
  }
}
```

### 3. Backend: Updated Upload Endpoint

**Changes**:
- Wrap in try-catch with proper error handling
- Update status tracking throughout
- Add timeout configuration
- Return proper error responses

```typescript
app.post('/api/upload-video-with-pose', upload.single('video'), async (req: Request, res: Response) => {
  const videoId = generateVideoId();
  const statusService = new UploadStatusService();
  const status = statusService.createStatus(videoId);
  
  try {
    const { role } = req.body;
    
    if (!role) {
      statusService.markError(videoId, 'Missing role field');
      return res.status(400).json({ error: 'Missing role field' });
    }
    
    if (!req.file) {
      statusService.markError(videoId, 'No video file provided');
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    statusService.addLog(videoId, `Upload started: ${req.file.originalname} (${req.file.size} bytes)`);
    statusService.updateProgress(videoId, { uploadProgress: 100 });
    
    // Extract frames
    let frameResult;
    try {
      statusService.updateProgress(videoId, { status: 'processing', processingProgress: 10 });
      statusService.addLog(videoId, 'Extracting frames...');
      
      frameResult = await FrameExtractionService.extractFrames(newVideoPath, videoId);
      statusService.updateProgress(videoId, { 
        totalFrames: frameResult.frameCount,
        processingProgress: 20 
      });
      statusService.addLog(videoId, `Extracted ${frameResult.frameCount} frames`);
      
    } catch (err: any) {
      statusService.markError(videoId, `Frame extraction failed: ${err.message}`);
      return res.status(400).json({ 
        error: 'Failed to extract frames from video',
        details: err.message,
        videoId
      });
    }
    
    // Extract pose data with timeout per frame
    const meshSequence: any[] = [];
    const POSE_TIMEOUT = 30000; // 30 seconds per frame
    
    for (let i = 0; i < frameResult.frameCount; i++) {
      try {
        statusService.updateProgress(videoId, { 
          currentFrame: i,
          processingProgress: 20 + Math.round((i / frameResult.frameCount) * 70)
        });
        statusService.addLog(videoId, `Processing frame ${i}/${frameResult.frameCount}`);
        
        const frame = frameResult.frames[i];
        if (frame) {
          const imageBase64 = FrameExtractionService.getFrameAsBase64(frame.imagePath);
          
          // Wrap pose detection with timeout
          const poseResult = await Promise.race([
            detectPoseHybrid(imageBase64, i),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Pose detection timeout')), POSE_TIMEOUT)
            )
          ]);
          
          meshSequence.push({
            frameNumber: i,
            timestamp: frame.timestamp,
            keypoints: poseResult.keypoints,
            has3d: poseResult.has3d,
            jointAngles3d: poseResult.jointAngles3d,
            mesh_vertices_data: poseResult.mesh_vertices_data,
            mesh_faces_data: poseResult.mesh_faces_data,
            cameraTranslation: poseResult.cameraTranslation
          });
        }
      } catch (err) {
        statusService.addLog(videoId, `Warning: Failed to extract pose for frame ${i}: ${err.message}`);
        logger.warn(`Failed to extract pose for frame ${i}:`, err);
        // Continue with next frame
      }
    }
    
    // Save to MongoDB
    try {
      statusService.updateProgress(videoId, { processingProgress: 95 });
      statusService.addLog(videoId, 'Saving to database...');
      
      await meshDataService.connect();
      await meshDataService.saveMeshData({
        videoId,
        videoUrl: `${req.protocol}://${req.get('host')}/videos/${videoId}`,
        fps: frameResult.fps,
        videoDuration: frameResult.videoDuration,
        frameCount: meshSequence.length,
        totalFrames: meshSequence.length,
        frames: meshSequence.map(frame => ({
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          keypoints: frame.keypoints,
          skeleton: {
            vertices: frame.mesh_vertices_data || [],
            faces: frame.mesh_faces_data || [],
            has3d: frame.has3d,
            jointAngles3d: frame.jointAngles3d,
            cameraTranslation: frame.cameraTranslation
          }
        })),
        role: role as 'rider' | 'coach'
      });
      
      statusService.markComplete(videoId);
      statusService.addLog(videoId, `Upload complete: ${meshSequence.length} frames processed`);
      
      res.status(200).json({
        success: true,
        videoId,
        role,
        frameCount: meshSequence.length,
        meshSequence: meshSequence
      });
      
    } catch (err) {
      statusService.markError(videoId, `Database save failed: ${err.message}`);
      return res.status(500).json({ 
        error: 'Failed to save mesh data',
        details: err.message,
        videoId
      });
    }
    
  } catch (error: any) {
    statusService.markError(videoId, `Unexpected error: ${error.message}`);
    logger.error('Video upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message,
      videoId
    });
  }
});
```

### 4. Backend: Status Endpoints

```typescript
// Get upload status
app.get('/api/upload-status/:videoId', (req: Request, res: Response) => {
  const { videoId } = req.params;
  const status = uploadStatusService.getStatus(videoId);
  
  if (!status) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  
  res.json({
    videoId,
    status: status.status,
    uploadProgress: status.uploadProgress,
    processingProgress: status.processingProgress,
    currentFrame: status.currentFrame,
    totalFrames: status.totalFrames,
    error: status.error,
    elapsedTime: Date.now() - status.startTime
  });
});

// Get upload logs
app.get('/api/upload-logs/:videoId', (req: Request, res: Response) => {
  const { videoId } = req.params;
  const status = uploadStatusService.getStatus(videoId);
  
  if (!status) {
    return res.status(404).json({ error: 'Upload not found' });
  }
  
  res.json({
    videoId,
    logs: status.logs
  });
});

// Health check
app.get('/api/upload-health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    maxFileSize: '2GB',
    timeout: '10 minutes'
  });
});
```

## Configuration

### Environment Variables

```bash
# Upload timeouts
UPLOAD_TIMEOUT=600000          # 10 minutes total
POSE_DETECTION_TIMEOUT=30000   # 30 seconds per frame
FRAME_EXTRACTION_TIMEOUT=60000 # 60 seconds per video

# File size limits
MAX_FILE_SIZE=2147483648       # 2GB
MAX_JSON_SIZE=52428800         # 50MB

# Processing
BATCH_SIZE=10                  # Process 10 frames at a time
ENABLE_PROGRESS_TRACKING=true
```

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "No video file provided" | File not uploaded | Select a video file |
| "Invalid file type" | Wrong format | Use MP4, MOV, or WebM |
| "File too large" | Exceeds 2GB | Use smaller video |
| "Failed to extract frames" | Corrupted video | Try different video |
| "Pose detection timeout" | Service too slow | Check pose service health |
| "Database save failed" | MongoDB error | Check database connection |

## Performance

| Stage | Time | Notes |
|-------|------|-------|
| Upload | Depends on network | 5-60 seconds for typical video |
| Frame extraction | ~1-2 seconds | Fast, local operation |
| Pose detection | ~5-30 seconds per frame | Bottleneck, depends on GPU |
| Database save | ~1-5 seconds | Fast, batched |
| **Total** | **~5-10 minutes** | For 240 frames (4 sec @ 60 FPS) |

## Testing Strategy

### Unit Tests
- Status tracking (create, update, complete, error)
- Error message formatting
- Timeout handling

### Integration Tests
- Upload with various file sizes
- Upload with network interruption
- Upload with pose detection failure
- Status polling
- Log retrieval

### Acceptance Tests
- User can upload 60 FPS, 4-second video
- User sees progress during upload
- User sees error if upload fails
- Processing continues in background
- User can check status via API

## Correctness Properties

### Property 1: Error Propagation
*For any* error in any stage, the system SHALL propagate it to the frontend with a clear message.

### Property 2: Status Consistency
*For any* upload, the status SHALL be consistent between frontend polling and backend state.

### Property 3: Timeout Correctness
*For any* stage, if timeout is exceeded, the system SHALL abort and return an error.

### Property 4: Progress Monotonicity
*For any* upload, progress SHALL never decrease (only increase or stay same).

### Property 5: Completion Atomicity
*For any* upload, the system SHALL either complete fully or fail completely (no partial uploads).
