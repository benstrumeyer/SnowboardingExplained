# Docker Testing Guide

## Overview

This guide walks through testing the Docker-based local development environment for the Snowboarding Explained project. The setup includes 5 containerized services orchestrated by docker-compose.

## Prerequisites

- Docker Desktop running
- nvidia-docker runtime installed
- All Docker images built (see `DOCKER_QUICK_START.md`)

## Phase 1: Service Startup & Health Checks

### 1.1 Start All Services

```bash
cd SnowboardingExplained
docker-compose up -d
```

Expected output:
```
[+] Running 5/5
 ✔ Container snowboard-redis      Started
 ✔ Container snowboard-mongodb    Started
 ✔ Container snowboard-pose-service  Started
 ✔ Container snowboard-backend-api   Started
 ✔ Container snowboard-frontend      Started
```

### 1.2 Verify Service Status

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
snowboard-pose-service  Up (healthy)        0.0.0.0:5000->5000/tcp
snowboard-backend-api   Up (healthy)        0.0.0.0:3001->3001/tcp
snowboard-frontend      Up                  0.0.0.0:5173->5173/tcp
snowboard-redis         Up (healthy)        0.0.0.0:6379->6379/tcp
snowboard-mongodb       Up (healthy)        0.0.0.0:27017->27017/tcp
```

### 1.3 Test Health Endpoints

```bash
# Backend API health
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2025-12-28T15:30:00Z","uptime":45.2,"environment":"development"}

# Pose Service health
curl http://localhost:5000/health

# Expected response:
# {"status":"ok","message":"Pose service is running"}
```

### 1.4 Check GPU Access

```bash
# Verify GPU is accessible in pose-service
docker-compose exec pose-service nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.xx.xx    Driver Version: 535.xx.xx   CUDA Version: 12.1     |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | No   Name        Off  | 00000000:01:00.0 Off |                  N/A |
# |  0%   NVIDIA A100  Off |   00000000:01:00.0 Off |                  0 |
# +-------------------------------+----------------------+----------------------+
```

## Phase 2: Service Communication

### 2.1 Test Backend to Pose Service Communication

```bash
# From backend container, test pose service connectivity
docker-compose exec backend-api curl http://pose-service:5000/health

# Expected response:
# {"status":"ok","message":"Pose service is running"}
```

### 2.2 Test Backend to Database Communication

```bash
# Test MongoDB connection
docker-compose exec backend-api node -e "
const { MongoClient } = require('mongodb');
const uri = 'mongodb://admin:password@mongodb:27017/snowboard?authSource=admin';
MongoClient.connect(uri, async (err, client) => {
  if (err) console.error('MongoDB Error:', err);
  else {
    console.log('MongoDB Connected!');
    const db = client.db('snowboard');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    client.close();
  }
});
"

# Expected output:
# MongoDB Connected!
# Collections: [...]
```

### 2.3 Test Backend to Redis Communication

```bash
# Test Redis connection
docker-compose exec backend-api node -e "
const redis = require('redis');
const client = redis.createClient({ url: 'redis://redis:6379' });
client.on('error', (err) => console.error('Redis Error:', err));
client.on('connect', () => {
  console.log('Redis Connected!');
  client.quit();
});
"

# Expected output:
# Redis Connected!
```

## Phase 3: Frontend Access

### 3.1 Access Frontend UI

Open browser and navigate to: http://localhost:5173

Expected:
- React app loads
- No console errors
- Can see the main interface

### 3.2 Check Frontend Logs

```bash
docker-compose logs frontend | tail -20

# Expected output:
# VITE v4.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

## Phase 4: Video Upload Pipeline

### 4.1 Prepare Test Video

Create a small test video (10-30 seconds) or use an existing one:
- Format: MP4, WebM, or MOV
- Resolution: 1080p or lower
- Duration: 10-30 seconds

### 4.2 Upload via Frontend

1. Open http://localhost:5173
2. Click "Upload Video"
3. Select test video
4. Click "Upload"
5. Monitor logs: `docker-compose logs -f pose-service`

### 4.3 Monitor Pose Service Processing

```bash
# Watch pose service logs in real-time
docker-compose logs -f pose-service

# Expected output:
# Loading models...
# ViTDet detector loaded
# PHALP initialized
# HMR2 loaded
# Processing frame 1/300...
# Processing frame 2/300...
# ...
# Processing complete
```

### 4.4 Verify Output Storage

```bash
# Check if mesh data was stored in MongoDB
docker-compose exec mongodb mongosh --eval "
db.auth('admin', 'password');
db.snowboard.meshData.countDocuments()
"

# Expected output:
# 300 (or number of frames processed)
```

### 4.5 Check Redis Cache

```bash
# View Redis cache statistics
docker-compose exec redis redis-cli INFO stats

# Expected output:
# total_commands_processed: xxx
# total_connections_received: xxx
```

## Phase 5: Performance Monitoring

### 5.1 Monitor GPU Usage During Processing

```bash
# In one terminal, watch GPU usage
docker-compose exec pose-service watch -n 1 nvidia-smi

# In another terminal, upload a video
# Watch GPU memory usage increase during processing
```

### 5.2 Monitor Container Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Expected output:
# CONTAINER                   CPU %     MEM USAGE / LIMIT
# snowboard-pose-service      45%       4.2GB / 8GB
# snowboard-backend-api       2%        150MB / 2GB
# snowboard-frontend          1%        80MB / 1GB
# snowboard-redis             0.5%      50MB / 1GB
# snowboard-mongodb           1%        200MB / 2GB
```

### 5.3 Measure Processing Time

```bash
# Check logs for timing information
docker-compose logs pose-service | grep -i "time\|duration\|processing"

# Expected output:
# Model loading time: 45.2s
# Frame processing time: 0.5s per frame
# Total processing time: 150s
```

## Phase 6: Code Hot Reload Testing

### 6.1 Test Python Code Changes

1. Edit `backend/pose-service/flask_wrapper_minimal_safe.py`
2. Add a log statement or modify a function
3. Restart the service: `docker-compose restart pose-service`
4. Verify changes are reflected

### 6.2 Test Node.js Code Changes

1. Edit `backend/src/server.ts`
2. Add a new endpoint or modify existing one
3. Rebuild: `docker-compose build backend-api`
4. Restart: `docker-compose restart backend-api`
5. Test the endpoint

### 6.3 Test React Code Changes

1. Edit `backend/web/src/App.tsx`
2. Make a visible UI change
3. Save the file
4. Browser should hot-reload automatically
5. Verify changes appear

## Phase 7: Error Handling & Recovery

### 7.1 Test Service Restart

```bash
# Restart individual service
docker-compose restart pose-service

# Verify it comes back up
docker-compose ps | grep pose-service

# Expected: Status should be "Up (healthy)"
```

### 7.2 Test All Services Restart

```bash
# Stop all services
docker-compose stop

# Verify all stopped
docker-compose ps

# Start all services
docker-compose up -d

# Verify all running
docker-compose ps
```

### 7.3 Test Data Persistence

```bash
# Upload a video and process it
# Stop all services
docker-compose stop

# Start services again
docker-compose up -d

# Check if mesh data is still in MongoDB
docker-compose exec mongodb mongosh --eval "
db.auth('admin', 'password');
db.snowboard.meshData.countDocuments()
"

# Expected: Same count as before
```

## Phase 8: Troubleshooting

### Issue: GPU Not Detected

```bash
# Check nvidia-docker installation
docker run --rm --gpus all nvidia/cuda:12.1.1-runtime-ubuntu22.04 nvidia-smi

# If fails, install nvidia-docker:
# https://github.com/NVIDIA/nvidia-docker
```

### Issue: Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process or change port in docker-compose.yml
```

### Issue: Out of Memory

```bash
# Check memory usage
docker stats

# Reduce batch size in pose service or add memory limits
```

### Issue: Models Not Loading

```bash
# Check pose service logs
docker-compose logs pose-service | grep -i "error\|failed"

# Verify model files exist
docker-compose exec pose-service ls -la /app/models/
```

### Issue: Slow Startup

```bash
# First build takes 10-15 minutes
# Subsequent starts are faster
# Check progress:
docker-compose logs pose-service | grep -i "loading\|initialized"
```

## Phase 9: Comparison with WSL

### Performance Metrics

| Metric | WSL | Docker |
|--------|-----|--------|
| Startup Time | 2-3 min | 30-60 sec |
| GPU Stability | ❌ Crashes | ✅ Stable |
| Memory Usage | Variable | Controlled |
| Service Management | 5 terminals | 1 command |
| Logging | Scattered | Centralized |

### GPU Stability Test

1. Upload 5 videos in sequence
2. Monitor for crashes
3. Expected: All complete successfully

## Cleanup

### Stop Services

```bash
# Stop all services (keep volumes)
docker-compose stop

# Stop and remove containers (keep volumes)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

### Clean Up Docker Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup
docker system prune -a
```

## Next Steps

1. ✅ Services running and healthy
2. ✅ Video upload pipeline working
3. ✅ GPU processing stable
4. ✅ Data persisting correctly
5. ⏳ Performance optimization (optional)
6. ⏳ Add monitoring dashboard (optional)
7. ⏳ Production deployment (future)

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f [service]`
2. Review `DOCKER_QUICK_START.md` for common commands
3. Check `DOCKER_BEGINNER_GUIDE.md` for Docker concepts
4. Review service health: `docker-compose ps`

