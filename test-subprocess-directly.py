#!/usr/bin/env python3
"""
Test subprocess execution directly to diagnose the hang issue.
This will help us understand if the problem is with:
1. The bash command
2. The venv activation
3. The track.py execution
"""

import subprocess
import os
import sys
import time

print("=" * 60)
print("SUBPROCESS DIAGNOSTIC TEST")
print("=" * 60)

# Test 1: Check if venv exists
venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
print(f"\n[TEST 1] Checking venv path: {venv_activate}")
print(f"  Exists: {os.path.exists(venv_activate)}")

# Test 2: Check if bash exists
print(f"\n[TEST 2] Checking bash availability")
result = subprocess.run(['which', 'bash'], capture_output=True, text=True)
print(f"  bash location: {result.stdout.strip()}")
print(f"  Return code: {result.returncode}")

# Test 3: Try a simple bash command
print(f"\n[TEST 3] Testing simple bash command")
try:
    result = subprocess.run(
        ['bash', '-c', 'echo "Hello from bash"'],
        timeout=5,
        capture_output=True,
        text=True
    )
    print(f"  stdout: {result.stdout.strip()}")
    print(f"  stderr: {result.stderr.strip()}")
    print(f"  Return code: {result.returncode}")
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT - bash command hung!")
except Exception as e:
    print(f"  ✗ ERROR: {e}")

# Test 4: Try venv activation
print(f"\n[TEST 4] Testing venv activation")
if os.path.exists(venv_activate):
    try:
        cmd = f'source {venv_activate} && python --version'
        print(f"  Command: bash -c '{cmd}'")
        result = subprocess.run(
            ['bash', '-c', cmd],
            timeout=10,
            capture_output=True,
            text=True
        )
        print(f"  stdout: {result.stdout.strip()}")
        print(f"  stderr: {result.stderr.strip()}")
        print(f"  Return code: {result.returncode}")
    except subprocess.TimeoutExpired:
        print(f"  ✗ TIMEOUT - venv activation hung!")
    except Exception as e:
        print(f"  ✗ ERROR: {e}")
else:
    print(f"  ✗ Venv not found at {venv_activate}")

# Test 5: Try running track.py with venv
print(f"\n[TEST 5] Testing track.py execution with venv")
track_py_dir = os.path.expanduser('~/pose-service/4D-Humans')
if os.path.exists(track_py_dir):
    if os.path.exists(venv_activate):
        try:
            cmd = f'source {venv_activate} && python track.py --help'
            print(f"  Working dir: {track_py_dir}")
            print(f"  Command: bash -c '{cmd}'")
            print(f"  Timeout: 15 seconds")
            print(f"  Starting subprocess...")
            
            start = time.time()
            result = subprocess.run(
                ['bash', '-c', cmd],
                cwd=track_py_dir,
                timeout=15,
                capture_output=True,
                text=True
            )
            elapsed = time.time() - start
            
            print(f"  ✓ Completed in {elapsed:.1f}s")
            print(f"  stdout length: {len(result.stdout)} chars")
            print(f"  stderr length: {len(result.stderr)} chars")
            print(f"  Return code: {result.returncode}")
            
            if result.stdout:
                print(f"  stdout (first 500 chars):\n{result.stdout[:500]}")
            if result.stderr:
                print(f"  stderr (first 500 chars):\n{result.stderr[:500]}")
                
        except subprocess.TimeoutExpired:
            print(f"  ✗ TIMEOUT - track.py execution hung after 15 seconds!")
            print(f"  This suggests track.py is hanging during initialization")
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
    else:
        print(f"  ✗ Venv not found")
else:
    print(f"  ✗ track.py directory not found at {track_py_dir}")

print("\n" + "=" * 60)
print("DIAGNOSTIC TEST COMPLETE")
print("=" * 60)
