#!/usr/bin/env python3
"""
STRICT DEBUG: Test ONLY the Hydra initialization part
This isolates whether Hydra is the hang point
"""

import subprocess
import os
import sys
import time

print("=" * 80)
print("HYDRA-ONLY DEBUG TEST")
print("=" * 80)

# Test 1: Can we even run Python in the venv?
print("\n[TEST 1] Basic Python execution in venv")
venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
track_py_dir = os.path.expanduser('~/pose-service/4D-Humans')

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python --version']
    result = subprocess.run(cmd, timeout=10, capture_output=True, text=True)
    print(f"  ✓ Python version: {result.stdout.strip()}")
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT - Python execution hung!")
    sys.exit(1)
except Exception as e:
    print(f"  ✗ ERROR: {e}")
    sys.exit(1)

# Test 2: Can we import Hydra?
print("\n[TEST 2] Hydra import test")
try:
    cmd = ['bash', '-c', f'source {venv_activate} && python -c "import hydra; print(f\'Hydra {hydra.__version__}\')"']
    result = subprocess.run(cmd, timeout=10, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  ✓ {result.stdout.strip()}")
    else:
        print(f"  ✗ Import failed: {result.stderr}")
        sys.exit(1)
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT - Hydra import hung!")
    sys.exit(1)

# Test 3: Run track.py with --help (no Hydra config needed)
print("\n[TEST 3] track.py --help (basic execution)")
try:
    cmd = ['bash', '-c', f'source {venv_activate} && python track.py --help']
    print(f"  Command: bash -c 'source venv && python track.py --help'")
    print(f"  Working dir: {track_py_dir}")
    print(f"  Timeout: 15 seconds")
    
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=15,
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    
    if result.returncode == 0:
        print(f"  ✓ Completed in {elapsed:.1f}s")
        print(f"  Output (first 200 chars): {result.stdout[:200]}")
    else:
        print(f"  ✗ Failed with exit code {result.returncode}")
        print(f"  stderr: {result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT - track.py --help hung after 15 seconds!")
    print(f"  This suggests Hydra is hanging during initialization")
    sys.exit(1)

# Test 4: Run track.py with Hydra flags ONLY (no video)
print("\n[TEST 4] track.py with Hydra flags (no video)")
try:
    hydra_args = 'hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'
    cmd = ['bash', '-c', f'source {venv_activate} && python track.py {hydra_args} --help']
    print(f"  Command: bash -c 'source venv && python track.py {hydra_args} --help'")
    print(f"  Working dir: {track_py_dir}")
    print(f"  Timeout: 15 seconds")
    
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=15,
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    
    if result.returncode == 0:
        print(f"  ✓ Completed in {elapsed:.1f}s")
        print(f"  Output (first 200 chars): {result.stdout[:200]}")
    else:
        print(f"  ✗ Failed with exit code {result.returncode}")
        print(f"  stderr: {result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT - track.py with Hydra flags hung after 15 seconds!")
    print(f"  Hydra flags are NOT fixing the hang")
    sys.exit(1)

# Test 5: Run track.py with video.source (the actual command)
print("\n[TEST 5] track.py with video.source (actual command)")
test_video = "/tmp/pose-videos/test.mov"
if not os.path.exists(test_video):
    print(f"  ⚠️  Test video not found at {test_video}")
    print(f"  Skipping this test")
else:
    try:
        hydra_args = 'hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'
        cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={test_video} {hydra_args}']
        print(f"  Command: bash -c 'source venv && python track.py video.source=... {hydra_args}'")
        print(f"  Working dir: {track_py_dir}")
        print(f"  Timeout: 30 seconds")
        
        start = time.time()
        result = subprocess.run(
            cmd,
            cwd=track_py_dir,
            timeout=30,
            capture_output=True,
            text=True
        )
        elapsed = time.time() - start
        
        if result.returncode == 0:
            print(f"  ✓ Completed in {elapsed:.1f}s")
        else:
            print(f"  ✗ Failed with exit code {result.returncode}")
            print(f"  stdout (first 500 chars): {result.stdout[:500]}")
            print(f"  stderr (first 500 chars): {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        print(f"  ✗ TIMEOUT - track.py with video hung after 30 seconds!")
        print(f"  This is the actual hang we're seeing")

print("\n" + "=" * 80)
print("HYDRA DEBUG TEST COMPLETE")
print("=" * 80)
