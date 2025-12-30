# Docker Build Instructions

## Current Status

Base images are currently building in the background:
- ✅ base-node:latest - COMPLETE
- ✅ base-python:latest - COMPLETE  
- ⏳ base-python-pose:latest - IN PROGRESS (~15 minutes)

Service builds will start once base images are ready.

## What to Do Next

### In a NEW Terminal Window:

1. **Wait for base-python-pose to finish building** (check every minute):
```bash
docker images | grep base-
```

You should see all three base images listed when complete.

2. **Once base images are done, build all services**:
```bash
docker-compose build
```

This will build:
- pose-service (depends on base-python-pose)
- backend-api (depends on base-node)
- frontend (depends on base-node)

3. **Start all services**:
```bash
docker-compose up
```

4. **Verify services are running** (in another terminal):
```bash
# Check all containers
docker-compose ps

# Check specific service logs
docker-compose logs pose-service
docker-compose logs backend-api
docker-compose logs frontend
```

5. **Verify services are healthy**:
- Pose service: `curl http://localhost:5000/health`
- Backend API: `curl http://localhost:3001/health`
- Frontend: Open http://localhost:5173 in browser
- MongoDB: `curl http://localhost:27017`
- Mongo Express: Open http://localhost:8081 in browser

## Expected Build Times

- base-python-pose: ~15 minutes (first time only)
- pose-service: ~5 minutes (first time), ~30 seconds (code changes)
- backend-api: ~2 minutes (first time), ~10 seconds (code changes)
- frontend: ~2 minutes (first time), ~10 seconds (code changes)

## Troubleshooting

If base-python-pose build fails:
```bash
# Check the build logs
docker build -t base-python-pose:latest ./backend/docker/base-python-pose

# If it fails, check for:
# - Disk space: df -h
# - Docker daemon: docker ps
# - Network issues: ping docker.io
```

If services won't start:
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs pose-service

# Restart services
docker-compose restart
```

## Files Created

- `docker-compose.yml` - Root-level orchestration (all services)
- `DOCKER_BUILD_GUIDE.md` - Comprehensive build guide
- `BUILD_INSTRUCTIONS.md` - This file

## Next Tasks (After Services Start)

- [ ] Task 14: Verify base images built successfully
- [ ] Task 15: Verify all services built successfully
- [ ] Task 16: Start all services with docker-compose up
- [ ] Task 17: Verify pose service is working
- [ ] Task 18: Verify backend API is working
- [ ] Task 19: Verify frontend is working
- [ ] Task 20: Test code change rebuild (< 30 seconds)
- [ ] Task 21: Document BuildKit setup and caching strategy
