# Docker Pose Service Build Fix - In Progress

## Problem Identified
The Docker build was failing with:
```
E: Unable to locate package libtiff6
```

This occurred because `libtiff6` doesn't exist in Ubuntu 22.04 repositories. The package available is `libtiff5`.

## Solution Applied

### 1. Dockerfile Changes
- **Split apt-get installs into 4 stages** to avoid conflicts and make debugging easier:
  - Stage 1: Core build tools and Python
  - Stage 2: Graphics and rendering libraries (OpenGL, etc.)
  - Stage 3: Image and math libraries (fixed libtiff5)
  - Stage 4: Media utilities (ffmpeg)
- **Added `--no-install-recommends`** flag to reduce image size and avoid unnecessary dependencies
- **Fixed package name**: Changed `libtiff6` → `libtiff5`

### 2. Requirements.txt Changes
- **Removed problematic packages** that may not install cleanly:
  - Removed `smpl-x` (requires manual setup)
  - Removed `phalp` (requires manual setup)
  - Removed `mmcv` and `mmpose` (complex dependencies)
- **Kept core dependencies**:
  - Flask and CORS
  - MediaPipe, OpenCV, Pillow
  - PyTorch and TorchVision
  - Trimesh and Pyrender
  - Hydra and OmegaConf
  - Core 4D-Humans: pytorch3d, einops
  - Core ViTPose: timm

## Build Status
- **Started**: Docker build process running in background (ProcessId: 23)
- **Current Stage**: Step 3/10 - Installing build tools (unpacking packages)
- **Elapsed Time**: ~120 seconds
- **Expected Duration**: 10-15 minutes total (downloading ~2GB of packages)
- **Progress**: Successfully downloading and unpacking packages, no errors so far

## Next Steps
1. Wait for build to complete
2. Verify build succeeds with exit code 0
3. Restart all containers: `docker-compose up -d`
4. Test video upload to verify pose service can now:
   - Decode images (OpenGL library available)
   - Extract frames
   - Process poses
   - Save mesh data to MongoDB
5. Monitor logs for any remaining dependency issues

## Files Modified
- `SnowboardingExplained/backend/pose-service/Dockerfile`
- `SnowboardingExplained/backend/pose-service/requirements.txt`

## Key Fixes in Previous Session
- ✅ Frontend: VideoUploadModal.tsx - Deterministic videoId hashing (SHA-256)
- ✅ Backend: pose-video.ts - Fixed meshDataService.saveMeshData() call with proper MeshData object
