# Pose Service

Self-contained Python service for pose detection using 4DHumans (HMR2) and ViTPose models.

## Setup

### Prerequisites

- Python 3.8+
- CUDA 11.8+ (optional, for GPU acceleration)

### Installation

```bash
# Run setup script (Linux/macOS)
bash setup.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download models
python3 -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

## Usage

### Running the Service

```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the service
python app.py
```

### Input Format

The service reads JSON from stdin:

```json
{
  "frames": [
    {
      "frameNumber": 0,
      "imageBase64": "base64-encoded-image-data"
    },
    {
      "frameNumber": 1,
      "imagePath": "/path/to/image.jpg"
    }
  ]
}
```

### Output Format

The service writes JSON to stdout:

```json
[
  {
    "frameNumber": 0,
    "keypoints": [
      {
        "name": "pelvis",
        "x": 320.5,
        "y": 240.3,
        "z": 0.0,
        "confidence": 0.95
      }
    ],
    "has3d": true,
    "jointAngles3d": {
      "left_knee": 120.0,
      "right_knee": 125.0
    },
    "mesh_vertices_data": [...],
    "mesh_faces_data": [...],
    "cameraTranslation": [0.0, 0.0, 5.0],
    "processingTimeMs": 250
  }
]
```

## Models

### 4DHumans (HMR2)

- **Size**: ~500MB
- **Purpose**: 3D human pose and shape estimation
- **Cache**: `.models/hmr2/hmr2_ckpt.pt`

### ViTPose

- **Size**: ~100MB
- **Purpose**: 2D keypoint detection
- **Cache**: `.models/vitpose/vitpose_coco.pth`

## Performance

- **Process spawn time**: ~500ms (first run loads models from cache)
- **Frame processing**: ~100-500ms (depends on model and GPU)
- **Memory per process**: ~2-4GB (GPU memory for model)

## Troubleshooting

### Models not found

```bash
# Verify models are cached
ls -la .models/

# Re-download models
python3 -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

### CUDA not available

The service will automatically fall back to CPU if CUDA is not available. Performance will be slower.

### Out of memory

Reduce the number of concurrent processes or increase available GPU memory.

## Architecture

```
┌─────────────────────────────────────────┐
│  TypeScript Backend (Node.js)           │
│  - Process Pool Manager                 │
│  - HTTP Endpoints                       │
└────────────────┬────────────────────────┘
                 │
                 │ stdin/stdout
                 │
┌────────────────▼────────────────────────┐
│  Python Process (this service)          │
│  - Load models (cached)                 │
│  - Process frames                       │
│  - Output pose data                     │
└─────────────────────────────────────────┘
```

## Environment Variables

- `POSE_SERVICE_DEBUG`: Enable detailed logging (default: false)
- `TORCH_HOME`: PyTorch cache directory (default: ~/.cache/torch)

## License

See LICENSE file in parent directory.
