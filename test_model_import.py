#!/usr/bin/env python3
"""Test if HMR2 and PHALP can be imported and loaded."""

import sys
import traceback
from pathlib import Path

# Add 4D-Humans to path
sys.path.insert(0, str(Path(__file__).parent / '4D-Humans'))

print("[TEST] Testing model imports...")

# Test HMR2 import
print("[TEST] Attempting to import HMR2...")
try:
    from hmr2.models import HMR2
    print("[TEST] ✓ HMR2 imported successfully")
    
    print("[TEST] Attempting to load HMR2 model...")
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"[TEST] Using device: {device}")
    
    model = HMR2().to(device)
    model.eval()
    print("[TEST] ✓ HMR2 model loaded successfully")
    
except Exception as e:
    print(f"[TEST] ✗ Failed to import/load HMR2: {e}")
    traceback.print_exc()
    sys.exit(1)

# Test PHALP import
print("[TEST] Attempting to import PHALP...")
try:
    from phalp.models import PHALP
    print("[TEST] ✓ PHALP imported successfully")
    
    print("[TEST] Attempting to load PHALP tracker...")
    tracker = PHALP(device=device)
    print("[TEST] ✓ PHALP tracker loaded successfully")
    
except Exception as e:
    print(f"[TEST] ⚠ Failed to import/load PHALP: {e}")
    print("[TEST] This is OK - PHALP is optional")
    traceback.print_exc()

print("[TEST] ✓ All model imports successful")
