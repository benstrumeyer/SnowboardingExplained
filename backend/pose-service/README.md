# Pose Detection Service

Python Flask service for MediaPipe pose detection.

## Setup

```bash
cd SnowboardingExplained/backend/pose-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running

```bash
python app.py
```

Server runs on `http://localhost:5000`

## Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "pose-detection",
  "timestamp": 1702900000.0
}
```

### POST /pose
Detect pose from a single image.

**Request:**
```json
{
  "image_base64": "base64 encoded PNG/JPG",
  "frame_number": 0
}
```

**Response:**
```json
{
  "frame_number": 0,
  "frame_width": 1920,
  "frame_height": 1080,
  "keypoints": [
    {"name": "nose", "x": 960, "y": 540, "z": 0.1, "confidence": 0.95},
    {"name": "left_shoulder", "x": 850, "y": 600, "z": 0.2, "confidence": 0.92},
    ...
  ],
  "keypoint_count": 33,
  "processing_time_ms": 145.5,
  "model_version": "mediapipe-0.10.9"
}
```

### POST /batch
Detect pose from multiple images.

**Request:**
```json
{
  "images": [
    {"image_base64": "...", "frame_number": 0},
    {"image_base64": "...", "frame_number": 1}
  ]
}
```

**Response:**
```json
{
  "results": [...],
  "total_processing_time_ms": 290.5
}
```

## MediaPipe Keypoints (33 total)

| Index | Name | Description |
|-------|------|-------------|
| 0 | nose | Nose tip |
| 1-3 | left_eye_* | Left eye (inner, center, outer) |
| 4-6 | right_eye_* | Right eye (inner, center, outer) |
| 7-8 | ears | Left and right ears |
| 9-10 | mouth | Left and right mouth corners |
| 11-12 | shoulders | Left and right shoulders |
| 13-14 | elbows | Left and right elbows |
| 15-16 | wrists | Left and right wrists |
| 17-22 | hands | Pinky, index, thumb (left and right) |
| 23-24 | hips | Left and right hips |
| 25-26 | knees | Left and right knees |
| 27-28 | ankles | Left and right ankles |
| 29-30 | heels | Left and right heels |
| 31-32 | foot_index | Left and right foot index (toe) |
