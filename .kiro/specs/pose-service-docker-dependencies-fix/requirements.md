# Requirements: Pose Service Docker Dependencies Fix

## Introduction

The pose service Docker container is failing to process video frames due to missing system and Python dependencies. The primary error is `libGL.so.1: cannot open shared object file: No such file or directory`, which indicates OpenGL and graphics libraries are missing. Additionally, the service needs 4D-Humans, PHALP, and ViTPose dependencies properly installed and configured.

This spec defines all errors that must be fixed before rebuilding the Docker image (which takes ~1 hour).

## Glossary

- **Pose_Service**: Flask-based Python service that processes video frames and extracts pose/mesh data
- **4D-Humans**: Human body reconstruction model from Shubham Goel's repository
- **PHALP**: Parametric Human Avatar Learning and Perception
- **ViTPose**: Vision Transformer-based pose estimation
- **libGL.so.1**: OpenGL library required for graphics operations
- **Detectron2**: Facebook's object detection framework (installed from source)
- **Docker_Image**: Container image for pose service (takes ~1 hour to build)

## Requirements

### Requirement 1: Fix OpenGL and Graphics Library Dependencies

**User Story:** As a developer, I want the pose service to have all required OpenGL and graphics libraries, so that image decoding and rendering operations work correctly.

#### Acceptance Criteria

1. WHEN the pose service container starts, THE system SHALL have libGL.so.1 available in the standard library paths
2. WHEN the pose service attempts to decode a base64 image, THE operation SHALL NOT fail with "libGL.so.1: cannot open shared object file"
3. WHEN the pose service processes frames, THE image decoding SHALL complete successfully for all frames
4. THE Dockerfile SHALL install all graphics libraries required by OpenCV, PyRender, and Trimesh

### Requirement 2: Install 4D-Humans Dependencies from Source

**User Story:** As a developer, I want 4D-Humans to be properly installed from source in the Docker container, so that the pose service can use its models and utilities.

#### Acceptance Criteria

1. WHEN the pose service container starts, THE 4D-Humans repository SHALL be cloned and installed
2. WHEN the pose service imports 4D-Humans modules, THE imports SHALL succeed without errors
3. THE Dockerfile SHALL copy the 4D-Humans directory structure correctly
4. THE Python environment SHALL have all 4D-Humans dependencies (smpl-x, pytorch3d, einops)
5. WHEN the pose service loads SMPL models, THE models SHALL load successfully from the 4D-Humans installation

### Requirement 3: Install PHALP Dependencies

**User Story:** As a developer, I want PHALP to be properly installed, so that the pose service can use PHALP for human tracking and mesh generation.

#### Acceptance Criteria

1. WHEN the pose service container starts, THE PHALP package SHALL be installed and importable
2. WHEN the pose service attempts to use PHALP utilities, THE imports SHALL succeed
3. THE requirements.txt SHALL include PHALP and its core dependencies (yacs)
4. WHEN the pose service processes frames with PHALP, THE operations SHALL complete without import errors

### Requirement 4: Install ViTPose Dependencies

**User Story:** As a developer, I want ViTPose to be properly installed, so that the pose service can use Vision Transformer-based pose estimation.

#### Acceptance Criteria

1. WHEN the pose service container starts, THE ViTPose dependencies SHALL be installed
2. WHEN the pose service imports ViTPose modules, THE imports SHALL succeed
3. THE requirements.txt SHALL include ViTPose core dependencies (timm)
4. WHEN the pose service uses ViTPose for pose estimation, THE operations SHALL complete without errors

### Requirement 5: Install Detectron2 from Source

**User Story:** As a developer, I want Detectron2 to be installed from source (matching 4D-Humans approach), so that object detection works correctly in the pose service.

#### Acceptance Criteria

1. WHEN the pose service container starts, THE Detectron2 repository SHALL be cloned from GitHub
2. WHEN the pose service imports Detectron2, THE imports SHALL succeed
3. THE Dockerfile SHALL build Detectron2 from source using the same approach as 4D-Humans
4. WHEN the pose service uses Detectron2 for detection, THE operations SHALL complete without errors

### Requirement 6: Verify All System Dependencies Are Installed

**User Story:** As a developer, I want all system-level dependencies to be installed, so that Python packages can compile and run correctly.

#### Acceptance Criteria

1. WHEN the Dockerfile builds, THE apt-get install commands SHALL succeed without package not found errors
2. WHEN Python packages are installed, THE compilation of packages with C extensions SHALL succeed
3. THE Dockerfile SHALL include all build tools (build-essential, git, wget, curl)
4. THE Dockerfile SHALL include all graphics libraries (libgl1-mesa-glx, libgl1-mesa-dev, libglib2.0-0, libsm6, libxext6, libxrender-dev)
5. THE Dockerfile SHALL include all image/math libraries (libjpeg-turbo8, libpng-dev, libopenblas-dev, liblapack-dev)
6. THE Dockerfile SHALL include ffmpeg for video processing

### Requirement 7: Verify Python Dependencies Are Correctly Specified

**User Story:** As a developer, I want all Python dependencies to be correctly specified with compatible versions, so that the pose service runs without import or compatibility errors.

#### Acceptance Criteria

1. WHEN the requirements.txt is processed, THE pip install command SHALL succeed without version conflicts
2. WHEN the pose service starts, THE Flask application SHALL initialize without import errors
3. WHEN the pose service processes frames, THE core dependencies (torch, torchvision, opencv-python, numpy) SHALL be available
4. THE requirements.txt SHALL NOT include packages that don't exist or have typos
5. WHEN the pose service loads models, THE model loading dependencies (trimesh, pyrender, pytorch3d) SHALL be available

### Requirement 8: Verify Image Decoding Works End-to-End

**User Story:** As a developer, I want to verify that the pose service can decode base64 images without OpenGL errors, so that frame processing works correctly.

#### Acceptance Criteria

1. WHEN the pose service receives a base64-encoded image, THE image decoding SHALL complete successfully
2. WHEN the pose service processes multiple frames, THE decoding SHALL work for all frames without libGL errors
3. THE error message "libGL.so.1: cannot open shared object file" SHALL NOT appear in logs
4. WHEN the pose service returns frame results, THE results SHALL contain valid pose data (not error messages)

## Known Errors to Fix

From the Docker logs, these exact error messages have been identified and must be fixed:

### Error 1: libGL.so.1 Missing (CRITICAL - Blocks All Frame Processing)

```
[🔴 POSE] ❌ Frame 24: Failed to decode image: libGL.so.1: cannot open shared object file: No such file or directory
```

**Occurrence**: Every frame fails with this error
**Root Cause**: OpenGL library not installed in container
**Impact**: 100% frame processing failure rate
**Fix Required**: Install libgl1-mesa-glx and all graphics dependencies

### Error 2: SMPL Model Loading Warning

```
[🔴 POSE] Loading SMPL faces from HMR2 model...
[🔴 POSE] ⚠ Could not extract faces from HMR2, trying pickle file...
```

**Occurrence**: During model initialization
**Root Cause**: 4D-Humans not properly installed or SMPL models missing
**Impact**: Mesh generation may fail or use fallback
**Fix Required**: Ensure 4D-Humans is installed from source with all model files

### Error 3: HTTP 400 Errors from Pose Service

```
[2025-12-28 20:12:48,831] [INFO] 172.18.0.5 - - [28/Dec/2025 20:12:48] "POST /pose/hybrid HTTP/1.1" 400 -
```

**Occurrence**: Every frame request returns 400
**Root Cause**: Image decoding fails due to libGL.so.1 error
**Impact**: Backend receives error responses instead of pose data
**Fix Required**: Fix libGL.so.1 error (Error 1)

### Error 4: Frontend Receives 400 Errors

```
[4D-HUMANS] Error for frame 1: {message: 'Request failed with status code 400',code: 'ERR_BAD_REQUEST',...,responseData: {error: 'Failed to decode image: libGL.so.1: cannot open shared object file: No such file or directory'},...}
```

**Occurrence**: Every frame upload attempt
**Root Cause**: Pose service returns 400 due to libGL.so.1 error
**Impact**: Video upload fails, 0 mesh frames saved to MongoDB
**Fix Required**: Fix libGL.so.1 error (Error 1)

### Error 5: Package Installation Failures (During Docker Build)

```
E: Unable to locate package libtiff6
```

**Occurrence**: During Dockerfile build
**Root Cause**: Package name doesn't exist in Ubuntu 22.04 (should be libtiff5)
**Impact**: Docker build fails
**Fix Required**: Use correct package names for Ubuntu 22.04

### Error 6: Missing Python Dependencies (Potential)

**Potential Errors**:
- `ModuleNotFoundError: No module named 'detectron2'`
- `ModuleNotFoundError: No module named 'smpl_x'`
- `ModuleNotFoundError: No module named 'phalp'`
- `ModuleNotFoundError: No module named 'timm'`

**Root Cause**: Dependencies not in requirements.txt or not installed from source
**Impact**: Pose service fails to start or crashes during frame processing
**Fix Required**: Add all missing packages to requirements.txt or install from source

## Success Criteria

All of the above errors must be eliminated. Success is achieved when:

1. ✅ No "libGL.so.1: cannot open shared object file" errors in logs
2. ✅ All frames process successfully (no HTTP 400 errors)
3. ✅ Mesh data is saved to MongoDB for all processed frames
4. ✅ Docker build completes without package not found errors
5. ✅ All Python modules import successfully
6. ✅ SMPL model loading completes without warnings
7. ✅ Frontend receives valid pose data responses (HTTP 200)

