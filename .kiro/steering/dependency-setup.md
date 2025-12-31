# Dependency Setup

**Version:** 2.0  
**Last Updated:** 2025-12-31  
**Status:** MVP - Local Development

## Overview

Frozen ML stack cloned locally in `~/repos/`. Must install in specific order.

## Installation Order (Critical)

```bash
cd ~/repos

# 1. detectron2 (base framework)
cd detectron2 && pip install -e .

# 2. ViTDet (depends on detectron2)
cd ../ViTDet && pip install -e .

# 3. 4D-Humans (pose estimation)
cd ../4D-Humans && pip install -e .

# 4. PHALP (temporal tracking)
cd ../PHALP && pip install -e .

# 5. Pose service dependencies
cd ../SnowboardingExplained/backend/pose-service
pip install -r requirements.txt
```

## Why This Order?

| Package | Depends On | Purpose |
|---------|-----------|---------|
| detectron2 | - | Detection framework (base) |
| ViTDet | detectron2 | Person detection |
| 4D-Humans | ViTDet | 3D pose estimation |
| PHALP | 4D-Humans | Temporal tracking |
| Pose Service | All above | Flask server |

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

## Troubleshooting

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: detectron2` | Install detectron2 first |
| `ModuleNotFoundError: vitdet` | Install ViTDet after detectron2 |
| Build errors | `sudo apt-get install build-essential python3-dev` |
| Model download fails | Check internet, try again |
| Memory issues | Close other apps, use `max_frames=15` |

## Virtual Environment

```bash
cd backend/pose-service
python3 -m venv venv
source venv/bin/activate

# Then install all dependencies
```

## Requirements

- **Memory:** ~8GB minimum
- **Disk:** ~10GB for models
- **Python:** 3.10+
- **PyTorch:** 2.2.0+

## GPU Support (Optional)

```bash
# Install CUDA toolkit
sudo apt-get install -y nvidia-cuda-toolkit

# Verify
python -c "import torch; print(torch.cuda.is_available())"
```

## Resources

- detectron2: `~/repos/detectron2/README.md`
- ViTDet: `~/repos/ViTDet/README.md`
- 4D-Humans: `~/repos/4D-Humans/README.md`
- PHALP: `~/repos/PHALP/README.md`
