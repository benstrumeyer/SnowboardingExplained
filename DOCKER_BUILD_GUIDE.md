# Docker BuildKit Build Guide

## Quick Start

### Enable BuildKit (One-time setup)

Add to your `.bashrc` or `.zshrc`:
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Build All Services

From the project root:

```bash
# Build base images (one-time, ~15 minutes for base-python-pose)
docker build -t base-node:latest ./backend/docker/base-node
docker build -t base-python:latest ./backend/docker/base-python
docker build -t base-python-pose:latest ./backend/docker/base-python-pose

# Build all services
docker-compose build

# Start all services
docker-compose up
```

## Service Architecture

### Base Images

These are built once and cached. Subsequent builds reuse these layers.

- **base-node:latest** - Node.js 18 Alpine with build tools
  - Build time: ~30 seconds
  - Size: ~200MB
  - Used by: backend-api, frontend

- **base-python:latest** - Python 3.9 Debian with graphics libraries
  - Build time: ~1 minute
  - Size: ~400MB
  - Used by: (reserved for future services)

- **base-python-pose:latest** - Python 3.9 with all ML dependencies
  - Build time: ~15 minutes (first time only)
  - Size: ~8-10GB
  - Used by: pose-service
  - Dependencies: PyTorch, PHALP, Detectron2, pytorch3d, 4D-Humans

### Service Images

Built on top of base images. Code changes rebuild in seconds.

- **snowboarding-pose-service** - Flask pose estimation server
  - Port: 5000
  - GPU: Required (nvidia-docker)
  - Build time: ~30 seconds (code change)
  - Build time: ~5 minutes (dependency change)

- **snowboarding-backend-api** - Express.js API server
  - Port: 3001
  - Build time: ~10 seconds (code change)
  - Build time: ~2 minutes (dependency change)

- **snowboarding-frontend** - Vite React dev server
  - Port: 5173
  - Build time: ~10 seconds (code change)
  - Build time: ~2 minutes (dependency change)

### Infrastructure Services

Pre-built images, no custom build needed.

- **mongodb:7.0** - Document database
  - Port: 27017
  - Credentials: admin/password

- **mongo-express:latest** - MongoDB web UI
  - Port: 8081
  - Credentials: admin/password

## Build Performance

### First Build (All Services)
```
base-node:latest           ~30s
base-python:latest         ~1m
base-python-pose:latest    ~15m
pose-service               ~5m (depends on base-python-pose)
backend-api                ~2m
frontend                   ~2m
─────────────────────────────
Total:                     ~25 minutes
```

### Subsequent Builds (Code Change)
```
pose-service               ~30s (cached base image)
backend-api                ~10s (cached base image)
frontend                   ~10s (cached base image)
─────────────────────────────
Total:                     ~50 seconds
```

### Dependency Change
```
base-python-pose:latest    ~15m (rebuild all ML deps)
pose-service               ~5m (rebuild on new base)
─────────────────────────────
Total:                     ~20 minutes
```

## Common Commands

### Build Specific Service
```bash
# Rebuild just pose-service
docker-compose build pose-service

# Rebuild just backend-api
docker-compose build backend-api

# Rebuild just frontend
docker-compose build frontend
```

### View Build Cache
```bash
# Show build cache usage
docker buildx du

# Prune unused cache
docker buildx prune
```

### Clear All Cache (if corrupted)
```bash
# WARNING: This removes all Docker images and cache
docker buildx prune -a
docker system prune -a
```

### View Images
```bash
# List all images
docker images

# List base images
docker images | grep base-

# List service images
docker images | grep snowboarding
```

## Running Services

### Start All Services
```bash
docker-compose up
```

### Start Specific Service
```bash
docker-compose up pose-service
docker-compose up backend-api
docker-compose up frontend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f pose-service
docker-compose logs -f backend-api
docker-compose logs -f frontend

# Last 50 lines
docker-compose logs --tail=50 pose-service
```

### Stop Services
```bash
# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### Build Fails with "base-python-pose not found"
Make sure base images are built first:
```bash
docker build -t base-node:latest ./backend/docker/base-node
docker build -t base-python:latest ./backend/docker/base-python
docker build -t base-python-pose:latest ./backend/docker/base-python-pose
```

### GPU Not Available
Ensure nvidia-docker is installed:
```bash
# Check if nvidia-docker is available
which nvidia-docker

# If not installed, install it:
# Ubuntu: sudo apt-get install nvidia-docker2
# WSL: Follow NVIDIA WSL2 setup guide
```

### Out of Disk Space
Docker builds can use significant space. Check available space:
```bash
df -h

# Clean up unused images and cache
docker system prune -a
```

### Port Already in Use
If a port is already in use, modify docker-compose.yml:
```yaml
services:
  pose-service:
    ports:
      - "5001:5000"  # Changed from 5000:5000
```

### Service Won't Start
Check logs:
```bash
docker-compose logs pose-service
docker-compose logs backend-api
docker-compose logs frontend
```

## Development Workflow

### Making Code Changes

1. Edit code in your editor
2. Code is automatically hot-reloaded (volumes mounted)
3. For Python changes, restart the service:
   ```bash
   docker-compose restart pose-service
   ```
4. For Node.js changes, usually auto-reload (check logs)

### Rebuilding After Dependency Change

1. Update `requirements.txt` or `package.json`
2. Rebuild the service:
   ```bash
   docker-compose build pose-service
   docker-compose up pose-service
   ```

### Testing Code Changes

1. Make code change
2. Rebuild service (< 30 seconds):
   ```bash
   docker-compose build pose-service
   ```
3. Verify build logs show CACHED for dependency layers
4. Restart service:
   ```bash
   docker-compose restart pose-service
   ```

## Performance Tips

### Enable BuildKit
BuildKit is faster and more efficient than the default builder:
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### Use .dockerignore
All services have .dockerignore files to prevent cache invalidation:
- `backend/.dockerignore`
- `backend/pose-service/.dockerignore`
- `backend/web/.dockerignore`

These exclude:
- `node_modules/`, `__pycache__/`
- `.git/`, `.env`, `*.log`
- `data/`, `*.pkl`

### Monitor Build Cache
```bash
# See what's in the cache
docker buildx du

# Prune old cache
docker buildx prune
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Application Layer (seconds to rebuild)                       │
│ - Pose service code (app.py, flask_wrapper_minimal_safe.py) │
│ - Backend API code (src/, api/)                              │
│ - Frontend code (web/src/)                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ depends on
┌─────────────────────────────────────────────────────────────┐
│ Service Base Images (minutes to rebuild, cached)             │
│ - base-python-pose: ML deps (4D-Humans, PHALP, etc.)        │
│ - base-node: Node.js, npm, build tools                       │
│ - base-python: Python, pip, system libs                      │
└─────────────────────────────────────────────────────────────┘
                            ↓ depends on
┌─────────────────────────────────────────────────────────────┐
│ System Base Images (rarely rebuilt)                          │
│ - nvidia/cuda:12.1.1-runtime-ubuntu20.04                     │
│ - node:18-alpine                                             │
│ - python:3.9-slim-bullseye                                   │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

1. Build base images (if not already done)
2. Run `docker-compose build` to build all services
3. Run `docker-compose up` to start all services
4. Verify services are healthy:
   - Pose service: http://localhost:5000/health
   - Backend API: http://localhost:3001/health
   - Frontend: http://localhost:5173
   - MongoDB: http://localhost:27017
   - Mongo Express: http://localhost:8081

## References

- Docker BuildKit: https://docs.docker.com/build/buildkit/
- Docker Compose: https://docs.docker.com/compose/
- Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
