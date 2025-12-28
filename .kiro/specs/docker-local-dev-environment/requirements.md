# Docker Local Development Environment - Requirements

## Overview
Migrate from WSL-based GPU workload execution to a containerized Docker environment that provides better control, observability, and stability for GPU-intensive pose service operations.

## Problem Statement
- **Current Issue**: WSL crashes with `E_UNEXPECTED` errors when running GPU-intensive 4D-Humans + PHALP + HMR2 models
- **Root Cause**: WSL cannot reliably handle sustained GPU load from multiple deep learning models
- **Impact**: Video upload pipeline fails unpredictably, making the system unreliable for production use
- **Desired State**: Containerized services with proper GPU passthrough, centralized logging, and service orchestration

## User Stories

### US-1: Containerize Pose Service
**As a** developer  
**I want to** run the pose service (4D-Humans + PHALP) in a Docker container  
**So that** I have better control over GPU allocation and can isolate the workload from the host system

**Acceptance Criteria:**
- Dockerfile builds successfully with all Python dependencies
- Container can access GPU via nvidia-docker
- Model files are properly mounted or cached
- Container starts and initializes models without crashing
- Logs are visible and can be captured

### US-2: Orchestrate Multiple Services with Docker Compose
**As a** developer  
**I want to** start/stop/restart all services (pose, backend API, frontend, Redis, MongoDB) with a single command  
**So that** I don't have to manually manage 5 different terminals

**Acceptance Criteria:**
- docker-compose.yml defines all services
- Services start in correct order (dependencies respected)
- Services can be individually restarted
- Health checks are configured
- Logs are aggregated and viewable

### US-3: Configure GPU Passthrough
**As a** developer  
**I want to** specify which GPU device the pose service uses  
**So that** I can control resource allocation and avoid conflicts

**Acceptance Criteria:**
- docker-compose.yml includes nvidia runtime configuration
- GPU device can be specified via environment variable
- Container can detect and use GPU
- CUDA is available inside container

### US-4: Centralized Logging
**As a** developer  
**I want to** see all service logs in one place  
**So that** I can debug issues without checking multiple terminals

**Acceptance Criteria:**
- All services log to stdout/stderr
- docker-compose logs shows all output
- Log levels can be configured per service
- Historical logs are preserved

### US-5: Service Health Checks
**As a** developer  
**I want to** know when services are healthy or failing  
**So that** I can quickly identify and fix issues

**Acceptance Criteria:**
- Health checks defined for each service
- Failed services are automatically restarted
- Health status visible in docker-compose ps
- Unhealthy services don't block other services

### US-6: Local Development Workflow
**As a** developer  
**I want to** modify code and see changes without rebuilding containers  
**So that** I can iterate quickly during development

**Acceptance Criteria:**
- Source code is mounted as volumes
- Changes to Python/TypeScript are reflected immediately
- No need to rebuild containers for code changes
- Hot reload works for applicable services

## Technical Requirements

### Docker Image Requirements
- Base image: `nvidia/cuda:12.1.1-runtime-ubuntu22.04` (or appropriate CUDA version)
- Python 3.10+
- All dependencies from requirements.txt
- Model files cached or mounted
- Minimal image size (use multi-stage builds if needed)

### Docker Compose Requirements
- Version: 3.8+
- Services: pose-service, backend-api, frontend, redis, mongodb
- Network: custom bridge network for service communication
- Volumes: code mounts, data persistence, model cache
- Environment: configurable via .env file

### GPU Configuration
- nvidia-docker runtime enabled
- Device mapping: `/dev/nvidia0` or configurable
- CUDA_VISIBLE_DEVICES environment variable support
- GPU memory limits (if needed)

### Logging
- All services log to stdout/stderr
- Log format: structured JSON or consistent text format
- Log levels: DEBUG, INFO, WARN, ERROR
- Aggregation: docker-compose logs command

### Performance Targets
- Pose service startup: < 60 seconds (including model loading)
- Video processing: same speed as current WSL implementation
- Memory usage: monitored and optimized
- GPU utilization: visible and controllable

## Out of Scope
- Kubernetes deployment (local Docker only)
- Production CI/CD pipeline (local development focus)
- Multi-GPU support (single GPU for now)
- Cloud deployment (AWS, GCP, etc.)
- Persistent volume management beyond local mounts

## Success Criteria
1. All 5 services start successfully with `docker-compose up`
2. Pose service processes video without crashing
3. Logs are visible and useful for debugging
4. Services can be restarted individually
5. Code changes are reflected without rebuilding
6. GPU is properly utilized and controlled
7. Development workflow is faster than WSL approach
