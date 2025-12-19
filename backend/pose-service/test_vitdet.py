#!/usr/bin/env python3
"""
Test ViTDet detection - EXACT as 4D-Humans demo.py
Run this in WSL: python test_vitdet.py
"""
import sys
import os

print("=" * 60)
print("ViTDet Test Script - Exact 4D-Humans Implementation")
print("=" * 60)

# Step 1: Check Python and paths
print(f"\n[1] Python: {sys.executable}")
print(f"[1] Working dir: {os.getcwd()}")

# Step 2: Check PyTorch
print("\n[2] Checking PyTorch...")
try:
    import torch
    print(f"[2] ✓ PyTorch {torch.__version__}")
    print(f"[2] ✓ CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"[2] ✓ CUDA device: {torch.cuda.get_device_name(0)}")
except ImportError as e:
    print(f"[2] ✗ PyTorch not installed: {e}")
    sys.exit(1)

# Step 3: Check detectron2
print("\n[3] Checking detectron2...")
try:
    import detectron2
    print(f"[3] ✓ detectron2 version: {detectron2.__version__}")
    print(f"[3] ✓ detectron2 path: {detectron2.__file__}")
except ImportError as e:
    print(f"[3] ✗ detectron2 not installed: {e}")
    sys.exit(1)

# Step 4: Check LazyConfig (required for ViTDet)
print("\n[4] Checking LazyConfig...")
try:
    from detectron2.config import LazyConfig
    print("[4] ✓ LazyConfig imported successfully")
except ImportError as e:
    print(f"[4] ✗ LazyConfig not available: {e}")
    sys.exit(1)

# Step 5: Check hmr2 module
print("\n[5] Checking hmr2 module...")
hmr2_path = os.path.join(os.path.dirname(__file__), '4D-Humans')
if hmr2_path not in sys.path:
    sys.path.insert(0, hmr2_path)
    print(f"[5] Added to path: {hmr2_path}")

try:
    import hmr2
    print(f"[5] ✓ hmr2 imported from: {hmr2.__file__}")
except ImportError as e:
    print(f"[5] ✗ hmr2 not found: {e}")
    sys.exit(1)

# Step 6: Check ViTDet config file
print("\n[6] Checking ViTDet config file...")
from pathlib import Path
cfg_path = Path(hmr2.__file__).parent / 'configs' / 'cascade_mask_rcnn_vitdet_h_75ep.py'
print(f"[6] Config path: {cfg_path}")
print(f"[6] Config exists: {cfg_path.exists()}")

if not cfg_path.exists():
    print("[6] ✗ ViTDet config file not found!")
    # List what's in the configs folder
    configs_dir = Path(hmr2.__file__).parent / 'configs'
    if configs_dir.exists():
        print(f"[6] Contents of {configs_dir}:")
        for f in configs_dir.iterdir():
            print(f"[6]   - {f.name}")
    sys.exit(1)

# Step 7: Load ViTDet config
print("\n[7] Loading ViTDet config with LazyConfig...")
try:
    detectron2_cfg = LazyConfig.load(str(cfg_path))
    print("[7] ✓ Config loaded successfully")
    print(f"[7] Config type: {type(detectron2_cfg)}")
except Exception as e:
    print(f"[7] ✗ Failed to load config: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 8: Set checkpoint URL
print("\n[8] Setting checkpoint URL...")
checkpoint_url = "https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl"
detectron2_cfg.train.init_checkpoint = checkpoint_url
print(f"[8] ✓ Checkpoint: {checkpoint_url}")

# Step 9: Set score thresholds
print("\n[9] Setting score thresholds...")
try:
    for i in range(3):
        detectron2_cfg.model.roi_heads.box_predictors[i].test_score_thresh = 0.25
    print("[9] ✓ Score thresholds set to 0.25 for all 3 cascade heads")
except Exception as e:
    print(f"[9] ✗ Failed to set thresholds: {e}")
    import traceback
    traceback.print_exc()

# Step 10: Check DefaultPredictor_Lazy
print("\n[10] Checking DefaultPredictor_Lazy...")
try:
    from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
    print("[10] ✓ DefaultPredictor_Lazy imported successfully")
except ImportError as e:
    print(f"[10] ✗ DefaultPredictor_Lazy not found: {e}")
    sys.exit(1)

# Step 11: Create predictor (this downloads the model)
print("\n[11] Creating ViTDet predictor (will download ~700MB model on first run)...")
try:
    detector = DefaultPredictor_Lazy(detectron2_cfg)
    print("[11] ✓ ViTDet predictor created successfully!")
except Exception as e:
    print(f"[11] ✗ Failed to create predictor: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 12: Test inference on dummy image
print("\n[12] Testing inference on dummy image...")
try:
    import numpy as np
    dummy_image = np.zeros((480, 640, 3), dtype=np.uint8)
    det_out = detector(dummy_image)
    det_instances = det_out['instances']
    print(f"[12] ✓ Inference successful!")
    print(f"[12] Total instances detected: {len(det_instances)}")
    
    # Filter for persons
    valid_idx = (det_instances.pred_classes == 0) & (det_instances.scores > 0.5)
    boxes = det_instances.pred_boxes.tensor[valid_idx].cpu().numpy()
    print(f"[12] Persons detected (class 0, score > 0.5): {len(boxes)}")
except Exception as e:
    print(f"[12] ✗ Inference failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ ALL TESTS PASSED - ViTDet is working!")
print("=" * 60)
