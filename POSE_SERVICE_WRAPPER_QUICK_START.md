# Pose Service Wrapper - Quick Start Guide

## Starting the Service

### Basic Start
```bash
cd SnowboardingExplained/backend/pose-service
python flask_wrapper_minimal_safe.py
```

### With Custom Configuration
```bash
export POSE_TIMEOUT_MS=300000
export DEBUG_MODE=true
export POSE_LOG_DIR=/var/log/pose-service
python flask_wrapper_minimal_safe.py
```

### Docker Start
```bash
docker run -e POSE_TIMEOUT_MS=300000 \
           -e DEBUG_MODE=false \
           -v /path/to/videos:/videos \
           -p 5000:5000 \
           pose-service:latest
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POSE_POOL_SIZE` | 1 | Max concurrent workers |
| `POSE_TIMEOUT_MS` | 180000 | Subprocess timeout (ms) |
| `POSE_SERVICE_PATH` | /home/ben/pose-service | Service directory path |
| `DEBUG_MODE` | false | Enable debug logging |
| `POSE_LOG_DIR` | /tmp/pose-service-logs | Log file directory |

## API Endpoints

### 1. Submit Video for Processing
```bash
curl -X POST http://localhost:5000/pose/video \
  -H "Content-Type: application/json" \
  -d '{"video_path": "/path/to/video.mp4"}'
```

**Response** (if GPU available):
```json
{
  "status": "success",
  "total_frames": 240,
  "processing_time_seconds": 30.3,
  "job_id": "abc123"
}
```

**Response** (if GPU busy):
```json
{
  "status": "queued",
  "job_id": "abc123",
  "queue_position": 2
}
```

### 2. Check Job Status
```bash
curl http://localhost:5000/pose/video/status/abc123
```

**Response**:
```json
{
  "job_id": "abc123",
  "status": "processing",
  "video_path": "/path/to/video.mp4",
  "queued_at": 1735296645.123,
  "started_at": 1735296650.456
}
```

### 3. Health Check
```bash
curl http://localhost:5000/api/pose/health
```

**Response**:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "gpu_available": true,
  "device": "cuda"
}
```

### 4. Pool Status
```bash
curl http://localhost:5000/api/pose/pool-status
```

**Response**:
```json
{
  "pool": {
    "gpu_busy": true,
    "active_workers": 1,
    "available_workers": 0
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
  }
}
```

### 5. Process Single Frame
```bash
curl -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "iVBORw0KGgoAAAANS...",
    "frame_number": 0
  }'
```

**Response**:
```json
{
  "frame_number": 0,
  "keypoints": [...],
  "mesh_vertices_data": [...],
  "camera_translation": [0.0, 0.0, 5.0],
  "processing_time_ms": 150
}
```

## Monitoring

### View Logs
```bash
# Real-time logs
tail -f /tmp/pose-service-logs/pose-service-*.log

# Search for errors
grep ERROR /tmp/pose-service-logs/pose-service-*.log

# Search for specific job
grep "job_id: abc123" /tmp/pose-service-logs/pose-service-*.log
```

### Check Service Health
```bash
# Every 5 seconds
watch -n 5 'curl -s http://localhost:5000/api/pose/health | jq'

# Check queue status
curl -s http://localhost:5000/api/pose/pool-status | jq '.queue'
```

## Common Issues

### Issue: Service Not Responding
```bash
# Check if service is running
curl http://localhost:5000/api/pose/health

# Check logs for errors
tail -f /tmp/pose-service-logs/pose-service-*.log

# Verify models are loaded
curl http://localhost:5000/health | jq '.models'
```

### Issue: Video Processing Timeout
```bash
# Increase timeout
export POSE_TIMEOUT_MS=600000  # 10 minutes
python flask_wrapper_minimal_safe.py
```

### Issue: GPU Out of Memory
```bash
# Check GPU status
nvidia-smi

# Reduce pool size
export POSE_POOL_SIZE=1
python flask_wrapper_minimal_safe.py
```

### Issue: Queue Growing Too Large
```bash
# Check pool status
curl http://localhost:5000/api/pose/pool-status | jq '.queue'

# Increase timeout or reduce video size
export POSE_TIMEOUT_MS=300000
```

## Performance Tuning

### For High Throughput
```bash
export POSE_POOL_SIZE=4
export POSE_TIMEOUT_MS=180000
export DEBUG_MODE=false
```

### For Debugging
```bash
export DEBUG_MODE=true
export POSE_LOG_DIR=/var/log/pose-service
```

### For Long Videos
```bash
export POSE_TIMEOUT_MS=600000  # 10 minutes
```

## Integration Example

### Python Client
```python
import requests
import json

# Submit video
response = requests.post(
    'http://localhost:5000/pose/video',
    json={'video_path': '/path/to/video.mp4'}
)

if response.status_code == 202:
    # Queued
    job_id = response.json()['job_id']
    print(f"Job queued: {job_id}")
    
    # Poll for completion
    import time
    while True:
        status = requests.get(f'http://localhost:5000/pose/video/status/{job_id}')
        if status.json()['status'] == 'completed':
            result = status.json()['result']
            print(f"Completed: {result['total_frames']} frames")
            break
        time.sleep(5)
else:
    # Processed immediately
    result = response.json()
    print(f"Processed: {result['total_frames']} frames")
```

### JavaScript Client
```javascript
// Submit video
const response = await fetch('http://localhost:5000/pose/video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ video_path: '/path/to/video.mp4' })
});

const data = await response.json();

if (response.status === 202) {
  // Queued - poll for status
  const jobId = data.job_id;
  const pollStatus = async () => {
    const status = await fetch(`http://localhost:5000/pose/video/status/${jobId}`);
    const statusData = await status.json();
    console.log(`Status: ${statusData.status}`);
    if (statusData.status !== 'completed') {
      setTimeout(pollStatus, 5000);
    }
  };
  pollStatus();
} else {
  // Processed immediately
  console.log(`Frames: ${data.total_frames}`);
}
```

## Troubleshooting

### Enable Debug Logging
```bash
export DEBUG_MODE=true
python flask_wrapper_minimal_safe.py 2>&1 | tee debug.log
```

### Check Service Configuration
```bash
curl http://localhost:5000/api/pose/health | jq '.'
```

### Monitor GPU Usage
```bash
watch -n 1 nvidia-smi
```

### Check Disk Space
```bash
df -h /tmp/pose-service-logs
```

## Production Deployment

### Systemd Service
```ini
[Unit]
Description=Pose Service Wrapper
After=network.target

[Service]
Type=simple
User=pose-service
WorkingDirectory=/home/pose-service/pose-service
Environment="POSE_TIMEOUT_MS=300000"
Environment="DEBUG_MODE=false"
ExecStart=/usr/bin/python3 flask_wrapper_minimal_safe.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Docker Compose
```yaml
version: '3.8'
services:
  pose-service:
    image: pose-service:latest
    ports:
      - "5000:5000"
    environment:
      POSE_TIMEOUT_MS: 300000
      DEBUG_MODE: false
      POSE_LOG_DIR: /var/log/pose-service
    volumes:
      - /var/log/pose-service:/var/log/pose-service
      - /data/videos:/videos
    restart: always
```

## Support

For issues or questions:
1. Check logs: `/tmp/pose-service-logs/`
2. Check health: `curl http://localhost:5000/api/pose/health`
3. Check pool status: `curl http://localhost:5000/api/pose/pool-status`
4. Review documentation: `ROBUST_POSE_SERVICE_WRAPPER_COMPLETE.md`
