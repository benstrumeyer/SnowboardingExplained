# Implementation Plan: Docker BuildKit & Build Optimization

## Overview

This implementation plan breaks down the Docker BuildKit optimization into discrete, incremental tasks. The approach is to build base images first, then refactor service Dockerfiles to use multi-stage builds with proper dependency caching. No testing afterwards - just get the containers running.

## Tasks

- [ ] 1. Enable Docker BuildKit and Configure Environment
  - Create or update `.bashrc` / `.zshrc` to export `DOCKER_BUILDKIT=1` and `COMPOSE_DOCKER_CLI_BUILD=1`
  - Verify BuildKit is enabled by running `docker buildx version`
  - Document BuildKit setup in project README
  - _Requirements: 1.1, 1.2_

- [ ] 2. Create Base Image Directory Structure
  - Create `backend/docker/base-node/` directory with Dockerfile and .dockerignore
  - Create `backend/docker/base-python/` directory with Dockerfile and .dockerignore
  - Create `backend/docker/base-python-pose/` directory with Dockerfile and .dockerignore
  - Verify directory structure matches design
  - _Requirements: 2.1, 2.2_

- [ ] 3. Implement base-node Dockerfile
  - Write Dockerfile with Node.js 18, npm, build-essential, python3
  - Create .dockerignore with mandatory ignored paths
  - Verify image builds successfully
  - Verify Node.js and npm are available in final image
  - _Requirements: 2.1, 3.1_

- [ ] 4. Implement base-python Dockerfile
  - Write Dockerfile with Python 3.10, pip, system libraries (graphics, math)
  - Create .dockerignore with mandatory ignored paths
  - Verify image builds successfully
  - Verify Python 3.10 and pip are available in final image
  - _Requirements: 2.1, 3.1_

- [ ] 5. Implement base-python-pose Dockerfile (Critical)
  - Write Dockerfile following 4D-Humans, PHALP, ViTDet, and Detectron2 installation recommendations
  - Stage 1: Install system dependencies (graphics, math, media libraries)
  - Stage 2: Install Python 3.10, pip, build tools
  - Stage 3: Install ML dependencies in order:
    - joblib (first, before PHALP)
    - All requirements.txt dependencies
    - pytorch3d 0.7.0
    - 4D-Humans (from local copy, following README.md)
    - Detectron2 from source (includes ViTDet)
  - Stage 4: Runtime image with all dependencies
  - Create .dockerignore with mandatory ignored paths
  - Verify image builds successfully (may take 15+ minutes)
  - Verify all ML dependencies are importable
  - _Requirements: 2.1, 2.2, 2.3, 3.1_

- [ ] 6. Create .dockerignore files for all services
  - Create `backend/pose-service/.dockerignore` with mandatory ignored paths
  - Create `backend/.dockerignore` (for backend API) with mandatory ignored paths
  - Create `backend/web/.dockerignore` (for frontend) with mandatory ignored paths
  - Verify each file excludes: node_modules, __pycache__, .git, .env, *.log, data/, *.pkl
  - _Requirements: 7.1, 7.2_

- [ ] 7. Refactor pose-service Dockerfile to multi-stage build
  - Rewrite Dockerfile with three stages: `deps`, `build`, `runtime`
  - Stage 1 (deps): FROM base-python-pose, copy requirements.txt, run pip install
  - Stage 2 (build): FROM deps, copy pose service code, verify installations
  - Stage 3 (runtime): FROM base-python-pose, copy SMPL model, copy pose service code
  - Remove old dependency installation code (now in base image)
  - Verify Dockerfile builds successfully
  - Verify runtime image is minimal (no build tools)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Refactor backend API Dockerfile to multi-stage build
  - Rewrite Dockerfile with three stages: `deps`, `build`, `runtime`
  - Stage 1 (deps): FROM base-node, copy package.json/package-lock.json, run npm ci
  - Stage 2 (build): FROM deps, copy src/ and api/, run npm run build (if applicable)
  - Stage 3 (runtime): FROM base-node, copy built artifacts and source code
  - Verify Dockerfile builds successfully
  - Verify runtime image is minimal
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 9. Refactor frontend Dockerfile to multi-stage build
  - Rewrite Dockerfile with three stages: `deps`, `build`, `runtime`
  - Stage 1 (deps): FROM base-node, copy package.json/package-lock.json, run npm ci
  - Stage 2 (build): FROM deps, copy src/ and public/, run npm run build
  - Stage 3 (runtime): FROM node:18-alpine, copy built assets from build stage
  - Verify Dockerfile builds successfully
  - Verify runtime image is minimal
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 10. Update docker-compose.yml for build isolation
  - Update pose-service build section: set context to `./backend/pose-service`, dockerfile to `Dockerfile`
  - Update backend-api build section: set context to `./backend`, dockerfile to `Dockerfile`
  - Update frontend build section: set context to `./backend/web`, dockerfile to `Dockerfile`
  - Verify each service has independent build context
  - Verify docker-compose.yml is valid
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 11. Verify GPU configuration in docker-compose.yml
  - Confirm pose-service has GPU device reservation via deploy.resources.reservations.devices
  - Confirm GPU uses nvidia driver
  - Confirm other services do not have GPU reservation
  - Verify docker-compose.yml is valid
  - _Requirements: 6.1, 6.2_

- [ ] 12. Remove dependency installation scripts
  - Identify any shell scripts that install dependencies (e.g., setup.sh, install.sh)
  - Remove or refactor scripts to only orchestrate Docker commands
  - Verify all dependency installation is in Dockerfiles
  - Update documentation to reflect Dockerfile-only dependency management
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 13. Checkpoint - Verify all Dockerfiles are valid
  - Run `docker-compose config` to validate docker-compose.yml
  - Verify all Dockerfiles parse correctly
  - Verify all base images exist or can be built
  - Ask the user if there are any questions or issues

- [ ] 14. Build base images
  - Build base-node: `docker build -t base-node:latest ./backend/docker/base-node`
  - Build base-python: `docker build -t base-python:latest ./backend/docker/base-python`
  - Build base-python-pose: `docker build -t base-python-pose:latest ./backend/docker/base-python-pose` (may take 15+ minutes)
  - Verify all base images build successfully
  - Verify images are available: `docker images | grep base-`
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 15. Build all services with docker-compose
  - Run `docker-compose build` to build all services
  - Verify all services build successfully
  - Verify build times are reasonable (pose-service may take 5-10 minutes on first build)
  - Verify all images are available: `docker images`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 16. Start all services with docker-compose
  - Run `docker-compose up` to start all services
  - Verify all services start successfully
  - Verify services are healthy (check health checks)
  - Verify logs show no errors
  - _Requirements: All_

- [ ] 17. Verify pose service is working
  - Check pose service logs: `docker-compose logs pose-service`
  - Verify Flask server is running on port 5000
  - Verify GPU is detected (if available)
  - Verify models are loaded successfully
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 18. Verify backend API is working
  - Check backend API logs: `docker-compose logs backend-api`
  - Verify Express server is running on port 3001
  - Verify API can connect to pose service
  - Verify health check passes
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 19. Verify frontend is working
  - Check frontend logs: `docker-compose logs frontend`
  - Verify Vite dev server is running on port 5173
  - Verify frontend can connect to backend API
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 20. Test code change rebuild (fast iteration)
  - Modify pose service code (e.g., add a comment to app.py)
  - Rebuild pose service: `docker-compose build pose-service`
  - Verify rebuild completes in < 30 seconds
  - Verify build logs show CACHED for dependency layers
  - Verify only application layer is rebuilt
  - _Requirements: 2.2, 2.3, 3.4_

- [ ] 21. Document BuildKit setup and caching strategy
  - Update project README with BuildKit setup instructions
  - Document how to enable BuildKit in WSL
  - Document expected build times
  - Document how to clear cache if needed
  - Document troubleshooting tips
  - _Requirements: 1.1, 1.2_

## Notes

- Base image builds (especially base-python-pose) may take 15+ minutes on first build
- Subsequent builds will be much faster due to caching
- All code changes should rebuild in < 30 seconds once base images are cached
- Each task builds on previous tasks - do not skip earlier tasks
- No property tests - just get the containers running and verify they work
- Use MCP tools as needed to assist with implementation
