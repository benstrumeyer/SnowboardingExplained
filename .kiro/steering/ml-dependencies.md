# ML Dependencies Stack

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Overview

The SnowboardingExplained MVP uses a frozen ML stack with 4 core dependencies installed in strict order. Each dependency builds on the previous one.

## Dependency Chain

```
detectron2 (base)
    ↓
ViTDet (person detection)
    ↓
4D-Humans (pose estimation)
    ↓
PHALP (temporal tracking)
    ↓
Pose Service (Flask wrapper)
```

## Core ML Dependencies

### 1. detectron2 (Detection Framework)

**Purpose:** Base detection framework for computer vision tasks  
**Version:** Latest from cloned repo  
**Install:** `cd ~/repos/detectron2 && pip install -e .`

**Key Components:**
- Object detection backbone
- Instance segmentation
- Keypoint detection
- Foundation for ViTDet

**Why First:** All other detection models depend on detectron2

### 2. ViTDet (Vision Transformer Detection)

**Purpose:** Person detection using Vision Transformer  
**Version:** Latest from cloned repo  
**Install:** `cd ~/repos/ViTDet && pip install -e .`

**Key Components:**
- Vision Transformer backbone
- Person bounding box detection
- Efficient detection for video frames
- Required by 4D-Humans

**Why Second:** Depends on detectron2, required by 4D-Humans

### 3. 4D-Humans (3D Pose Estimation)

**Purpose:** Per-frame 3D human pose estimation  
**Version:** Latest from cloned repo  
**Install:** `cd ~/repos/4D-Humans && pip install -e .`

**Key Components:**
- HMR2 model (3D pose from 2D image)
- SMPL body model
- Camera estimation
- Mesh generation
- Per-frame pose detection

**Why Third:** Depends on ViTDet, required by PHALP

### 4. PHALP (Temporal Tracking)

**Purpose:** Temporal motion tracking and interpolation  
**Version:** Latest from cloned repo  
**Install:** `cd ~/repos/PHALP && pip install -e .`

**Key Components:**
- Tracklet management (person tracking across frames)
- Motion models (velocity, acceleration)
- Pose prediction when detection fails
- Temporal smoothing
- 100% frame coverage (fills gaps)

**Why Fourth:** Depends on 4D-Humans, provides temporal consistency

## Python Core Libraries

### Deep Learning
- **torch** (2.2.0+) - PyTorch deep learning framework
- **torchvision** (0.17.0+) - Computer vision utilities
- **pytorch-lightning** (2.0.0+) - Training framework

### Computer Vision
- **opencv-python** (4.8.0+) - Image processing
- **scikit-image** (0.21.0+) - Image algorithms
- **trimesh** (3.20.0+) - 3D mesh operations
- **pyrender** (0.1.45+) - 3D rendering

### Data Processing
- **numpy** (1.24.0+) - Numerical computing
- **pandas** (2.0.0+) - Data manipulation
- **scipy** (1.11.0+) - Scientific computing
- **scikit-learn** (1.2.0+) - Machine learning utilities

### Configuration & Utilities
- **omegaconf** (2.3.0+) - Configuration management
- **hydra-core** (1.3.0+) - Configuration framework
- **pyyaml** (6.0+) - YAML parsing
- **tqdm** (4.66.0+) - Progress bars

### Image & Visualization
- **Pillow** (10.0.0+) - Image processing
- **matplotlib** (3.8.0+) - Plotting
- **einops** (0.7.0+) - Tensor operations

### Model Utilities
- **timm** (0.9.0+) - PyTorch image models
- **joblib** (1.0.0+) - Parallel computing

### Web Framework
- **flask** (3.0.0+) - Web server
- **flask-cors** (4.0.0+) - CORS support

### Utilities
- **requests** (2.31.0+) - HTTP client

## Installation Order (Critical)

```bash
# 1. Base framework
cd ~/repos/detectron2
pip install -e .

# 2. Person detection
cd ../ViTDet
pip install -e .

# 3. Pose estimation
cd ../4D-Humans
pip install -e .

# 4. Temporal tracking
cd ../PHALP
pip install -e .

# 5. Pose service dependencies
cd ../SnowboardingExplained/backend/pose-service
pip install -r requirements.txt
```

## Why This Order?

| Step | Package | Reason |
|------|---------|--------|
| 1 | detectron2 | Base framework, no dependencies |
| 2 | ViTDet | Depends on detectron2 |
| 3 | 4D-Humans | Depends on ViTDet |
| 4 | PHALP | Depends on 4D-Humans |
| 5 | Pose Service | Depends on all above |

**Breaking this order will cause import errors.**

## System Requirements

### Memory
- **Minimum:** 8GB RAM
- **Recommended:** 16GB RAM
- **GPU:** 8GB VRAM (NVIDIA)

### Disk Space
- **Models:** ~10GB
- **Dependencies:** ~5GB
- **Total:** ~15GB

### Python
- **Version:** 3.10+
- **Virtual Environment:** Required

### GPU (Optional)
- **NVIDIA CUDA:** 11.8+
- **cuDNN:** 8.6+
- **PyTorch CUDA:** 2.2.0+

## Verification

```bash
# Test each package
python -c "import detectron2; print('✓ detectron2')"
python -c "from vitdet import ViTDet; print('✓ ViTDet')"
python -c "from hmr2 import HMR2; print('✓ 4D-Humans')"
python -c "from phalp import PHALP; print('✓ PHALP')"

# Test pose service
cd backend/pose-service && python app.py
# Should see: "Server is ready to accept requests"
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `ModuleNotFoundError: detectron2` | Not installed | Install detectron2 first |
| `ModuleNotFoundError: vitdet` | detectron2 not installed | Install detectron2 before ViTDet |
| `ModuleNotFoundError: hmr2` | ViTDet not installed | Install ViTDet before 4D-Humans |
| `ModuleNotFoundError: phalp` | 4D-Humans not installed | Install 4D-Humans before PHALP |
| Build errors | Missing system packages | `sudo apt-get install build-essential python3-dev` |
| CUDA errors | GPU driver issues | Verify NVIDIA drivers installed |
| Memory errors | Insufficient RAM | Close other apps, use `max_frames=15` |

## Model Downloads

Models are downloaded on first use and cached locally:

- **HMR2:** ~500MB (3D pose model)
- **ViTPose:** ~100MB (keypoint detection)
- **SMPL:** ~50MB (body model)
- **Total:** ~650MB

Cache location: `backend/pose-service/.models/`

## Performance Notes

### With GPU (NVIDIA)
- Per-frame processing: 100-250ms
- Full video (140 frames): 15-35 seconds

### With CPU
- Per-frame processing: 2-5 seconds
- Full video (140 frames): 5-12 minutes

## Frozen Stack Rationale

These versions are frozen because:
1. **Tight coupling** - Each package depends on specific versions of others
2. **Model compatibility** - Models trained with specific library versions
3. **Reproducibility** - Ensures consistent results across environments
4. **Stability** - Newer versions may break compatibility

**Do not upgrade versions without testing.**

## Resources

- detectron2: `~/repos/detectron2/README.md`
- ViTDet: `~/repos/ViTDet/README.md`
- 4D-Humans: `~/repos/4D-Humans/README.md`
- PHALP: `~/repos/PHALP/README.md`
- PyTorch: https://pytorch.org/
- CUDA: https://developer.nvidia.com/cuda-toolkit
