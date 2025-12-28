#!/usr/bin/env python3
"""
TEST BASH PYTHON: Simplest possible test - can bash run Python?
"""

import subprocess
import os
import time

print("=" * 80)
print("TEST 1: Can bash run Python directly?")
print("=" * 80)

venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python -c "print(\'Hello from Python\')"']
    print(f"Command: bash -c 'source venv && python -c \"print(...)\"'")
    print(f"Timeout: 10 seconds")
    
    start = time.time()
    result = subprocess.run(cmd, timeout=10, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Output: {result.stdout}")
    if result.stderr:
        print(f"Stderr: {result.stderr}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - bash/python is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 80)
print("TEST 2: Can bash run Python with print and flush?")
print("=" * 80)

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python -c "import sys; print(\'Test\', flush=True); sys.stdout.flush()"']
    print(f"Command: bash -c 'source venv && python -c \"print(..., flush=True)\"'")
    print(f"Timeout: 10 seconds")
    
    start = time.time()
    result = subprocess.run(cmd, timeout=10, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Output: {result.stdout}")
    if result.stderr:
        print(f"Stderr: {result.stderr}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - bash/python is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 80)
print("TEST 3: Can bash run track.py with --help?")
print("=" * 80)

track_py_dir = os.path.expanduser('~/pose-service/4D-Humans')

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python track.py --help 2>&1 | head -20']
    print(f"Command: bash -c 'source venv && python track.py --help'")
    print(f"Working dir: {track_py_dir}")
    print(f"Timeout: 15 seconds")
    
    start = time.time()
    result = subprocess.run(cmd, cwd=track_py_dir, timeout=15, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Output (first 500 chars):\n{result.stdout[:500]}")
    if result.stderr:
        print(f"Stderr (first 500 chars):\n{result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - track.py --help is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 80)
print("TEST 4: Can bash run track.py with Hydra flags?")
print("=" * 80)

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. --help 2>&1 | head -20']
    print(f"Command: bash -c 'source venv && python track.py hydra.job.chdir=false ... --help'")
    print(f"Working dir: {track_py_dir}")
    print(f"Timeout: 15 seconds")
    
    start = time.time()
    result = subprocess.run(cmd, cwd=track_py_dir, timeout=15, capture_output=True, text=True)
    elapsed = time.time() - start
    
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Output (first 500 chars):\n{result.stdout[:500]}")
    if result.stderr:
        print(f"Stderr (first 500 chars):\n{result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - track.py with Hydra flags is hanging!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print("\n" + "=" * 80)
print("TESTS COMPLETE")
print("=" * 80)
