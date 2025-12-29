# Docker BuildKit & Build Optimization - Design

## Overview

This design restructures Docker builds for SnowboardingExplained to enable fast, cached builds using Docker BuildKit and multi-stage Dockerfiles. The key innovation is creating a base image (`base-python-pose`) that contains all heavy ML dependencies (4D-Humans, PHALP, ViTDet, Detectron2, pytorch3d, etc.), allowing pose service code changes to rebuild in seconds instead of 10+ minutes.

The implementation follows official installation recommendations from each library's repository.

## Architecture

### Build Layer Strategy

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
│ - nvidia/cuda:12.1.1-runtime-ubuntu22.04                     │
│ - node:18-alpine                                             │
│ - python:3.10-slim-bullseye                                  │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── docker/
│   ├── base-node/
│   │   ├── Dockerfile          # Node.js base image
│   │   └── .dockerignore
│   ├── base-python/
│   │   ├── Dockerfile          # Python base image
│   │   └── .dockerignore
│   └── base-python-pose/
│       ├── Dockerfile          # Pose service base with ML deps
│       └── .dockerignore
├── pose-service/
│   ├── Dockerfile              # Multi-stage: deps → build → runtime
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── app.py
│   └── ...
├── web/
│   ├── Dockerfile              # Multi-stage: deps → build → runtime
│   ├── .dockerignore
│   └── ...
├── Dockerfile                  # Backend API multi-stage
├── .dockerignore
└── ...

docker-compose.yml             # Updated with build contexts
```

## Components and Interfaces

### 1. Base Images

#### base-python-pose Dockerfile

**Purpose**: Cache all heavy ML dependencies so pose service code changes rebuild quickly

**Installation Order** (following library recommendations):
1. System dependencies (graphics, math, media libraries)
2. Python 3.10, pip, build tools
3. joblib (installed first - PHALP import dependency)
4. All requirements.txt dependencies
5. pytorch3d 0.7.0 (with proper build support)
6. 4D-Humans (from local copy, following README.md)
7. Detectron2 from source (includes ViTDet models)

**Key Dependencies**:
- 4D-Humans (local copy)
- PHALP
- ViTDet (via Detectron2 model zoo)
- Detectron2 (built from source for Python 3.10)
- pytorch3d 0.7.0
- joblib (installed first to avoid import issues)
- System libraries: libgl1-mesa, libsm6, ffmpeg, etc.

**Constraints**:
- No application code
- No SMPL model (will be copied by pose service Dockerfile)
- No pose service code
- Rarely modified (only when ML dependencies change)

#### base-node Dockerfile

**Purpose**: Cache Node.js runtime and build tools

**Installation**:
- Node.js 18
- npm
- build-essential (for native modules)
- python3 (for node-gyp)

#### base-python Dockerfile

**Purpose**: Cache Python runtime and system libraries

**Installation**:
- Python 3.10
- pip
- System libraries (graphics, math)

### 2. Service Dockerfiles (Multi-Stage)

#### Pose Service Dockerfile

**Stages**:

1. **deps** (FROM base-python-pose)
   - Copy `requirements.txt`
   - Run `pip install -r requirements.txt`
   - Copy SMPL model to `/app/data/`
   - Result: All dependencies installed

2. **build** (FROM deps)
   - Copy pose service code
   - Verify installations
   - Result: Ready-to-run application

3. **runtime** (FROM base-python-pose)
   - Copy only built artifacts from build stage
   - Copy SMPL model
   - Copy pose service code
   - Result: Minimal runtime image

**Key Optimization**: When pose service code changes, only the `build` and `runtime` stages rebuild (seconds). The `deps` stage is cached from base-python-pose.

#### Backend API Dockerfile

**Stages**:

1. **deps** (FROM base-node)
   - Copy `package.json`, `package-lock.json`
   - Run `npm ci`
   - Result: Dependencies installed

2. **build** (FROM deps)
   - Copy source code (`src/`, `api/`)
   - Run `npm run build` (if applicable)
   - Result: Built application

3. **runtime** (FROM base-node)
   - Copy only built artifacts
   - Copy source code
   - Result: Minimal runtime image

#### Frontend Dockerfile

**Stages**:

1. **deps** (FROM base-node)
   - Copy `package.json`, `package-lock.json`
   - Run `npm ci`
   - Result: Dependencies installed

2. **build** (FROM deps)
   - Copy source code
   - Run `npm run build`
   - Result: Built static assets

3. **runtime** (FROM node:18-alpine)
   - Copy built assets from build stage
   - Result: Minimal runtime image

### 3. Docker Compose Configuration

**Build Isolation**:
- Each service has its own `build.context` and `build.dockerfile`
- No shared build contexts
- Services build independently

**Example**:
```yaml
services:
  pose-service:
    build:
      context: ./backend/pose-service
      dockerfile: Dockerfile
    # ... rest of config

  backend-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    # ... rest of config
```

**GPU Configuration**:
- Pose service explicitly reserves GPU via `deploy.resources.reservations.devices`
- Other services do not reserve GPU

### 4. .dockerignore Files

**Purpose**: Prevent cache invalidation from unrelated file changes

**Mandatory Ignored Paths**:
- `node_modules/`
- `__pycache__/`
- `.git/`
- `.gitignore`
- `.env`
- `*.log`
- `data/` (except SMPL model)
- `*.pkl`
- `.venv/`
- `venv/`
- `dist/`
- `build/`

## Implementation Notes

### BuildKit Environment Variables

Must be set in WSL shell environment:
```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

Can be added to `.bashrc` or `.zshrc` for persistence.

### Base Image Build Order

1. Build base-python-pose first (contains all ML dependencies)
2. Build base-node (independent)
3. Build base-python (independent)
4. Build service images (depend on base images)

### Pose Service Specific Considerations

- SMPL model must be copied during build (not downloaded at runtime)
- joblib must be installed before PHALP (import dependency)
- Detectron2 must be built from source for Python 3.10
- pytorch3d may need special handling for GPU support
- Follow 4D-Humans README.md installation steps exactly

### Volume Mounts for Development

- Source code mounted as volumes for hot reload
- Model cache volume for persistence
- Data volume for uploads

### Cache Clearing

If cache becomes corrupted:
```bash
docker buildx prune -a
docker system prune -a
```

## Performance Targets

- **Base image build**: 10-15 minutes (one-time, rarely rebuilt)
- **Service build (code change)**: < 30 seconds (cached dependencies)
- **Service build (dependency change)**: 5-10 minutes (full rebuild)
- **docker-compose build**: < 1 minute (all services, cached)
- **Pose service startup**: < 60 seconds (model loading)

## Security Considerations

- Base images use official upstream images (nvidia/cuda, node, python)
- No credentials or secrets in Dockerfiles
- .dockerignore excludes .env files
- Runtime images minimal to reduce attack surface
- GPU access controlled via docker-compose configuration

## Deployment Considerations

This design is for local development only. For production:
- Use image registries (Docker Hub, ECR, etc.)
- Implement image scanning for vulnerabilities
- Use immutable image tags
- Implement multi-stage builds for production optimization
- Consider Kubernetes for orchestration
