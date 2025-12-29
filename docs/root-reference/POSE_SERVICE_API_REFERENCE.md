# Pose Service Wrapper - API Reference

## Base URL
```
http://localhost:5000
```

## Endpoints

### 1. Health Check (Basic)
**Endpoint**: `GET /health`

**Description**: Basic health check for the pose service

**Response**:
```json
{
  "status": "ready|warming_up",
  "models": {
    "hmr2": "loaded|not_loaded",
    "vitdet": "loaded|not_loaded",
    "phalp": "loaded|not_loaded"
  },
  "device": "cuda|cpu",
  "ready": true|false,
  "vitdet_available": true|false,
  "error": null|"error message"
}
```

**HTTP Status**:
- `200 OK` - Service is ready
- `503 Service Unavailable` - Service is initializing

---

### 2. Pose Service Health (Detailed)
**Endpoint**: `GET /api/pose/health`

**Description**: Detailed health check with pool and GPU information

**Response**:
```json
{
  "status": "healthy|initializing|degraded|error",
  "timestamp": 1735296700.123,
  "models_loaded": true|false,
  "gpu_available": true|false,
  "device": "cuda|cpu",
  "models": {
    "hmr2": true|false,
    "vitdet": true|false,
    "phalp": true|false
  },
  "pool": {
    "gpu_busy": true|false,
    "queue_length": 0,
    "active_jobs": 1
  }
}
```

**HTTP Status**:
- `200 OK` - Service is healthy or degraded
- `503 Service Unavailable` - Service is initializing

**Status Meanings**:
- `healthy` - All systems operational, queue empty
- `initializing` - Models still loading
- `degraded` - Queue length > 10
- `error` - Service error occurred

---

### 3. Pool Status
**Endpoint**: `GET /api/pose/pool-status`

**Description**: Get current pool state, queue metrics, and job statistics

**Response**:
```json
{
  "timestamp": 1735296700.123,
  "pool": {
    "gpu_busy": true|false,
    "max_workers": 1,
    "active_workers": 0|1,
    "available_workers": 0|1
  },
  "queue": {
    "length": 3,
    "estimated_wait_time_seconds": 180
  },
  "jobs": {
    "total": 4,
    "queued": 3,
    "processing": 1,
    "completed": 0
  },
  "system": {
    "device": "cuda|cpu",
    "gpu_available": true|false,
    "models_loaded": true|false
  }
}
```

**HTTP Status**:
- `200 OK` - Status retrieved successfully
- `500 Internal Server Error` - Error retrieving status

---

### 4. Submit Video for Processing
**Endpoint**: `POST /pose/video`

**Description**: Submit a video file for pose detection processing

**Request**:
```json
{
  "video_path": "/path/to/video.mp4"
}
```

**Response (GPU Available - Immediate Processing)**:
```json
{
  "status": "success",
  "video_path": "/path/to/video.mp4",
  "pkl_path": "/path/to/output.pkl",
  "total_frames": 240,
  "frames": [
    {
      "frame_number": 0,
      "timestamp": 0.0,
      "persons": [
        {
          "track_id": 0,
          "confidence": 0.95,
          "tracking_confidence": 0.98,
          "smpl": {
            "betas": [...],
            "body_pose": [...],
            "global_orient": [...]
          },
          "keypoints_3d": [...],
          "keypoints_2d": [...],
          "camera": {
            "tx": 0.0,
            "ty": 0.0,
            "tz": 5.0
          },
          "bbox": [100, 50, 300, 400],
          "mesh_vertices": [...]
        }
      ]
    }
  ],
  "processing_time_seconds": 30.3,
  "parsing_time_seconds": 2.1,
  "job_id": "abc123-def456"
}
```

**Response (GPU Busy - Queued)**:
```json
{
  "status": "queued",
  "job_id": "abc123-def456",
  "message": "Video processing queued - GPU is currently busy",
  "queue_position": 2
}
```

**HTTP Status**:
- `200 OK` - Video processed successfully
- `202 Accepted` - Video queued for processing
- `400 Bad Request` - Invalid request (missing video_path, file not found)
- `500 Internal Server Error` - Processing error

**Error Response**:
```json
{
  "error": "Video file not found: /path/to/video.mp4"
}
```

---

### 5. Check Job Status
**Endpoint**: `GET /pose/video/status/<job_id>`

**Description**: Check the status of a submitted video processing job

**Parameters**:
- `job_id` (path parameter) - Job ID from submission response

**Response**:
```json
{
  "job_id": "abc123-def456",
  "status": "queued|processing|completed",
  "video_path": "/path/to/video.mp4",
  "queued_at": 1735296645.123,
  "started_at": 1735296650.456,
  "completed_at": 1735296680.789,
  "result": {
    "status": "success",
    "total_frames": 240,
    "processing_time_seconds": 30.3
  }
}
```

**HTTP Status**:
- `200 OK` - Status retrieved successfully
- `404 Not Found` - Job ID not found

**Status Meanings**:
- `queued` - Waiting for GPU to become available
- `processing` - Currently being processed
- `completed` - Processing finished (check `result` field)

---

### 6. Process Single Frame
**Endpoint**: `POST /pose/hybrid`

**Description**: Process a single frame with HMR2 + PHALP tracking

**Request**:
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "frame_number": 0
}
```

**Response**:
```json
{
  "frame_number": 0,
  "keypoints": [
    {
      "name": "joint_0",
      "x": 100.5,
      "y": 150.3,
      "z": 2.1,
      "confidence": 0.95
    }
  ],
  "has_3d": true,
  "mesh_vertices_data": [...],
  "mesh_faces_data": [...],
  "camera_translation": [0.0, 0.0, 5.0],
  "camera_params": {
    "scale": 0.9,
    "tx": 0.1,
    "ty": -0.2,
    "type": "weak_perspective"
  },
  "camera_full": {
    "tx": 0.0,
    "ty": 0.0,
    "tz": 5.0,
    "focal_length": 1000.0,
    "img_width": 1920,
    "img_height": 1080,
    "type": "perspective"
  },
  "detection": {
    "box_center": [960, 540],
    "box_size": 500.0,
    "vitdet_used": true,
    "num_persons_detected": 1
  },
  "phalp_available": true,
  "processing_time_ms": 150,
  "error": null
}
```

**HTTP Status**:
- `200 OK` - Frame processed successfully
- `400 Bad Request` - Invalid request (missing image_base64)
- `500 Internal Server Error` - Processing error
- `503 Service Unavailable` - Models not loaded

**Error Response**:
```json
{
  "error": "Failed to decode image: Invalid base64 string"
}
```

---

## Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 202 | Accepted | Request queued for processing |
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found (e.g., job ID) |
| 500 | Internal Server Error | Server error during processing |
| 503 | Service Unavailable | Service initializing or unavailable |

---

## Data Types

### Frame Data
```json
{
  "frame_number": 0,
  "timestamp": 0.0,
  "persons": [...]
}
```

### Person Data
```json
{
  "track_id": 0,
  "confidence": 0.95,
  "tracking_confidence": 0.98,
  "smpl": {
    "betas": [0.1, 0.2, ...],
    "body_pose": [0.0, 0.1, ...],
    "global_orient": [0.0, 0.0, 0.0]
  },
  "keypoints_3d": [[x, y, z], ...],
  "keypoints_2d": [[x, y], ...],
  "camera": {
    "tx": 0.0,
    "ty": 0.0,
    "tz": 5.0
  },
  "bbox": [x1, y1, x2, y2],
  "mesh_vertices": [[x, y, z], ...]
}
```

### Keypoint Data
```json
{
  "name": "joint_0",
  "x": 100.5,
  "y": 150.3,
  "z": 2.1,
  "confidence": 0.95
}
```

---

## Example Workflows

### Workflow 1: Submit and Poll for Completion

```bash
# 1. Submit video
JOB_ID=$(curl -s -X POST http://localhost:5000/pose/video \
  -H "Content-Type: application/json" \
  -d '{"video_path": "/path/to/video.mp4"}' | jq -r '.job_id')

echo "Job ID: $JOB_ID"

# 2. Poll for status
while true; do
  STATUS=$(curl -s http://localhost:5000/pose/video/status/$JOB_ID | jq -r '.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "Processing complete!"
    break
  fi
  
  sleep 5
done

# 3. Get results
curl -s http://localhost:5000/pose/video/status/$JOB_ID | jq '.result'
```

### Workflow 2: Check Health Before Submitting

```bash
# 1. Check health
HEALTH=$(curl -s http://localhost:5000/api/pose/health | jq -r '.status')

if [ "$HEALTH" != "healthy" ]; then
  echo "Service not healthy: $HEALTH"
  exit 1
fi

# 2. Check queue
QUEUE_LEN=$(curl -s http://localhost:5000/api/pose/pool-status | jq '.queue.length')
echo "Queue length: $QUEUE_LEN"

# 3. Submit video
curl -X POST http://localhost:5000/pose/video \
  -H "Content-Type: application/json" \
  -d '{"video_path": "/path/to/video.mp4"}'
```

### Workflow 3: Monitor Queue

```bash
# Monitor queue in real-time
watch -n 2 'curl -s http://localhost:5000/api/pose/pool-status | jq "{queue: .queue, jobs: .jobs}"'
```

---

## Error Handling

### Common Errors

**Video File Not Found**
```json
{
  "error": "Video file not found: /path/to/video.mp4"
}
```

**Missing Parameter**
```json
{
  "error": "Missing video_path parameter"
}
```

**Processing Timeout**
```json
{
  "error": "Processing timeout (exceeded 180000ms)"
}
```

**Models Not Loaded**
```json
{
  "error": "HMR2 model not loaded"
}
```

**Invalid Image**
```json
{
  "error": "Failed to decode image: Invalid base64 string"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. The service will queue requests if GPU is busy.

---

## Authentication

Currently no authentication is required. In production, consider adding:
- API key authentication
- JWT token validation
- IP whitelisting

---

## CORS

CORS is not explicitly configured. In production, consider adding:
```python
from flask_cors import CORS
CORS(app)
```

---

## Versioning

Current API version: `1.0`

Future versions may include:
- Batch processing endpoints
- Streaming responses
- WebSocket support for real-time updates

---

## Support

For API issues:
1. Check `/api/pose/health` endpoint
2. Review logs in `/tmp/pose-service-logs/`
3. Check `/api/pose/pool-status` for queue info
4. Verify video file exists and is readable
