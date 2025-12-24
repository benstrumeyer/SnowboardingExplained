# Pose Service Process Pool Design

## Overview

This design implements a scalable, resilient pose detection service with the following architecture:

1. **Python Pose Service**: Self-contained folder with 4DHumans/ViTPose, all dependencies, and pre-downloaded models
2. **PoseServiceExecWrapper**: TypeScript service that spawns Python processes and manages their lifecycle
3. **Process Pool**: Enforces concurrency limits and queues excess requests
4. **HTTP API**: Clean endpoint for pose detection with frame input and pose data output
5. **Graceful Shutdown**: Proper cleanup of processes and resources

Each HTTP request spawns its own Python process, ensuring isolation and crash resilience.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                              │
│  POST /api/pose/detect                                      │
│  { frames: [...], format: "base64" | "paths" }             │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  HTTP Endpoint Handler          │
        │  - Validate input               │
        │  - Call PoseServiceExecWrapper  │
        │  - Return pose data             │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  Process Pool Manager           │
        │  - Check capacity               │
        │  - Queue if at limit            │
        │  - Spawn process if available   │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  PoseServiceExecWrapper         │
        │  - Spawn Python process         │
        │  - Pass frames via stdin        │
        │  - Read pose data from stdout   │
        │  - Handle crashes/timeouts      │
        │  - Cleanup resources            │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  Python Process                 │
        │  - Load models (cached)         │
        │  - Process frames               │
        │  - Output pose data             │
        │  - Exit cleanly                 │
        └─────────────────────────────────┘
```

## Components

### 1. Python Pose Service Folder Structure

```
pose-service/
├── app.py                    # Main entry point (reads stdin, writes stdout)
├── requirements.txt          # Python dependencies
├── setup.sh                  # Setup script (install deps, download models)
├── .models/                  # Cached model weights
│   ├── hmr2/                 # 4DHumans model (~500MB)
│   └── vitpose/              # ViTPose model (~100MB)
├── src/
│   ├── pose_detector.py      # Core pose detection logic
│   ├── models.py             # Model loading and caching
│   └── utils.py              # Utilities (JSON serialization, etc.)
└── README.md                 # Setup and usage instructions
```

### 2. PoseServiceExecWrapper (TypeScript)

```typescript
interface PoseFrame {
  frameNumber: number;
  imageBase64?: string;      // Base64-encoded image
  imagePath?: string;        // Path to image file
}

interface PoseResult {
  frameNumber: number;
  keypoints: Keypoint[];
  has3d: boolean;
  jointAngles3d?: Record<string, number>;
  mesh_vertices_data?: number[][];
  mesh_faces_data?: number[][];
  error?: string;
}

class PoseServiceExecWrapper {
  constructor(
    pythonServicePath: string,
    timeoutMs: number = 120000
  );

  // Spawn process and get pose data
  async getPoseInfo(frames: PoseFrame[]): Promise<PoseResult[]>;

  // Cleanup resources
  async cleanup(): Promise<void>;
}
```

**Key Implementation Details:**

```typescript
async getPoseInfo(frames: PoseFrame[]): Promise<PoseResult[]> {
  // 1. Spawn Python process
  const process = spawn('python', ['app.py'], {
    cwd: this.pythonServicePath,
    stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
  });

  // 2. Send frames as JSON to stdin
  const inputData = JSON.stringify({ frames });
  process.stdin.write(inputData);
  process.stdin.end();

  // 3. Read pose data from stdout
  let output = '';
  process.stdout.on('data', (data) => {
    output += data.toString();
  });

  // 4. Handle errors
  process.stderr.on('data', (data) => {
    logger.error('Python process stderr:', data.toString());
  });

  // 5. Wait for completion with timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error('Process timeout'));
    }, this.timeoutMs);

    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve(JSON.parse(output));
      }
    });
  });
}
```

### 3. Process Pool Manager

```typescript
interface PoolConfig {
  maxConcurrentProcesses: number;  // default: 2
  queueMaxSize: number;            // default: 100
  processTimeoutMs: number;        // default: 120000
}

class ProcessPoolManager {
  constructor(config: PoolConfig);

  // Queue a request
  async processRequest(frames: PoseFrame[]): Promise<PoseResult[]>;

  // Get pool status
  getStatus(): {
    activeProcesses: number;
    queuedRequests: number;
    totalProcessed: number;
    totalErrors: number;
  };

  // Graceful shutdown
  async shutdown(): Promise<void>;
}
```

**Implementation:**

```typescript
private async processRequest(frames: PoseFrame[]): Promise<PoseResult[]> {
  // Check if at capacity
  if (this.activeProcesses >= this.config.maxConcurrentProcesses) {
    // Queue the request
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.config.queueMaxSize) {
        reject(new Error('Queue full'));
      } else {
        this.queue.push({ frames, resolve, reject });
      }
    });
  }

  // Spawn process
  this.activeProcesses++;
  try {
    const wrapper = new PoseServiceExecWrapper(
      this.pythonServicePath,
      this.config.processTimeoutMs
    );
    const result = await wrapper.getPoseInfo(frames);
    this.totalProcessed++;
    return result;
  } catch (error) {
    this.totalErrors++;
    throw error;
  } finally {
    this.activeProcesses--;
    // Process next queued request
    this.processNextQueued();
  }
}

private processNextQueued(): void {
  if (this.queue.length > 0 && this.activeProcesses < this.config.maxConcurrentProcesses) {
    const { frames, resolve, reject } = this.queue.shift()!;
    this.processRequest(frames).then(resolve).catch(reject);
  }
}
```

### 4. HTTP Endpoint

```typescript
app.post('/api/pose/detect', async (req: Request, res: Response) => {
  try {
    const { frames, format } = req.body;

    // Validate input
    if (!frames || !Array.isArray(frames)) {
      return res.status(400).json({ error: 'Invalid frames' });
    }

    // Process frames
    const poseResults = await poolManager.processRequest(frames);

    // Return results
    res.json({
      success: true,
      data: poseResults,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/pose/health', (req: Request, res: Response) => {
  const status = poolManager.getStatus();
  res.json({
    status: 'healthy',
    pool: status,
    timestamp: new Date().toISOString()
  });
});
```

### 5. Python Service (app.py)

```python
#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from pose_detector import PoseDetector

def main():
    # Load models once
    detector = PoseDetector(model_cache_dir='.models')

    # Read input from stdin
    input_data = sys.stdin.read()
    request = json.loads(input_data)
    frames = request['frames']

    # Process frames
    results = []
    for frame in frames:
        try:
            if 'imageBase64' in frame:
                # Decode base64
                image_data = base64.b64decode(frame['imageBase64'])
                result = detector.detect(image_data)
            elif 'imagePath' in frame:
                # Load from file
                result = detector.detect_from_file(frame['imagePath'])
            
            results.append({
                'frameNumber': frame['frameNumber'],
                'keypoints': result['keypoints'],
                'has3d': result['has3d'],
                'jointAngles3d': result['joint_angles_3d'],
                'mesh_vertices_data': result['mesh_vertices'],
                'mesh_faces_data': result['mesh_faces']
            })
        except Exception as e:
            results.append({
                'frameNumber': frame['frameNumber'],
                'error': str(e)
            })

    # Write output to stdout
    json.dump(results, sys.stdout)
    sys.stdout.flush()

if __name__ == '__main__':
    main()
```

## Configuration

### Environment Variables

```bash
# Path to Python pose service folder
POSE_SERVICE_PATH=/opt/pose-service

# Max concurrent processes (default: 2)
MAX_CONCURRENT_PROCESSES=2

# Process timeout in milliseconds (default: 120000)
PROCESS_TIMEOUT_MS=120000

# Max queue size (default: 100)
QUEUE_MAX_SIZE=100

# Enable detailed logging
POSE_SERVICE_DEBUG=true
```

### Setup Script (setup.sh)

```bash
#!/bin/bash
set -e

echo "🔧 Setting up Pose Service..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create model cache directory
mkdir -p .models

# Download models
echo "📥 Downloading 4DHumans (HMR2) model..."
python3 -c "from models import download_hmr2; download_hmr2('.models')"

echo "📥 Downloading ViTPose model..."
python3 -c "from models import download_vitpose; download_vitpose('.models')"

echo "✅ Setup complete!"
echo "To start the service, run: python app.py"
```

## Data Flow

### Request Flow

```
1. HTTP POST /api/pose/detect
   ├─ Validate frames (base64 or paths)
   ├─ Call poolManager.processRequest(frames)
   │
2. Process Pool Manager
   ├─ Check if at capacity
   ├─ If yes: queue request
   ├─ If no: spawn process
   │
3. PoseServiceExecWrapper
   ├─ Spawn Python process
   ├─ Write frames to stdin (JSON)
   ├─ Read pose data from stdout (JSON)
   ├─ Handle errors/timeouts
   ├─ Cleanup resources
   │
4. Python Process
   ├─ Load models (from cache)
   ├─ Process frames
   ├─ Output pose data (JSON)
   ├─ Exit
   │
5. Return Response
   ├─ HTTP 200 with pose results
   └─ Or HTTP 500 with error
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Process spawn time | ~500ms | First run loads models from cache |
| Frame processing | ~100-500ms | Depends on model and GPU |
| Memory per process | ~2-4GB | GPU memory for model |
| Max concurrent processes | 2 (configurable) | Prevents GPU OOM |
| Queue max size | 100 (configurable) | Prevents memory bloat |
| Process timeout | 120s (configurable) | Prevents hanging processes |

## Error Handling

| Error | Handling |
|-------|----------|
| Invalid input | HTTP 400 with error message |
| Process timeout | Kill process, return error |
| Process crash | Log error, return error response |
| Queue full | HTTP 429 (Too Many Requests) |
| Model not found | HTTP 500 with setup instructions |

## Testing Strategy

### Unit Tests
- Process spawning and cleanup
- JSON serialization/deserialization
- Pool capacity enforcement
- Queue FIFO ordering
- Error handling (crashes, timeouts)

### Integration Tests
- End-to-end pose detection
- Process pool under load
- Queue behavior
- Crash recovery
- Graceful shutdown

### Acceptance Tests
- HTTP endpoint works with base64 frames
- HTTP endpoint works with file paths
- Process isolation (crashes don't affect others)
- Pool limits concurrent processes
- Metrics endpoint reports accurate status

## Deployment

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Copy pose service
COPY pose-service/ /opt/pose-service/

# Setup pose service
RUN cd /opt/pose-service && bash setup.sh

# Copy Node.js backend
COPY backend/ /app/

# Install Node dependencies
RUN npm install

# Expose ports
EXPOSE 3001 5000

# Start services
CMD ["npm", "start"]
```

### Linux Deployment

```bash
# 1. Clone/download pose service
git clone <repo> /opt/pose-service

# 2. Run setup
cd /opt/pose-service && bash setup.sh

# 3. Start Node.js backend (which uses the pose service)
cd /path/to/backend && npm start
```

## Graceful Shutdown

```typescript
async shutdown(): Promise<void> {
  console.log('Shutting down process pool...');
  
  // Stop accepting new requests
  this.acceptingRequests = false;

  // Wait for in-flight processes (with timeout)
  const shutdownTimeout = 30000; // 30 seconds
  const startTime = Date.now();
  
  while (this.activeProcesses > 0) {
    if (Date.now() - startTime > shutdownTimeout) {
      console.warn(`Force-killing ${this.activeProcesses} remaining processes`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Cleanup resources
  await this.cleanup();
  console.log('Process pool shutdown complete');
}
```

## Monitoring

### Health Endpoint

```json
GET /api/pose/health
{
  "status": "healthy",
  "pool": {
    "activeProcesses": 1,
    "queuedRequests": 5,
    "totalProcessed": 1234,
    "totalErrors": 2
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Metrics Endpoint

```json
GET /api/pose/metrics
{
  "avgProcessingTimeMs": 250,
  "successRate": 0.998,
  "errorRate": 0.002,
  "uptime": 86400000,
  "totalRequests": 1236,
  "totalSuccesses": 1234,
  "totalErrors": 2
}
```
