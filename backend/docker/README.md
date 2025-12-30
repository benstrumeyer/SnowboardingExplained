# Docker Build Architecture

Multi-stage Docker build system for SnowboardingExplained services.

## Base Images

### base-node
- **Purpose**: Node.js runtime for backend API and frontend
- **Base**: node:18-alpine
- **Size**: ~572 MB
- **Includes**: Node.js 18, npm, build tools

### base-python
- **Purpose**: Python runtime for general utilities
- **Base**: python:3.10-slim
- **Size**: ~827 MB
- **Includes**: Python 3.10, pip, system libraries

### base-python-pose
- **Purpose**: ML/AI runtime for pose estimation service
- **Base**: nvidia/cuda:12.1.1-runtime-ubuntu22.04
- **Size**: ~13.07 GB
- **Includes**: CUDA 12.1.1, Python 3.10, PyTorch 2.0.1, pytorch3d v0.7.0, detectron2, PHALP, and all ML dependencies

## Service Images

### snowboard-backend-api
- **Base**: base-node
- **Purpose**: Express.js backend API server
- **Port**: 3001

### snowboard-frontend
- **Base**: base-node
- **Purpose**: Vite React frontend
- **Port**: 5173

### snowboard-pose-service
- **Base**: base-python-pose
- **Purpose**: Flask pose estimation service
- **Port**: 5000

## Build Order

1. Build base images first (they're cached and reused)
2. Build service images (depend on base images)

```bash
# Build base images
docker build -t base-node:latest -f backend/docker/base-node/Dockerfile .
docker build -t base-python:latest -f backend/docker/base-python/Dockerfile .
docker build -t base-python-pose:latest -f backend/docker/base-python-pose/Dockerfile .

# Build service images
docker build -t snowboard-backend-api:latest -f backend/Dockerfile .
docker build -t snowboard-frontend:latest -f backend/web/Dockerfile .
docker build -t snowboard-pose-service:latest -f backend/pose-service/Dockerfile .
```

## Key Dependencies

- **torch**: 2.0.1 (CUDA 11.8 compatible)
- **torchvision**: 0.15.2
- **pytorch3d**: v0.7.0 (from source)
- **detectron2**: Latest from git (with model_zoo)
- **PHALP**: v0.1.3 (pose tracking)
- **SMPL models**: Included in pose-service data/

## Notes

- All base images use `--no-cache-dir` for pip to reduce size
- ML dependencies use `--no-build-isolation` for compatibility
- SMPL model file (basicmodel_m_lbs_10_207_0_v1.1.0.pkl) is gitignored but included in Docker builds
