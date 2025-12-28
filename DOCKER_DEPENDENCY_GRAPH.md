# Docker Build Dependency Graph & Analysis

## Current Image Status

| Image | Size | Built | Status |
|-------|------|-------|--------|
| `snowboard-pose-service` | 25.5GB | 2025-12-28 11:18 | ✅ Built |
| `snowboard-backend-api` | 1.66GB | 2025-12-28 12:02 | ✅ Built |
| `snowboard-frontend` | 477MB | 2025-12-28 10:34 | ✅ Built |
| `redis:7-alpine` | 61.2MB | External | ✅ Available |
| `mongo:7` | 1.15GB | External | ✅ Available |

## Build Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE STARTUP                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────┐
        │   REDIS      │ │ MONGODB  │ │ POSE-SERVICE │
        │ (7-alpine)   │ │   (7)    │ │ (GPU-based)  │
        │ 61.2MB       │ │ 1.15GB   │ │ 25.5GB       │
        │ No deps      │ │ No deps  │ │ Deps: None   │
        └──────────────┘ └──────────┘ └──────────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────────┐  ┌──────────────────┐
            │  BACKEND-API     │  │    FRONTEND      │
            │ (Node 18-alpine) │  │ (Node 18-alpine) │
            │ 1.66GB           │  │ 477MB            │
            │ Deps:            │  │ Deps:            │
            │ - redis          │  │ - backend-api    │
            │ - mongodb        │  │                  │
            │ - pose-service   │  │                  │
            └──────────────────┘  └──────────────────┘
```

## Build Phases & Dependencies

### Phase 1: Infrastructure (No Dependencies)
- **Redis** (external image: `redis:7-alpine`)
  - No build required
  - No dependencies
  - Starts immediately
  
- **MongoDB** (external image: `mongo:7`)
  - No build required
  - No dependencies
  - Starts immediately

### Phase 2: Pose Service (GPU-Heavy, ~25.5GB)
- **Base Image**: `nvidia/cuda:12.1.1-runtime-ubuntu22.04`
- **Dependencies**: None (can start independently)
- **Build Time**: ~5-10 minutes (depending on network)
- **Key Steps**:
  1. Pull CUDA base image (~5GB)
  2. Install system packages (Python, pip, build tools)
  3. Install Python dependencies from `requirements.txt`
  4. Copy pose service code
  5. Expose port 5000
  6. Health check setup

### Phase 3: Backend API (Depends on Phase 1 & 2)
- **Base Image**: `node:18-alpine`
- **Dependencies**: 
  - Redis (Phase 1)
  - MongoDB (Phase 1)
  - Pose Service (Phase 2)
- **Build Time**: ~2-3 minutes
- **Key Steps**:
  1. Pull Node base image
  2. Install npm dependencies
  3. Copy source code
  4. Expose port 3001
  5. Health check setup

### Phase 4: Frontend (Depends on Phase 3)
- **Base Image**: `node:18-alpine`
- **Dependencies**: 
  - Backend API (Phase 3)
- **Build Time**: ~2-3 minutes
- **Key Steps**:
  1. Pull Node base image
  2. Install npm dependencies
  3. Copy source code
  4. Expose port 5173
  5. Start dev server

## Current Issues

### Issue 1: Backend API Container Crashed
- **Container**: `silly_jemison` (snowboard-backend-api)
- **Status**: Exited (1) 4 minutes ago
- **Error**: `SyntaxError: Cannot use import statement outside a module`
- **Root Cause**: Backend is trying to use ES6 imports but Node is treating it as CommonJS
- **Solution**: Check `backend/package.json` for `"type": "module"` setting

### Issue 2: Pose Service Size (25.5GB)
- **Problem**: CUDA runtime image is very large
- **Reason**: Includes full CUDA toolkit + runtime
- **Optimization**: Could use `nvidia/cuda:12.1.1-runtime-ubuntu22.04` (already doing this)

### Issue 3: Build Redundancy
- **Problem**: You built pose-service separately, then docker-compose tried to rebuild
- **Solution**: Use `docker-compose up --no-build` to skip rebuilds if images exist

## Recommended Build Order

```bash
# Step 1: Build infrastructure (no build needed, just pull)
docker pull redis:7-alpine
docker pull mongo:7

# Step 2: Build pose service (GPU-heavy, do this first)
docker build -f backend/pose-service/Dockerfile -t snowboard-pose-service .

# Step 3: Build backend API (depends on pose service being available)
docker build -f backend/Dockerfile -t snowboard-backend-api .

# Step 4: Build frontend (depends on backend API)
docker build -f backend/web/Dockerfile.dev -t snowboard-frontend .

# Step 5: Start all services
docker-compose up --no-build
```

## Quick Fixes

### Fix 1: Skip Rebuilds
```bash
docker-compose up --no-build
```

### Fix 2: Check Backend Module Type
```bash
cat backend/package.json | grep -A2 '"type"'
```

### Fix 3: View Build Logs
```bash
docker-compose logs backend-api
docker-compose logs pose-service
docker-compose logs frontend
```

### Fix 4: Clean and Rebuild
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Performance Optimization

| Phase | Current | Optimized | Savings |
|-------|---------|-----------|---------|
| Pose Service | 25.5GB | 25.5GB | - (GPU required) |
| Backend API | 1.66GB | ~500MB | 66% |
| Frontend | 477MB | ~300MB | 37% |
| **Total** | **~27.6GB** | **~26.3GB** | ~5% |

### Optimization Strategies
1. Use multi-stage builds for Node services
2. Remove dev dependencies from production images
3. Use `.dockerignore` to exclude unnecessary files
4. Cache npm dependencies separately
