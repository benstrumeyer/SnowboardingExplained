#!/usr/bin/env python3
"""
Test script to verify pose service startup without crashing.

Run this to test if the models load correctly before starting the full service.
"""

import sys
import os
import time

# Set environment variables BEFORE imports (same as app.py)
os.environ['CUDA_LAUNCH_BLOCKING'] = '1'
os.environ['TORCH_HOME'] = os.path.expanduser('~/.cache/torch')
os.environ['FVCORE_CACHE'] = os.path.expanduser('~/.cache/fvcore')
os.environ['DETECTRON2_DATASETS'] = os.path.expanduser('~/.cache/detectron2')

print("=" * 70)
print("POSE SERVICE STARTUP TEST")
print("=" * 70)
print(f"Python: {sys.executable}")
print(f"Version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print("=" * 70)

try:
    print("\n[TEST] Importing hybrid detector...")
    from hybrid_pose_detector import get_hybrid_detector
    print("[TEST] ✓ Import successful")
    
    print("\n[TEST] Getting detector instance...")
    detector = get_hybrid_detector()
    print("[TEST] ✓ Detector instance created")
    
    print("\n[TEST] Loading HMR2 model...")
    start = time.time()
    detector._load_hmr2()
    hmr2_time = time.time() - start
    print(f"[TEST] ✓ HMR2 loaded in {hmr2_time:.1f}s")
    print(f"[TEST] HMR2 ready: {detector.model_loaded}")
    
    print("\n[TEST] Loading ViTDet model (this may take a minute)...")
    start = time.time()
    vitdet = detector._load_vitdet()
    vitdet_time = time.time() - start
    print(f"[TEST] ✓ ViTDet load attempt completed in {vitdet_time:.1f}s")
    print(f"[TEST] ViTDet loaded: {vitdet is not None}")
    
    print("\n" + "=" * 70)
    print("SUCCESS: All models loaded without crashing!")
    print("=" * 70)
    print(f"HMR2: {detector.model_loaded}")
    print(f"ViTDet: {detector.vitdet_loaded}")
    print(f"Total time: {hmr2_time + vitdet_time:.1f}s")
    print("=" * 70)
    
except Exception as e:
    print("\n" + "=" * 70)
    print("ERROR: Startup test failed!")
    print("=" * 70)
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    print("=" * 70)
    sys.exit(1)
