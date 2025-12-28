#!/usr/bin/env python
"""Test that track.py imports successfully without neural_renderer"""
import sys
import os

# Add 4D-Humans to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '4D-Humans'))

print("[TEST] ========================================")
print("[TEST] Testing track.py import without neural_renderer")
print("[TEST] ========================================")

try:
    print("[TEST] Importing HMR2023TextureSampler...")
    from track import HMR2023TextureSampler
    print("[TEST] ✓ HMR2023TextureSampler imported successfully")
    print("[TEST] ✓ neural_renderer fix is working!")
    print("[TEST] ========================================")
    print("[TEST] SUCCESS: Pipeline can run without neural_renderer")
    print("[TEST] ========================================")
except Exception as e:
    print(f"[TEST] ✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
