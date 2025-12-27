# Flask Wrapper Quick Start Guide

## Overview

The Flask wrapper provides an HTTP interface to 4D-Humans with PHALP temporal tracking. It exposes three endpoints:

- `/health` - Health check
- `/pose/hybrid` - Process a single frame
- `/pose/batch` - Process multiple frames

## Prerequisites

All dependencies are already installed in `/home/ben/pose-service/4D-Humans/venv/`

## Starting the Flask Wrapper

### Option 1: Manual Start (for development)

```bash
cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate
python flask_wrapper.py
```

The wrapper will start on `http://localhost:5000`

### Option 2: Run Full Integration Test

```bash
bash /mnt/c/Users/benja/repos/SnowboardingExplained/run_full_integration_test.sh
```

This will:
1. Start the Flask wrapper
2. Run integration tests
3. Verify everything works
4. Stop the wrapper

## API Endpoints

### Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ready",
  "models": {
    "hmr2": "loaded",
    "phalp": "loaded"
  },
  "device": "cuda",
  "ready": true
}
```

### Process Single Frame

```bash
curl -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "...",
    "frame_number": 0
  }'
```

Response:
```json
{
  "frame_number": 0,
  "keypoints": [...],
  "has_3d": true,
  "mesh_vertices_data": [...],
  "mesh_faces_data": [],
  "camera_translation": [...],
  "processing_time_ms": 250,
  "error": null
}
```

## Testing

### Run Integration Tests

```bash
cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate
python test_flask_integration.py
```

This will:
1. Test the health endpoint
2. Test processing a single frame
3. Test processing multiple frames
4. Report timing and results

### Manual Test with curl

```bash
# Create a test image and encode it
python3 << 'EOF'
import base64
from PIL import Image
import numpy as np

# Create test image
img = Image.fromarray(np.random.randint(0, 256, (512, 512, 3), dtype=np.uint8))
img.save('/tmp/test.png')

# Encode to base64
with open('/tmp/test.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
    print(b64)
EOF

# Send to Flask wrapper
curl -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"$B64\", \"frame_number\": 0}"
```

## Monitoring

### Check if Flask is Running

```bash
ps aux | grep flask_wrapper
```

### View Flask Logs

```bash
tail -f /tmp/flask_wrapper.log
```

### Check Port 5000

```bash
netstat -tlnp | grep 5000
```

## Performance

- **First request**: ~30-60 seconds (models load on first request)
- **Subsequent requests**: ~100-250ms per frame (GPU)
- **Device**: CUDA (GPU) if available, CPU fallback

## Integration with Node.js Backend

Your Node.js backend is already configured to call this endpoint. The `poseServiceHttpWrapper.ts` will:

1. Send frames to `http://localhost:5000/pose/hybrid`
2. Receive pose data in the expected format
3. Store results in MongoDB
4. Return to frontend

No changes needed to your backend!

## Troubleshooting

### Flask won't start

Check the logs:
```bash
cat /tmp/flask_wrapper.log
```

Common issues:
- Port 5000 already in use: `lsof -i :5000`
- Virtual environment not activated
- Missing dependencies

### Models not loading

The models load on first request. This can take 30-60 seconds. Check:
```bash
ps aux | grep flask_wrapper
```

If the process is using CPU/memory, it's loading models.

### Slow processing

- First frame: Models are loading (normal)
- Subsequent frames: Should be 100-250ms
- If slower: Check GPU usage with `nvidia-smi`

## Next Steps

1. **Start the wrapper**: `python flask_wrapper.py`
2. **Test it**: `python test_flask_integration.py`
3. **Upload a video** to your Node.js backend
4. **Verify 100% frame coverage** in the results

## Files

- `flask_wrapper.py` - Main Flask application
- `test_flask_integration.py` - Integration test script
- `run_full_integration_test.sh` - Full test runner
- `/tmp/flask_wrapper.log` - Flask logs

## Support

For issues, check:
1. Flask logs: `cat /tmp/flask_wrapper.log`
2. GPU status: `nvidia-smi`
3. Port availability: `netstat -tlnp | grep 5000`
4. Virtual environment: `which python` (should be in venv)
