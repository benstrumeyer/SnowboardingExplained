#!/usr/bin/env python3
"""
TEST WSL PATHS FIX: Verify that using WSL paths in bash commands works
"""

import subprocess
import os
import time

# Simulate what the Flask wrapper does
POSE_SERVICE_PATH = os.environ.get('POSE_SERVICE_PATH', '/home/ben/pose-service')

print("=" * 80)
print("TEST: Using WSL paths with bash subprocess")
print("=" * 80)
print(f"POSE_SERVICE_PATH: {POSE_SERVICE_PATH}")
print()

# Build WSL paths (these should work in bash)
track_py_dir_wsl = POSE_SERVICE_PATH + '/4D-Humans'
venv_activate_wsl = POSE_SERVICE_PATH + '/venv/bin/activate'

print(f"WSL paths:")
print(f"  track_py_dir_wsl: {track_py_dir_wsl}")
print(f"  venv_activate_wsl: {venv_activate_wsl}")
print()

# Test 1: Can bash find the venv?
print("=" * 80)
print("TEST 1: Can bash source the venv?")
print("=" * 80)

try:
    cmd = ['bash', '-c', f'source {venv_activate_wsl} && python -c "import sys; print(f\'Python: {{sys.version}}\')"']
    print(f"Command: bash -c 'source {venv_activate_wsl} && python -c ...'")
    print(f"Timeout: 10 seconds")
    print()
    
    start = time.time()
    result = subprocess.run(cmd, timeout=10, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    if result.returncode == 0:
        print(f"Output: {result.stdout.strip()}")
    else:
        print(f"Stderr: {result.stderr}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - bash/python is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()

# Test 2: Can bash cd to track.py dir and run it?
print("=" * 80)
print("TEST 2: Can bash cd to track.py dir and run --help?")
print("=" * 80)

try:
    cmd = ['bash', '-c', f'source {venv_activate_wsl} && cd {track_py_dir_wsl} && python track.py --help 2>&1 | head -20']
    print(f"Command: bash -c 'source ... && cd {track_py_dir_wsl} && python track.py --help'")
    print(f"Timeout: 15 seconds")
    print()
    
    start = time.time()
    result = subprocess.run(cmd, timeout=15, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    if result.returncode == 0:
        print(f"Output (first 500 chars):\n{result.stdout[:500]}")
    else:
        print(f"Stderr (first 500 chars):\n{result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - track.py --help is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()

# Test 3: Can bash run track.py with Hydra flags?
print("=" * 80)
print("TEST 3: Can bash run track.py with Hydra flags?")
print("=" * 80)

try:
    cmd = ['bash', '-c', f'source {venv_activate_wsl} && cd {track_py_dir_wsl} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. --help 2>&1 | head -20']
    print(f"Command: bash -c 'source ... && cd ... && python track.py hydra.job.chdir=false ... --help'")
    print(f"Timeout: 15 seconds")
    print()
    
    start = time.time()
    result = subprocess.run(cmd, timeout=15, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    if result.returncode == 0:
        print(f"Output (first 500 chars):\n{result.stdout[:500]}")
    else:
        print(f"Stderr (first 500 chars):\n{result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - track.py with Hydra flags is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()
print("=" * 80)
print("TESTS COMPLETE")
print("=" * 80)
