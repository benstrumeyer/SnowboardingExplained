# Design: Pose Service Docker Dependencies Fix

## Overview

This design specifies a corrected Dockerfile and requirements.txt that properly installs all dependencies for the pose service, including graphics libraries, 4D-Humans, PHALP, ViTPose, and Detectron2. The approach follows the 4D-Humans repository structure and installation patterns.

## Architecture

The pose service Docker image consists of:

1. **Base Image**: `nvidia/cuda:12.1.1-runtime-ubuntu22.04` (GPU support)
2. **System Dependencies**: Graphics, build tools, image processing libraries
3. **Python Environment**: Python 3.10 with pip
4. **Source Installations**: 4D-Humans and Detectron2 from GitHub
5. **Python Packages**: Core ML libraries and utilities

## Components and Interfaces

### System Dependencies Layer

**Graphics Libraries** (required for OpenCV, PIL, PyRender):
- `libgl1-mesa-glx` - OpenGL runtime (fixes libGL.so.1 error)
- `libgl1-mesa-dev` - OpenGL development headers
- `libglib2.0-0` - GLib library
- `libsm6` - X11 shared memory extension
- `libxext6` - X11 extension library
- `libxrender-dev` - X11 rendering extension
- `libglu1-mesa` - OpenGL utility library

**Image Processing Libraries**:
- `libjpeg-turbo8` - JPEG compression
- `libpng-dev` - PNG support
- `libtiff5` - TIFF support (corrected from libtiff6 which doesn't exist in Ubuntu 22.04)
- `libwebp7` - WebP support

**Math Libraries**:
- `libopenblas-dev` - BLAS implementation
- `liblapack-dev` - Linear algebra package

**Build Tools**:
- `build-essential` - C/C++ compiler and build tools
- `git` - Version control
- `wget` - File download
- `curl` - HTTP client
- `ca-certificates` - SSL certificates

**Media**:
- `ffmpeg` - Video processing

### Python Dependencies Layer

**Core ML Libraries**:
- `torch>=2.0.0` - PyTorch
- `torchvision>=0.15.0` - Computer vision utilities
- `numpy>=1.26.0` - Numerical computing
- `opencv-python>=4.8.0` - Image processing

**Mesh and Rendering**:
- `trimesh>=3.20.0` - 3D mesh processing
- `pyrender>=0.1.45` - 3D rendering
- `pytorch3d>=0.7.0` - 3D deep learning (4D-Humans dependency)

**Configuration and Utilities**:
- `omegaconf>=2.3.0` - Configuration management
- `hydra-core>=1.3.0` - Configuration framework
- `scikit-image>=0.21.0` - Image processing algorithms
- `scipy>=1.11.0` - Scientific computing
- `tqdm>=4.66.0` - Progress bars
- `requests>=2.31.0` - HTTP library
- `pyyaml>=6.0` - YAML parsing

**4D-Humans Specific**:
- `einops>=0.7.0` - Tensor operations
- `smpl-x>=1.1.0` - SMPL-X body model (installed from source in 4D-Humans)

**PHALP Specific**:
- `yacs>=0.1.8` - Configuration system

**ViTPose Specific**:
- `timm>=0.9.0` - PyTorch Image Models

**Flask API**:
- `flask==3.0.0` - Web framework
- `flask-cors==4.0.0` - CORS support

### Source Installations

**4D-Humans** (from GitHub):
- Clone: `https://github.com/shubham-goel/4D-Humans.git`
- Location: `/app/4D-Humans`
- Provides: SMPL models, body reconstruction utilities, HMR2 integration
- Installation: Copy entire directory, models will be downloaded on first use

**Detectron2** (from GitHub):
- Clone: `https://github.com/facebookresearch/detectron2.git`
- Location: `/app/detectron2`
- Build: `pip install -e .` from source directory
- Provides: Object detection capabilities

## Data Models

### Image Processing Pipeline

```
Base64 Image Input
    ↓
[Image Decoding] - requires libGL.so.1, OpenCV
    ↓
[Pose Estimation] - requires torch, torchvision, ViTPose
    ↓
[Mesh Generation] - requires pytorch3d, trimesh, pyrender
    ↓
[SMPL Fitting] - requires smpl-x, 4D-Humans
    ↓
JSON Output (keypoints, mesh vertices, faces)
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: OpenGL Library Availability

**For any** pose service container instance, when the Flask application starts, the system library path SHALL contain libGL.so.1 and all dependent graphics libraries.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Image Decoding Success

**For any** base64-encoded image input to the pose service, the image decoding operation SHALL complete successfully without raising "libGL.so.1: cannot open shared object file" errors.

**Validates: Requirements 1.2, 8.1, 8.2**

### Property 3: 4D-Humans Module Imports

**For any** pose service container instance, importing 4D-Humans modules (e.g., `from hmr2.models import HMR2`) SHALL succeed without ImportError or ModuleNotFoundError.

**Validates: Requirements 2.2, 2.5**

### Property 4: PHALP Module Imports

**For any** pose service container instance, importing PHALP modules SHALL succeed without ImportError.

**Validates: Requirements 3.2, 3.4**

### Property 5: ViTPose Module Imports

**For any** pose service container instance, importing ViTPose-related modules (e.g., `import timm`) SHALL succeed without ImportError.

**Validates: Requirements 4.2, 4.4**

### Property 6: Detectron2 Installation

**For any** pose service container instance, importing Detectron2 (e.g., `from detectron2.config import get_cfg`) SHALL succeed without ImportError.

**Validates: Requirements 5.2, 5.4**

### Property 7: System Package Installation Success

**For any** Dockerfile build, the apt-get install commands SHALL complete successfully with exit code 0 and no "Unable to locate package" errors.

**Validates: Requirements 6.1, 6.2**

### Property 8: Python Dependency Resolution

**For any** requirements.txt file, running `pip install -r requirements.txt` SHALL complete successfully without version conflicts or missing package errors.

**Validates: Requirements 7.1, 7.2, 7.4**

### Property 9: Frame Processing End-to-End

**For any** valid video frame (as base64-encoded image), the pose service SHALL process it without libGL errors and return either valid pose data or a meaningful error message (not a library error).

**Validates: Requirements 8.3, 8.4**

## Error Handling

### Image Decoding Errors

**Current**: `libGL.so.1: cannot open shared object file`
**Fix**: Install libgl1-mesa-glx and graphics libraries
**Verification**: Run `ldd /usr/lib/x86_64-linux-gnu/libGL.so.1` in container

### SMPL Model Loading Errors

**Current**: `Could not extract faces from HMR2, trying pickle file...`
**Fix**: Ensure 4D-Humans is properly installed with model files
**Verification**: Check `/app/4D-Humans` directory exists and contains model files

### Package Installation Failures

**Current**: Various compilation errors during pip install
**Fix**: Install build-essential and development headers
**Verification**: Run `gcc --version` in container

### Import Errors

**Current**: ModuleNotFoundError for 4D-Humans, PHALP, ViTPose, Detectron2
**Fix**: Ensure all packages are in requirements.txt or installed from source
**Verification**: Run `python -c "import <module>"` for each module

## Testing Strategy

### Unit Tests

1. **Library Availability Test**: Verify libGL.so.1 exists in container
2. **Image Decoding Test**: Decode sample base64 image without errors
3. **Module Import Tests**: Import each major module (4D-Humans, PHALP, ViTPose, Detectron2)
4. **Flask Startup Test**: Verify Flask application starts without errors

### Property-Based Tests

1. **Property 1 (OpenGL)**: For any container instance, verify libGL.so.1 is available
2. **Property 2 (Image Decoding)**: For any base64 image, verify decoding succeeds
3. **Property 3-6 (Module Imports)**: For any container instance, verify all modules import successfully
4. **Property 7 (System Packages)**: For any Dockerfile build, verify apt-get succeeds
5. **Property 8 (Python Dependencies)**: For any requirements.txt, verify pip install succeeds
6. **Property 9 (Frame Processing)**: For any video frame, verify processing completes without libGL errors

### Integration Tests

1. **Full Pipeline Test**: Upload video → extract frames → process with pose service → verify mesh data saved
2. **Error Recovery Test**: Send invalid frames → verify graceful error handling
3. **Multi-Frame Test**: Process 30+ frames → verify all complete without libGL errors

## Implementation Notes

### Dockerfile Structure

The Dockerfile uses a multi-stage approach:

1. **Stage 1**: Base image + core build tools
2. **Stage 2**: Graphics libraries
3. **Stage 3**: Image/math libraries
4. **Stage 4**: Media tools
5. **Stage 5**: Python dependencies from requirements.txt
6. **Stage 6**: 4D-Humans from source
7. **Stage 7**: Detectron2 from source
8. **Stage 8**: Flask wrapper startup

### Key Fixes

1. **libGL.so.1**: Install `libgl1-mesa-glx` (runtime) and `libgl1-mesa-dev` (headers)
2. **Package Names**: Use `libtiff5` instead of `libtiff6` (doesn't exist in Ubuntu 22.04)
3. **4D-Humans**: Clone from GitHub and copy to `/app/4D-Humans`
4. **Detectron2**: Clone and build from source with `pip install -e .`
5. **Requirements.txt**: Remove non-existent packages, add missing ones

### Build Time Optimization

- Use `--no-cache-dir` with pip to reduce image size
- Install packages in stages to leverage Docker layer caching
- Remove apt cache after each stage with `rm -rf /var/lib/apt/lists/*`

