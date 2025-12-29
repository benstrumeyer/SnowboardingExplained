# Docker BuildKit & Build Optimization - Requirements

## Overview
Restructure Docker builds for the SnowboardingExplained project to enable fast, cached, and isolated builds using Docker BuildKit, multi-stage Dockerfiles, and shared base images. The goal is to ensure that dependency layers are cached independently from application code and that Docker Compose rebuilds only the services that have changed.

## Problem Statement
- **Current Issue**: The pose service has large, slow-to-install dependencies (4D-Humans, PHALP, HMR2, etc.) that are reinstalled every time code changes, making development iteration extremely slow
- **Root Cause**: Dependency installation is not properly isolated from application code in Dockerfiles. Every code change triggers a full dependency reinstall
- **Impact**: Development workflow is blocked - changing pose service code requires waiting 10+ minutes for dependency reinstallation
- **Desired State**: Base image with all heavy dependencies cached, so code changes only rebuild the application layer (seconds instead of minutes)

## Goals
1. Create a base image with all pose service heavy dependencies (4D-Humans, PHALP, ViTDet, Detectron2, etc.) cached
2. Enable fast code reloads for pose service (seconds instead of minutes)
3. Enable Docker BuildKit for all local builds to maximize caching
4. Follow library installation recommendations from 4D-Humans, PHALP, ViTDet, and Detectron2 repositories
5. Make Dockerfiles the single source of truth for dependencies

## Non-Goals
- Supporting Docker builds from Windows filesystem paths (/mnt/c)
- Runtime dependency installation
- Monolithic Dockerfiles
- Docker-in-Docker workflows

## Assumptions
- All development occurs in WSL
- Repository is located at: `/home/ben/repos/SnowboardingExplained`
- Docker Engine runs inside WSL
- NVIDIA Container Toolkit is installed for GPU workloads

## User Stories

### US-1: Create Pose Service Base Image with Heavy Dependencies
**As a** developer  
**I want to** have a base image with all pose service dependencies (4D-Humans, PHALP, HMR2, etc.) pre-installed  
**So that** I can change pose service code and rebuild in seconds instead of waiting 10+ minutes for dependency reinstallation

**Acceptance Criteria:**
1. WHEN base-python-pose image is built, THEN it contains all heavy ML dependencies (4D-Humans, PHALP, HMR2, etc.)
2. WHEN pose service code changes, THEN rebuilding only rebuilds the application layer (not dependencies)
3. WHEN pose service code is rebuilt, THEN build completes in < 30 seconds (vs 10+ minutes with full dependency install)
4. WHEN base image is unchanged, THEN pose service uses cached base image layers
5. WHEN base image dependencies are updated, THEN the base image is rebuilt once and reused by pose service

### US-2: Enable Docker BuildKit
**As a** developer  
**I want to** use Docker BuildKit for all builds  
**So that** I can benefit from advanced caching and build optimization

**Acceptance Criteria:**
1. WHEN Docker BuildKit is enabled, THEN `docker build` commands use BuildKit backend
2. WHEN environment variables are set, THEN `DOCKER_BUILDKIT=1` and `COMPOSE_DOCKER_CLI_BUILD=1` are configured
3. WHEN building services, THEN build logs show BuildKit output format
4. WHEN rebuilding after code changes, THEN previously built layers are reused from cache

### US-3: Create Base Images for Shared Dependencies
**As a** developer  
**I want to** have base images that contain system and language dependencies  
**So that** I don't reinstall them every time I rebuild a service

**Acceptance Criteria:**
1. WHEN base-node image is built, THEN it contains Node.js runtime, npm, and OS-level build tools
2. WHEN base-python image is built, THEN it contains Python runtime, pip, and GPU-related system libraries
3. WHEN a service Dockerfile references a base image, THEN the base image is used as the foundation
4. WHEN base image dependencies change, THEN the base image is rebuilt and dependent services use the new version
5. WHEN base image is unchanged, THEN dependent services use cached base image layers

### US-4: Implement Multi-Stage Dockerfiles
**As a** developer  
**I want to** use multi-stage builds for each service  
**So that** runtime images are minimal and contain only necessary artifacts

**Acceptance Criteria:**
1. WHEN a service Dockerfile is built, THEN it has distinct `deps`, `build`, and `runtime` stages
2. WHEN the `deps` stage runs, THEN only dependency manifests (package.json, requirements.txt) are copied
3. WHEN the `build` stage runs, THEN application source code is copied and compiled/prepared
4. WHEN the `runtime` stage runs, THEN only runtime dependencies and built output are included
5. WHEN application source code changes, THEN dependency layers remain cached

### US-5: Isolate Service Builds
**As a** developer  
**I want to** build individual services without affecting others  
**So that** changes to one service don't trigger rebuilds of unrelated services

**Acceptance Criteria:**
1. WHEN docker-compose.yml is configured, THEN each service has its own build context
2. WHEN docker-compose.yml is configured, THEN each service references its own Dockerfile
3. WHEN building one service, THEN other services are not rebuilt
4. WHEN a service's dependencies change, THEN only that service is rebuilt

### US-6: Configure GPU Services
**As a** developer  
**I want to** explicitly reserve GPU resources for services that need them  
**So that** GPU allocation is clear and controlled

**Acceptance Criteria:**
1. WHEN a service requires GPU, THEN docker-compose.yml includes GPU device reservation
2. WHEN GPU is reserved, THEN `deploy.resources.reservations.devices` is configured with nvidia driver
3. WHEN a service doesn't need GPU, THEN no GPU resources are reserved
4. WHEN GPU is reserved, THEN the service can access GPU during runtime

### US-7: Prevent Cache Invalidation
**As a** developer  
**I want to** have .dockerignore files that exclude unnecessary files  
**So that** cache is not invalidated by unrelated file changes

**Acceptance Criteria:**
1. WHEN a .dockerignore file is present, THEN it excludes node_modules, __pycache__, .git, .env, logs, and data files
2. WHEN unrelated files change (e.g., README.md), THEN Docker cache is not invalidated
3. WHEN dependency files change, THEN Docker cache is invalidated appropriately
4. WHEN each service has a .dockerignore, THEN only relevant files are included in build context

### US-8: Enforce Dockerfile as Dependency Source
**As a** developer  
**I want to** ensure all dependency installation happens in Dockerfiles  
**So that** dependencies are reproducible and version-controlled

**Acceptance Criteria:**
1. WHEN a service is built, THEN no shell scripts install dependencies
2. WHEN a service is built, THEN no dependencies are installed during docker-compose up
3. WHEN a service is built, THEN all dependency installation logic is in the Dockerfile
4. WHEN reviewing a Dockerfile, THEN the dependency installation is explicit and clear

## Technical Requirements

### BuildKit Configuration
- Docker BuildKit must be enabled for all builds
- Required environment variables: `DOCKER_BUILDKIT=1`, `COMPOSE_DOCKER_CLI_BUILD=1`
- These variables must be set in WSL shell environment

### Base Image Architecture
- **Location**: `backend/docker/base-node/Dockerfile` and `backend/docker/base-python/Dockerfile`
- **Node Base Image Responsibilities**:
  - Install Node.js runtime
  - Install package manager (npm or pnpm)
  - Install OS-level build tools
  - Install shared native dependencies (e.g., ffmpeg)
- **Python Base Image Responsibilities**:
  - Install Python runtime
  - Install pip
  - Install GPU-related system libraries
  - Install shared Python dependencies required across services
- **Base Image Constraints**:
  - No application source code
  - No service-specific dependencies
  - Rarely modified
  - Built explicitly before dependent services

### Service Dockerfile Architecture
- Each service must define its own Dockerfile using multi-stage build
- Required stages: `deps`, `build`, `runtime`
- **Dependency Caching Rule (Critical)**: Dependency manifest files MUST be copied before application source code
- **Runtime Image Constraints**:
  - No compilers
  - No build tools
  - No package managers
  - Minimal surface area

### Docker Compose Configuration
- **Build Isolation Rules**:
  - Each service must define its own build context
  - Each service must reference its own Dockerfile
  - No shared build contexts between services
- **GPU Services**: Must explicitly reserve GPU resources via `deploy.resources.reservations.devices`

### .dockerignore Requirements
- Each service must include a .dockerignore file
- **Mandatory Ignored Paths**: node_modules, __pycache__, .git, .gitignore, .env, *.log, data/, *.pkl

### Script Usage Policy
- **Disallowed**:
  - Installing dependencies via shell scripts
  - Running install scripts during docker-compose up
  - Hiding dependency installs behind .sh files
- **Allowed**:
  - Developer convenience scripts
  - One-time local tooling scripts
  - Scripts that orchestrate Docker commands only

## Verification Criteria

### Cache Validation
- **Editing application source code**: MUST NOT reinstall dependencies
- **Editing dependency manifests**: MUST reinstall dependencies
- **Building one service**: MUST NOT rebuild other services

### Expected Build Output
- Build logs must show cached layers: `CACHED` for dependency stages after initial build

### Success Criteria
1. `docker-compose build <service>` completes quickly after first build
2. Dependency layers remain cached across rebuilds
3. Services build independently
4. No shell scripts install dependencies
5. No /mnt/c paths used
6. Dockerfiles are the authoritative source of dependency definitions

## Implementation Order
1. Enable BuildKit
2. Create base images
3. Refactor service Dockerfiles to multi-stage builds
4. Remove dependency install scripts
5. Update docker-compose build contexts
6. Add .dockerignore files
7. Validate caching behavior

## Out of Scope
- Kubernetes deployment
- Production CI/CD pipeline optimization
- Multi-GPU support
- Cloud deployment
- Persistent volume management beyond local mounts

## Success Criteria
1. BuildKit is enabled and used for all builds
2. Base images are created and used by services
3. All service Dockerfiles use multi-stage builds
4. Dependency layers are cached and reused
5. Services build independently without cascading rebuilds
6. Build time is significantly reduced compared to current approach
7. All dependencies are defined in Dockerfiles (no shell scripts)
