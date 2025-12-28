# Services Status - December 28, 2025

## All 5 Terminals Running ✓

### Terminal 1: Pose Service (Flask Wrapper) - ProcessId 9
- **Status**: ✓ Running
- **Command**: `wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_minimal_safe.py"`
- **Port**: 5000
- **URL**: http://127.0.0.1:5000
- **Key Fix Applied**: Detector moved to CPU to prevent GPU OOM
- **Latest Log**: 
  ```
  * Running on all addresses (0.0.0.0)
  * Running on http://127.0.0.1:5000
  * Running on http://172.24.183.130:5000
  Press CTRL+C to quit
  ```

### Terminal 2: Backend API - ProcessId 3
- **Status**: ✓ Running
- **Command**: `cd "C:\Users\benja\repos\SnowboardingExplained"; .\start-backend.bat`
- **Port**: 3001
- **URL**: http://0.0.0.0:3001
- **Latest Log**: Mesh data list endpoint polling (healthy)

### Terminal 3: Frontend Dev Server - ProcessId 4
- **Status**: ✓ Running
- **Command**: `cd "C:\Users\benja\repos\SnowboardingExplained\backend\web"; npm run dev`
- **Port**: 5173
- **URL**: http://localhost:5173/
- **Latest Log**: Vite dev server ready

### Terminal 4: ngrok Tunnel - ProcessId 5
- **Status**: ✓ Running
- **Command**: `cd "C:\Program Files\"; ngrok http 3001`
- **Port**: 4040 (web interface)
- **Forwarding**: https://uncongenial-nonobst... (check ngrok web interface)
- **Latest Log**: Session online, forwarding active

### Terminal 5: Docker Services - ProcessId 6
- **Status**: ✓ Running
- **Services**:
  - Redis: `docker run -d -p 6379:6379 redis`
  - MongoDB: `docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest`
- **Ports**: 6379 (Redis), 27017 (MongoDB)

## GPU OOM Fix Applied

The detector has been moved to CPU in `track.py` (lines 195-210):
```python
# Move detector to CPU to free GPU memory for HMR2 and PHALP models
self.detector = self.detector.cpu()
if hasattr(self.detector, 'model'):
    self.detector.model = self.detector.model.cpu()
```

This prevents the ViTDet detection model from consuming GPU memory, allowing HMR2 and PHALP to use the GPU for body estimation.

## Next Steps

1. Test video upload via frontend at http://localhost:5173/
2. Monitor pose service logs for any crashes
3. Check ngrok tunnel for external access
4. Verify mesh data is being stored in MongoDB

## Logs Location

Pose service logs: `/tmp/pose-service-logs/pose-service-*.log`
