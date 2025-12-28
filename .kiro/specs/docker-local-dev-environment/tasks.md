# Docker Local Development Environment - Implementation Tasks

## Phase 1: Setup & Prerequisites

### Task 1.1: Verify Docker & nvidia-docker Installation
- [ ] Verify Docker Desktop is installed and running
- [ ] Verify nvidia-docker runtime is installed
- [ ] Test GPU access: `docker run --rm --gpus all nvidia/cuda:12.1.1-runtime-ubuntu22.04 nvidia-smi`
- [ ] Document any installation issues

**Acceptance**: nvidia-smi runs successfully inside container and shows GPU

### Task 1.2: Create Directory Structure
- [ ] Create `backend/pose-service/` directory if not exists
- [ ] Create `backend/web/` directory if not exists
- [ ] Verify all source code directories exist
- [ ] Create `.dockerignore` files to exclude unnecessary files

**Acceptance**: All directories exist and are properly organized

### Task 1.3: Prepare Environment Files
- [ ] Review existing `.env.docker` file
- [ ] Create `.env` file for docker-compose with default values
- [ ] Document all environment variables
- [ ] Add `.env` to `.gitignore` (if not already)

**Acceptance**: `.env` file exists with all required variables

## Phase 2: Create Dockerfiles

### Task 2.1: Create Pose Service Dockerfile
- [ ] Create `backend/pose-service/Dockerfile`
- [ ] Use nvidia/cuda:12.1.1-runtime-ubuntu22.04 as base
- [ ] Install Python 3.10 and system dependencies
- [ ] Copy requirements.txt and install Python packages
- [ ] Add health check endpoint
- [ ] Test build: `docker build -t snowboard-pose-service backend/pose-service/`

**Acceptance**: 
- Dockerfile builds without errors
- Image size is reasonable (< 5GB)
- Health check is defined

### Task 2.2: Create Backend API Dockerfile
- [ ] Create `backend/Dockerfile`
- [ ] Use node:18-alpine as base
- [ ] Copy package.json and install dependencies
- [ ] Copy source code
- [ ] Add health check endpoint
- [ ] Test build: `docker build -t snowboard-backend-api -f backend/Dockerfile .`

**Acceptance**:
- Dockerfile builds without errors
- Image size is small (< 500MB)
- Health check is defined

### Task 2.3: Create Frontend Dev Dockerfile
- [ ] Create `backend/web/Dockerfile.dev`
- [ ] Use node:18-alpine as base
- [ ] Configure Vite for dev server
- [ ] Expose port 5173
- [ ] Test build: `docker build -t snowboard-frontend -f backend/web/Dockerfile.dev backend/web/`

**Acceptance**:
- Dockerfile builds without errors
- Dev server can be accessed on port 5173
- Hot reload works

### Task 2.4: Create .dockerignore Files
- [ ] Create `backend/pose-service/.dockerignore`
- [ ] Create `backend/.dockerignore`
- [ ] Create `backend/web/.dockerignore`
- [ ] Exclude: node_modules, .git, .env, uploads, etc.

**Acceptance**: Build context is smaller, builds are faster

## Phase 3: Create docker-compose.yml

### Task 3.1: Create docker-compose.yml
- [ ] Create `docker-compose.yml` in project root
- [ ] Define all 5 services (pose, backend, frontend, redis, mongodb)
- [ ] Configure volumes for code mounts
- [ ] Configure environment variables
- [ ] Add health checks
- [ ] Add restart policies

**Acceptance**:
- File is valid YAML
- All services are defined
- Can be validated: `docker-compose config`

### Task 3.2: Configure GPU Support
- [ ] Add nvidia runtime configuration to pose-service
- [ ] Set CUDA_VISIBLE_DEVICES environment variable
- [ ] Test GPU access in container
- [ ] Document GPU configuration

**Acceptance**:
- `docker-compose exec pose-service nvidia-smi` shows GPU
- CUDA is available in container

### Task 3.3: Configure Networking
- [ ] Define custom bridge network
- [ ] Configure service discovery (DNS)
- [ ] Test inter-service communication
- [ ] Document network topology

**Acceptance**:
- Services can communicate by name
- Network is isolated from host

### Task 3.4: Configure Volumes
- [ ] Define named volumes for persistence
- [ ] Configure bind mounts for code
- [ ] Configure bind mounts for uploads
- [ ] Test volume mounts

**Acceptance**:
- Code changes are reflected in containers
- Data persists across restarts
- Uploads are accessible from host

## Phase 4: Update Service Code

### Task 4.1: Update Pose Service Flask Wrapper
- [ ] Add `/health` endpoint to flask_wrapper_minimal_safe.py
- [ ] Ensure proper logging to stdout
- [ ] Test Flask wrapper in container
- [ ] Document any configuration changes

**Acceptance**:
- Flask wrapper starts successfully
- Health endpoint returns 200 OK
- Logs are visible in docker-compose logs

### Task 4.2: Update Backend API
- [ ] Add `/health` endpoint to backend API
- [ ] Update POSE_SERVICE_URL to use docker-compose DNS
- [ ] Update REDIS_URL to use docker-compose DNS
- [ ] Update MONGODB_URI to use docker-compose DNS
- [ ] Test backend in container

**Acceptance**:
- Backend starts successfully
- Health endpoint returns 200 OK
- Can connect to Redis and MongoDB

### Task 4.3: Update Frontend Dev Server
- [ ] Configure Vite to accept connections from 0.0.0.0
- [ ] Update API_URL to point to backend
- [ ] Test frontend in container
- [ ] Verify hot reload works

**Acceptance**:
- Frontend dev server starts
- Can access from host on port 5173
- Hot reload works for code changes

### Task 4.4: Update Environment Configuration
- [ ] Update `.env.docker` with docker-compose values
- [ ] Create `.env.example` for documentation
- [ ] Document all environment variables
- [ ] Add comments for each variable

**Acceptance**:
- All services can read environment variables
- Configuration is documented
- Example file exists

## Phase 5: Testing & Validation

### Task 5.1: Test Individual Service Startup
- [ ] Start pose-service: `docker-compose up pose-service`
- [ ] Verify models load successfully
- [ ] Check GPU utilization
- [ ] Verify health check passes
- [ ] Stop and verify clean shutdown

**Acceptance**:
- Service starts without errors
- Models load within 60 seconds
- Health check passes
- No hanging processes

### Task 5.2: Test All Services Together
- [ ] Start all services: `docker-compose up -d`
- [ ] Wait for all health checks to pass
- [ ] Verify all services are running: `docker-compose ps`
- [ ] Check logs for errors: `docker-compose logs`
- [ ] Test inter-service communication

**Acceptance**:
- All services start successfully
- All health checks pass
- No errors in logs
- Services can communicate

### Task 5.3: Test Video Upload Pipeline
- [ ] Upload a test video via frontend
- [ ] Monitor pose-service logs
- [ ] Verify video is processed
- [ ] Check output in database
- [ ] Verify no crashes or OOM errors

**Acceptance**:
- Video uploads successfully
- Pose service processes without crashing
- Results are stored in database
- No GPU OOM errors

### Task 5.4: Test Code Hot Reload
- [ ] Modify Python code in pose-service
- [ ] Verify changes are reflected (may need restart)
- [ ] Modify TypeScript in backend
- [ ] Verify changes are reflected
- [ ] Modify React code in frontend
- [ ] Verify hot reload works

**Acceptance**:
- Code changes are reflected without rebuilding
- Development workflow is smooth
- No need to restart containers for code changes

### Task 5.5: Test Service Restart
- [ ] Restart individual services
- [ ] Verify other services continue running
- [ ] Restart all services
- [ ] Verify clean startup
- [ ] Test restart after crash

**Acceptance**:
- Services restart cleanly
- No orphaned processes
- Data persists across restarts

### Task 5.6: Test Logging
- [ ] View all logs: `docker-compose logs`
- [ ] Follow logs: `docker-compose logs -f`
- [ ] View specific service logs
- [ ] Verify timestamps are present
- [ ] Verify log levels are correct

**Acceptance**:
- Logs are visible and useful
- Timestamps are present
- Can filter by service
- Log levels are appropriate

### Task 5.7: Performance Comparison
- [ ] Measure pose-service startup time
- [ ] Measure video processing time
- [ ] Compare with WSL approach
- [ ] Monitor GPU utilization
- [ ] Monitor memory usage
- [ ] Document findings

**Acceptance**:
- Performance is comparable or better than WSL
- GPU is properly utilized
- No memory leaks
- System is stable

## Phase 6: Documentation & Cleanup

### Task 6.1: Create Quick Start Guide
- [ ] Document how to start services
- [ ] Document how to stop services
- [ ] Document how to view logs
- [ ] Document how to restart services
- [ ] Document common troubleshooting steps

**Acceptance**: Guide is clear and complete

### Task 6.2: Create Troubleshooting Guide
- [ ] Document common issues
- [ ] Document solutions for each issue
- [ ] Document how to debug
- [ ] Document how to get help

**Acceptance**: Guide covers common scenarios

### Task 6.3: Update Main README
- [ ] Add Docker setup instructions
- [ ] Add quick start commands
- [ ] Link to detailed guides
- [ ] Remove WSL-specific instructions (or mark as deprecated)

**Acceptance**: README is updated and clear

### Task 6.4: Clean Up WSL Setup
- [ ] Document WSL setup for reference (archive)
- [ ] Remove WSL-specific scripts (or mark as deprecated)
- [ ] Update any remaining WSL references
- [ ] Verify no broken links

**Acceptance**: WSL setup is archived, no broken references

### Task 6.5: Create Development Workflow Document
- [ ] Document typical development workflow
- [ ] Document how to add new services
- [ ] Document how to modify services
- [ ] Document best practices

**Acceptance**: Document is clear and helpful

## Phase 7: Optional Enhancements

### Task 7.1: Add Monitoring Dashboard (Optional)
- [ ] Consider adding Portainer for container management
- [ ] Consider adding Prometheus for metrics
- [ ] Consider adding Grafana for visualization
- [ ] Document setup and usage

**Acceptance**: Dashboard is accessible and useful

### Task 7.2: Add Development Tools (Optional)
- [ ] Consider adding pgAdmin for MongoDB
- [ ] Consider adding Redis Commander
- [ ] Consider adding API documentation (Swagger)
- [ ] Document access and usage

**Acceptance**: Tools are accessible and useful

### Task 7.3: Add CI/CD Integration (Optional)
- [ ] Consider GitHub Actions for automated testing
- [ ] Consider automated image building
- [ ] Consider automated deployment
- [ ] Document setup and usage

**Acceptance**: CI/CD pipeline is working

## Success Criteria

- [ ] All services start successfully with `docker-compose up`
- [ ] Pose service processes video without crashing
- [ ] GPU is properly utilized and controlled
- [ ] Logs are visible and useful for debugging
- [ ] Services can be restarted individually
- [ ] Code changes are reflected without rebuilding
- [ ] Development workflow is faster than WSL approach
- [ ] Documentation is complete and clear
- [ ] No WSL-specific code remains in active use

## Timeline Estimate

- Phase 1: 30 minutes
- Phase 2: 1 hour
- Phase 3: 1 hour
- Phase 4: 1.5 hours
- Phase 5: 2 hours
- Phase 6: 1 hour
- Phase 7: 2 hours (optional)

**Total**: 8.5 hours (6.5 hours without optional enhancements)

## Notes

- Start with Phase 1-3 to get infrastructure in place
- Phase 4-5 are the critical testing phases
- Phase 6 ensures the setup is maintainable
- Phase 7 is optional but recommended for better DX
- Each phase should be completed before moving to the next
- Document any issues encountered for future reference
