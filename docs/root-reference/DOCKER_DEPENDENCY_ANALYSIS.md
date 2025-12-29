# Docker Build Dependency Graph & Analysis

## Current Status
- **Pose Service Image**: ✅ Built (25.5GB) - Built at 11:18:59
- **Backend API Image**: ✅ Built (1.66GB) - Built at 12:02:56
- **Frontend Image**: ❌ Not built yet
- **Redis**: ✅ Using pre-built image (redis:7-alpine)
- **MongoDB**: ✅ Using pre-built image (mongo:7)

## Build Phases & Dependencies

```
PHASE 1: Infrastructure (No Dependencies)
├── Redis (redis:7-alpine) ✅
└── MongoDB (mongo:7) ✅

PHASE 2: Pose Service (Depends on: PHASE 1)
├── Base: nvidia/cuda:12.1.1-runtime-ubuntu22.04 (25GB+)
├── System deps: python3.10, pip, git, wget, curl, build-essential
├── Python deps: requirements.txt (torch, transformers, etc.)
├── Models cache: /app/models (mounted volume)
└── Status: ✅ BUILT (25.5GB)

PHASE 3: Backend API (Depends on: PHASE 1, PHASE 2)
├── Base: node:18-alpine
├── Dependencies: npm ci (from package.json)
├── Source: /backend/src, /backend/api
├── Connects to: Redis, MongoDB, Pose Service
└── Status: ✅ BUILT (1.66GB)

PHASE 4: Frontend (Depends on: PHASE 3)
├── Base: node:18-alpine
├── Dependencies: npm ci (from backend/web/package.json)
├── Source: /backend/web/src, public, vite.config.ts
├── Connects to: Backend API (http://localhost:3001)
└── Status: ❌ FAILED - Module import error
```

## Critical Issues Found

### Issue 1: Frontend Build Failure
**Error**: `SyntaxError: Cannot use import statement outside a module`
**Root Cause**: Backend API container is trying to run with CommonJS but code uses ES modules
**Location**: Backend API startup (npm run dev)
**Impact**: Frontend can't start because backend-api fails

### Issue 2: Backend API Configuration
**Problem**: Backend Dockerfile uses `npm run dev` but backend/package.json likely has CommonJS config
**File**: `SnowboardingExplained/backend/Dockerfile`
**Line**: `CMD ["npm", "run", "dev"]`

### Issue 3: Build Order Issue
When you ran `docker compose up`, it tried to rebuild everything:
1. Redis started ✅
2. MongoDB started ✅
3. Pose Service tried to rebuild (already built, but docker-compose rebuilds)
4. Backend API tried to rebuild → **FAILED** (module error)
5. Frontend never started (depends on backend-api)

## Why Services Are Crashing

1. **Backend API crashes** → Module import error in startup
2. **Frontend never starts** → Depends on backend-api health check
3. **Pose Service** → Likely working but can't be reached by backend-api

## Build Time Analysis

| Service | Base Image Size | Build Time | Total Size | Status |
|---------|-----------------|-----------|-----------|--------|
| Pose Service | 12GB (CUDA) | ~5-10 min | 25.5GB | ✅ Built |
| Backend API | 150MB (Node) | ~2-3 min | 1.66GB | ✅ Built |
| Frontend | 150MB (Node) | ~2-3 min | ~500MB | ❌ Failed |
| Redis | 50MB | Instant | 50MB | ✅ Pre-built |
| MongoDB | 500MB | Instant | 500MB | ✅ Pre-built |

**Total Build Time**: ~10-15 minutes (first time)
**Total Disk Space**: ~28GB

## Why It's Taking So Long

1. **Pose Service**: CUDA base image is 12GB + Python ML libraries (torch, transformers, etc.)
2. **Model Caching**: First run downloads ML models (~5-10GB) to `/app/models` volume
3. **npm ci**: Installs exact dependencies (slower than npm install but more reliable)
4. **Docker layer caching**: Each layer is cached, but changes force rebuilds

## Next Steps to Fix

1. **Fix Backend API module error** (CRITICAL)
   - Check backend/package.json for "type": "module"
   - Ensure tsconfig.json has correct module settings
   
2. **Verify Backend Dockerfile** 
   - Ensure npm run dev works locally first
   
3. **Then rebuild Frontend**
   - Frontend depends on backend-api being healthy

4. **Optimize build times**
   - Use .dockerignore to exclude node_modules, venv, etc.
   - Consider multi-stage builds for smaller images
