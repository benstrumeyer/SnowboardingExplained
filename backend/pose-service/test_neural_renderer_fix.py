#!/usr/bin/env python
"""Test that track.py works without neural_renderer"""
import sys
import os

# Add 4D-Humans to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '4D-Humans'))

print("[TEST] Testing neural_renderer fix...")
print("[TEST] Attempting to import HMR2023TextureSampler...")

try:
    from track import HMR2023TextureSampler
    print("[TEST] ✓ HMR2023TextureSampler imported successfully")
    print("[TEST] ✓ neural_renderer fix is working!")
except Exception as e:
    print(f"[TEST] ✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
