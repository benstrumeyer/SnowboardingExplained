# Pose Overlay Viewer - API Reference

## Base URL
```
http://localhost:3001
```

## Endpoints

### Upload Video with Pose Extraction

**POST** `/api/upload-video-with-pose`

Upload a video file for pose extraction and mesh generation.

**Request**
- Content-Type: `multipart/form-data`
- Fields:
  - `video` (file, required): Video file (MP4, MOV, WebM)
  - `role` (string, required): `"rider"` or `"reference"`

**Response** (200 OK)
```json
{
  "success": true,
  "videoId": "v_1734867890123_1",
  "role": "rider",
  "frameCount": 60,
  "meshSequence": [
    {
      "frameNumber": 0,
      "timestamp": 0,
      "keypoints": [...],
      "has3d": true,
      "mesh_vertices_data": [...],
      "mesh_faces_data": [...],
      "cameraTranslation": [...]
    }
  ]
}
```

**Response** (202 Accepted - Processing)
```json
{
  "videoId": "v_1734867890123_1",
  "status": "processing",
  "message": "Video processing started. Poll /api/mesh-data/{videoId} for completion."
}
```

**Response** (400 Bad Request)
```json
{
  "error": "Missing role field"
}
```

---

### Get Mesh Data

**GET** `/api/mesh-data/{videoId}`

Retrieve processed mesh data for a video.

**Parameters**
- `videoId` (path, required): Video ID from upload response

**Response** (200 OK)
```json
{
  "frames": [
    {
      "frameNumber": 0,
      "timestamp": 0,
      "vertices": [[x, y, z], ...],
      "faces": [[i, j, k], ...],
      "keypoints": [...],
      "has3d": true,
      "jointAngles3d": {
        "left_knee": 45.2,
        "right_knee": 42.8,
        ...
      },
      "cameraTranslation": [0, 0, 5]
    }
  ]
}
```

**Response** (202 Accepted - Still Processing)
```json
{
  "status": "processing",
  "message": "Still processing"
}
```

**Response** (404 Not Found)
```json
{
  "error": "Mesh data not found for v_1734867890123_1",
  "videoId": "v_1734867890123_1"
}
```

---

### Get Job Status

**GET** `/api/job-status/{videoId}`

Check the processing status of a video upload.

**Parameters**
- `videoId` (path, required): Video ID from upload response

**Response** (200 OK)
```json
{
  "status": "complete",
  "videoId": "v_1734867890123_1",
  "frameCount": 60,
  "completedAt": 1734867950000
}
```

**Response** (202 Accepted - Still Processing)
```json
{
  "status": "processing",
  "videoId": "v_1734867890123_1",
  "startedAt": 1734867890000
}
```

**Response** (404 Not Found)
```json
{
  "error": "Job not found for v_1734867890123_1"
}
```

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK**: Request successful
- **202 Accepted**: Request accepted, processing in progress
- **400 Bad Request**: Invalid request parameters
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

## Logging

All API requests are logged with detailed information:

```
[UPLOAD] ========================================
[UPLOAD] Generated videoId: v_1734867890123_1
[UPLOAD] Role: rider
[UPLOAD] Processing video for pose extraction
[UPLOAD] File: video.mov, Size: 5242880
[UPLOAD] ✓ Stored mesh data in meshDataStore[v_1734867890123_1]
[UPLOAD] ✓ meshDataStore keys: ['v_1734867890123_1']
```

## Rate Limiting

Currently no rate limiting. Recommended for production:
- 10 uploads per minute per IP
- 100 mesh data requests per minute per IP

## Timeout Behavior

- **Upload timeout**: 5 minutes
- **Mesh data polling**: 2 minutes (120 retries × 1 second)
- **Job status polling**: 10 seconds per request

## Example Usage

### JavaScript/Fetch

```javascript
// Upload video
const formData = new FormData();
formData.append('video', videoFile);
formData.append('role', 'rider');

const uploadResponse = await fetch('http://localhost:3001/api/upload-video-with-pose', {
  method: 'POST',
  body: formData
});

const { videoId } = await uploadResponse.json();

// Poll for mesh data
let meshData = null;
for (let i = 0; i < 120; i++) {
  const response = await fetch(`http://localhost:3001/api/mesh-data/${videoId}`);
  
  if (response.status === 200) {
    meshData = await response.json();
    break;
  }
  
  await new Promise(r => setTimeout(r, 1000));
}

// Use mesh data
console.log(`Loaded ${meshData.frames.length} frames`);
```

### cURL

```bash
# Upload video
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@video.mov" \
  -F "role=rider"

# Get mesh data
curl http://localhost:3001/api/mesh-data/v_1734867890123_1
```
