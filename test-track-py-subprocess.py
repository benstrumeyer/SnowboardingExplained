#!/usr/bin/env python3
"""
TEST: Exact subprocess call that Flask wrapper uses
This test mimics the exact subprocess.run call from flask_wrapper_minimal_safe.py
"""

import subprocess
import os
import time

# Simulate Flask wrapper environment
POSE_SERVICE_PATH = os.environ.get('POSE_SERVICE_PATH', '/home/ben/pose-service')

print("=" * 80)
print("TEST: Exact Flask Wrapper Subprocess Call")
print("=" * 80)
print(f"POSE_SERVICE_PATH: {POSE_SERVICE_PATH}")
print()

# Build paths exactly as Flask wrapper does
track_py_dir_wsl = POSE_SERVICE_PATH + '/4D-Humans'
venv_activate_wsl = POSE_SERVICE_PATH + '/venv/bin/activate'

print(f"track_py_dir_wsl: {track_py_dir_wsl}")
print(f"venv_activate_wsl: {venv_activate_wsl}")
print()

# Build command exactly as Flask wrapper does
video_path = "/tmp/test-video.mov"
cmd = ['bash', '-c', f'source {venv_activate_wsl} && cd {track_py_dir_wsl} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']

print("=" * 80)
print("TEST 1: Without shell=True (BROKEN)")
print("=" * 80)
print(f"Command: {cmd}")
print(f"shell=True: False")
print()

try:
    print("Calling subprocess.run WITHOUT shell=True...")
    start = time.time()
    result = subprocess.run(
        cmd,
        timeout=10,
        capture_output=True,
        text=True,
        shell=False  # BROKEN - this is the problem
    )
    elapsed = time.time() - start
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Stdout: {result.stdout[:500]}")
    print(f"Stderr: {result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - subprocess hung for 10 seconds!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()
print("=" * 80)
print("TEST 2: With shell=True (FIXED)")
print("=" * 80)
print(f"Command: {cmd[2]}")  # cmd[2] is the bash script
print(f"shell=True: True")
print()

try:
    print("Calling subprocess.run WITH shell=True...")
    start = time.time()
    result = subprocess.run(
        cmd[2],  # Pass the bash script string
        timeout=10,
        capture_output=True,
        text=True,
        shell=True  # FIXED - this is the solution
    )
    elapsed = time.time() - start
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    if result.stdout:
        print(f"Stdout (first 500 chars):\n{result.stdout[:500]}")
    if result.stderr:
        print(f"Stderr (first 500 chars):\n{result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - subprocess hung for 10 seconds!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()
print("=" * 80)
print("TEST 3: Simpler test - just venv activation")
print("=" * 80)

try:
    print("Testing venv activation with shell=True...")
    cmd_simple = f'source {venv_activate_wsl} && python -c "import sys; print(f\'Python: {{sys.version}}\')"'
    start = time.time()
    result = subprocess.run(
        cmd_simple,
        timeout=10,
        capture_output=True,
        text=True,
        shell=True
    )
    elapsed = time.time() - start
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Output: {result.stdout}")
    if result.stderr:
        print(f"Stderr: {result.stderr}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - subprocess hung!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()
print("=" * 80)
print("TEST 4: Test track.py --help with shell=True")
print("=" * 80)

try:
    print("Testing track.py --help with shell=True...")
    cmd_help = f'source {venv_activate_wsl} && cd {track_py_dir_wsl} && python track.py --help 2>&1 | head -20'
    start = time.time()
    result = subprocess.run(
        cmd_help,
        timeout=15,
        capture_output=True,
        text=True,
        shell=True
    )
    elapsed = time.time() - start
    print(f"✓ Completed in {elapsed:.1f}s")
    print(f"Exit code: {result.returncode}")
    print(f"Output (first 500 chars):\n{result.stdout[:500]}")
    if result.stderr:
        print(f"Stderr (first 500 chars):\n{result.stderr[:500]}")
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - subprocess hung!")
except Exception as e:
    print(f"✗ ERROR: {e}")

print()
print("=" * 80)
print("SUMMARY")
print("=" * 80)
print("✓ Test 1 should timeout or error (without shell=True)")
print("✓ Test 2 should complete successfully (with shell=True)")
print("✓ Test 3 should show Python version (venv activation works)")
print("✓ Test 4 should show track.py help (track.py is callable)")
print()
print("If all tests pass, the Flask wrapper subprocess fix is correct!")
print("=" * 80)
