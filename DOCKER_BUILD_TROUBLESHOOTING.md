# Docker Build Troubleshooting & Fix Guide

## Issue Summary

You have 3 Docker images built, but services are crashing due to configuration issues. Here's what's happening:

### Current State
- ✅ `snowboard-pose-service` (25.5GB) - Built successfully
- ✅ `snowboard-backend-api` (1.66GB) - Built but **CRASHING**
- ✅ `snowboard-frontend` (477MB) - Built but not tested
- ✅ `redis:7-alpine` - Running
- ❌ `mongodb:7` - Not running
- ❌ `snowboard-backend-api` container - Exited with error

## Root Cause Analysis

### Problem 1: Backend Module Type Error ✅ FIXED
**Error**: `SyntaxError: Cannot use import statement outside a module`

**Root Cause**: `backend/package.json` was missing `"type": "module"`

**Fix Applied**: Added `"type": "module"` to backend/package.json

**Why This Matters**: 
- Your code uses ES6 `import` statements
- Node.js needs to know to treat files as ES modules
- Without this setting, Node treats `.ts` files as CommonJS

### Problem 2: Services Not Running
**Status**: Only Redis is running, MongoDB and backend API are not

**Reasons**:
1. Backend API crashed due to module type error (now fixed)
2. MongoDB container may not have started
3. Pose service may not be healthy

## Step-by-Step Fix

### Step 1: Verify the Fix
```bash
# Check that package.json now has "type": "module"
cat backend/package.json | grep -A1 '"type"'
# Should output: "type": "module",
```

### Step 2: Clean Up Old Containers
```bash
# Stop all containers
docker-compose down

# Remove exited containers
docker container prune -f

# Verify cleanup
docker ps -a
```

### Step 3: Rebuild Backend API
```bash
# Rebuild just the backend API with the fix
docker build -f backend/Dockerfile -t snowboard-backend-api .

# Or let docker-compose rebuild it
docker-compose build backend-api
```

### Step 4: Start Services in Order
```bash
# Start infrastructure first (Redis + MongoDB)
docker-compose up -d redis mongodb

# Wait 10 seconds for databases to be ready
Start-Sleep -Seconds 10

# Start pose service
docker-compose up -d pose-service

# Wait 30 seconds for pose service to initialize
Start-Sleep -Seconds 30

# Start backend API
docker-compose up -d backend-api

# Check logs
docker-compose logs -f backend-api
```

### Step 5: Verify All Services
```bash
# Check all containers are running
docker ps

# Check health status
docker-compose ps

# View logs for any service
docker-compose logs backend-api
docker-compose logs pose-service
docker-compose logs mongodb
```

## Build Dependency Execution Plan

### Parallel Phase (No Dependencies)
```bash
# These can start simultaneously
docker-compose up -d redis mongodb
```

### Sequential Phase 1 (Depends on Infrastructure)
```bash
# Wait for Redis + MongoDB to be healthy
docker-compose up -d pose-service
```

### Sequential Phase 2 (Depends on Pose Service)
```bash
# Wait for pose service to be healthy
docker-compose up -d backend-api
```

### Sequential Phase 3 (Depends on Backend API)
```bash
# Wait for backend API to be healthy
docker-compose up -d frontend
```

## Quick Start Commands

### Option A: Full Clean Start (Recommended)
```bash
# Clean everything
docker-compose down -v
docker system prune -a -f

# Rebuild all images
docker-compose build

# Start all services
docker-compose up -d

# Monitor startup
docker-compose logs -f
```

### Option B: Fast Start (Images Already Built)
```bash
# Just start containers without rebuilding
docker-compose up -d

# Monitor
docker-compose logs -f
```

### Option C: Rebuild Only Backend
```bash
# Rebuild backend with the fix
docker-compose build backend-api

# Restart backend
docker-compose up -d backend-api

# Check logs
docker-compose logs -f backend-api
```

## Verification Checklist

- [ ] Backend package.json has `"type": "module"`
- [ ] All old containers are removed
- [ ] Redis is running and healthy
- [ ] MongoDB is running and healthy
- [ ] Pose service is running and healthy
- [ ] Backend API is running and healthy
- [ ] Frontend is running (if needed)
- [ ] All services can communicate (check logs for connection errors)

## Common Issues & Solutions

### Issue: "Cannot use import statement outside a module"
**Solution**: Ensure `"type": "module"` is in package.json

### Issue: "ECONNREFUSED" errors in backend logs
**Solution**: Services aren't ready yet. Wait longer before starting dependent services.

### Issue: Pose service keeps restarting
**Solution**: Check GPU availability and CUDA setup. View logs: `docker-compose logs pose-service`

### Issue: MongoDB connection refused
**Solution**: MongoDB may not be initialized. Check logs: `docker-compose logs mongodb`

### Issue: Port already in use
**Solution**: 
```bash
# Find what's using the port
netstat -ano | findstr :5000  # for pose service
netstat -ano | findstr :3001  # for backend
netstat -ano | findstr :5173  # for frontend

# Kill the process
taskkill /PID <PID> /F
```

## Performance Notes

### Build Times
- Pose Service: 5-10 minutes (first time, includes CUDA)
- Backend API: 2-3 minutes
- Frontend: 2-3 minutes
- **Total**: ~10-15 minutes first time

### Startup Times
- Redis: ~5 seconds
- MongoDB: ~10 seconds
- Pose Service: ~30-60 seconds (model loading)
- Backend API: ~10 seconds
- Frontend: ~5 seconds
- **Total**: ~60-90 seconds

### Disk Usage
- Pose Service: 25.5GB (CUDA + models)
- Backend API: 1.66GB
- Frontend: 477MB
- Redis: 61.2MB
- MongoDB: 1.15GB
- **Total**: ~28.8GB

## Next Steps

1. ✅ Fixed backend package.json
2. Run: `docker-compose down && docker-compose build backend-api`
3. Run: `docker-compose up -d`
4. Monitor: `docker-compose logs -f`
5. Test: Visit http://localhost:3001/health
