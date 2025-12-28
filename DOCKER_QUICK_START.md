# Docker Local Development Environment - Quick Start

## Prerequisites

- Docker Desktop installed and running
- nvidia-docker runtime installed (for GPU support)
- All source code in place

## Quick Start

### 1. Start All Services

```bash
cd SnowboardingExplained
docker-compose up -d
```

This will:
- Build all Docker images (first time only, takes ~10-15 minutes)
- Start all 5 services: pose-service, backend-api, frontend, redis, mongodb
- Create a shared network for service communication
- Mount code volumes for hot reload

### 2. Check Service Status

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

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f pose-service
docker-compose logs -f backend-api
docker-compose logs -f frontend
```

### 4. Access Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Pose Service**: http://localhost:5000
- **MongoDB**: mongodb://admin:password@localhost:27017
- **Redis**: redis://localhost:6379

### 5. Test Health Endpoints

```bash
# Backend API health
curl http://localhost:3001/health

# Pose Service health
curl http://localhost:5000/health
curl http://localhost:5000/api/pose/health
```

### 6. Stop Services

```bash
# Stop all services (keep volumes)
docker-compose stop

# Stop and remove containers (keep volumes)
docker-compose down

# Stop and remove everything including volumes
docker-compose down -v
```

### 7. Restart Individual Services

```bash
# Restart pose service
docker-compose restart pose-service

# Restart backend
docker-compose restart backend-api

# Restart frontend
docker-compose restart frontend
```

### 8. Execute Commands in Containers

```bash
# Run bash in pose service
docker-compose exec pose-service bash

# Check GPU in pose service
docker-compose exec pose-service nvidia-smi

# Run Python command
docker-compose exec pose-service python3 -c "import torch; print(torch.cuda.is_available())"

# Run bash in backend
docker-compose exec backend-api bash

# Check Node version
docker-compose exec backend-api node --version
```

## Troubleshooting

### GPU Not Detected

```bash
# Check if nvidia-docker is installed
docker run --rm --gpus all nvidia/cuda:12.1.1-runtime-ubuntu22.04 nvidia-smi

# If not installed, install nvidia-docker:
# https://github.com/NVIDIA/nvidia-docker
```

### Port Already in Use

Edit `docker-compose.yml` and change the port mappings:
```yaml
ports:
  - "5000:5000"  # Change first number to different port
```

### Models Not Loading

Check pose service logs:
```bash
docker-compose logs pose-service | grep -i "error\|failed"
```

### Out of Memory

Reduce batch size or add memory limits in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 8G
```

### Slow Startup

First build takes time. Subsequent starts are faster. Check progress:
```bash
docker-compose logs pose-service | grep -i "loading\|initialized"
```

## Development Workflow

### Making Code Changes

1. Edit code in your IDE
2. Changes are automatically reflected in containers (volumes mounted)
3. For Python: restart the service if needed
4. For Node.js: usually hot-reloads automatically
5. For React: hot-reload works automatically

### Rebuilding Images

If you change Dockerfile or dependencies:
```bash
# Rebuild specific service
docker-compose build pose-service

# Rebuild all services
docker-compose build

# Rebuild and restart
docker-compose up -d --build
```

### Viewing Container Filesystem

```bash
# List files in pose service
docker-compose exec pose-service ls -la /app

# Copy file from container
docker cp snowboard-pose-service:/app/file.txt ./file.txt

# Copy file to container
docker cp ./file.txt snowboard-pose-service:/app/file.txt
```

## Performance Tips

1. **GPU Memory**: Monitor with `docker-compose exec pose-service nvidia-smi`
2. **Disk Space**: Docker images can be large. Clean up with `docker system prune`
3. **Network**: Services communicate via Docker network (faster than localhost)
4. **Volumes**: Bind mounts are slower than named volumes on Windows. Consider using named volumes for large datasets.

## Next Steps

1. Test video upload: POST to `/api/pose/video` with video file
2. Monitor logs during processing
3. Check mesh data in MongoDB
4. View results in frontend

## Environment Variables

Edit `.env` file to customize:
- `CUDA_VISIBLE_DEVICES`: Which GPU to use (0, 1, etc.)
- `NODE_ENV`: development or production
- `LOG_LEVEL`: debug, info, warn, error
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string

## Useful Commands

```bash
# Clean up all Docker resources
docker system prune -a

# View Docker disk usage
docker system df

# Inspect service configuration
docker-compose config

# Validate docker-compose.yml
docker-compose config --quiet

# View environment variables in container
docker-compose exec pose-service env | grep CUDA

# Monitor resource usage
docker stats

# View network details
docker network inspect snowboard-network
```

## Production Considerations

This setup is for **local development only**. For production:
- Use environment-specific configs
- Add authentication to MongoDB and Redis
- Use secrets management (not .env files)
- Add persistent volume backups
- Configure resource limits
- Set up monitoring and alerting
- Use a reverse proxy (nginx)
- Enable HTTPS
- Add rate limiting
