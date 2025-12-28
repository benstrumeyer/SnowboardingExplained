#!/usr/bin/env python3
"""
Direct test of track.py to diagnose startup issues.
This script tests if track.py can even start without crashing.
"""

import subprocess
import sys
import os
import time

# Test 1: Check if Python can import track.py
print("=" * 60)
print("TEST 1: Check Python imports")
print("=" * 60)

track_py_dir = os.path.expanduser("~/pose-service/4D-Humans")
print(f"Working directory: {track_py_dir}")
print(f"track.py exists: {os.path.exists(os.path.join(track_py_dir, 'track.py'))}")

# Test 2: Try to run track.py with a test video
print("\n" + "=" * 60)
print("TEST 2: Run track.py with timeout")
print("=" * 60)

# Create a dummy test video path (doesn't need to exist for import test)
test_video = "/tmp/test.mov"

cmd = ['python', 'track.py', f'video.source={test_video}']
print(f"Command: {' '.join(cmd)}")
print(f"Working directory: {track_py_dir}")
print(f"Timeout: 10 seconds")
print()

start_time = time.time()
try:
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        capture_output=True,
        text=True,
        timeout=10
    )
    elapsed = time.time() - start_time
    
    print(f"✓ Process completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print()
    
    print("STDOUT:")
    print("-" * 60)
    print(result.stdout if result.stdout else "(empty)")
    print("-" * 60)
    print()
    
    print("STDERR:")
    print("-" * 60)
    print(result.stderr if result.stderr else "(empty)")
    print("-" * 60)
    
except subprocess.TimeoutExpired as e:
    elapsed = time.time() - start_time
    print(f"✗ Process timed out after {elapsed:.1f}s")
    print()
    
    if e.stdout:
        print("STDOUT (partial):")
        print("-" * 60)
        print(e.stdout[:1000])
        print("-" * 60)
        print()
    
    if e.stderr:
        print("STDERR (partial):")
        print("-" * 60)
        print(e.stderr[:1000])
        print("-" * 60)
    
except Exception as e:
    print(f"✗ Error: {e}")
    print(f"Error type: {type(e).__name__}")

# Test 3: Check if imports work
print("\n" + "=" * 60)
print("TEST 3: Check individual imports")
print("=" * 60)

sys.path.insert(0, track_py_dir)

imports_to_test = [
    ("warnings", "import warnings"),
    ("dataclasses", "from dataclasses import dataclass"),
    ("pathlib", "from pathlib import Path"),
    ("torch", "import torch"),
    ("numpy", "import numpy as np"),
    ("hydra", "import hydra"),
    ("omegaconf", "from omegaconf import DictConfig"),
    ("phalp", "from phalp.trackers.PHALP import PHALP"),
    ("hmr2", "from hmr2.models import load_hmr2"),
]

for name, import_stmt in imports_to_test:
    try:
        exec(import_stmt)
        print(f"✓ {name}")
    except Exception as e:
        print(f"✗ {name}: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
