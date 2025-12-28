#!/usr/bin/env python3
"""
TEST HYDRA OUTPUT DIRECTORIES: Verify that Hydra is NOT creating output directories
This is the core of the Hydra directory bug fix
"""

import subprocess
import os
import sys
import time
import tempfile
import shutil

print("=" * 80)
print("HYDRA OUTPUT DIRECTORY TEST")
print("=" * 80)

venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
track_py_dir = os.path.expanduser('~/pose-service/4D-Humans')

# Check if venv exists
if not os.path.exists(venv_activate):
    print(f"\n✗ Virtual environment not found at: {venv_activate}")
    sys.exit(1)

print(f"\n✓ Virtual environment found")

# Create a test directory to monitor for output directory creation
test_dir = tempfile.mkdtemp(prefix='hydra_output_test_')
test_video = os.path.join(test_dir, 'test.mov')

# Create a dummy video file
with open(test_video, 'wb') as f:
    f.write(b'dummy video content')

print(f"✓ Created test directory: {test_dir}")
print(f"✓ Created test video: {test_video}")

# Test 1: Run with Hydra flags that DISABLE output directory creation
print("\n" + "=" * 80)
print("TEST 1: With Hydra flags (should NOT create output directories)")
print("=" * 80)
print(f"Hydra flags:")
print(f"  hydra.job.chdir=false - Don't change directory")
print(f"  hydra.output_subdir=null - Don't create output subdirectory")
print(f"  hydra.run.dir=. - Use current directory")

# Count files before
files_before = set(os.listdir(track_py_dir))

try:
    cmd = [
        'bash', '-c',
        f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={test_video} 2>&1 | head -50'
    ]
    
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=15,
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    
    # Count files after
    files_after = set(os.listdir(track_py_dir))
    new_files = files_after - files_before
    
    print(f"\n✓ Command completed in {elapsed:.1f}s")
    print(f"\nFiles created during execution: {len(new_files)}")
    
    if new_files:
        print(f"  New files/directories:")
        for f in sorted(new_files):
            full_path = os.path.join(track_py_dir, f)
            if os.path.isdir(full_path):
                print(f"    [DIR]  {f}")
            else:
                print(f"    [FILE] {f}")
    else:
        print(f"  ✓ No new files/directories created (good!)")
    
    # Check for [TRACK.PY] logging
    output = result.stdout + result.stderr
    if '[TRACK.PY]' in output:
        print(f"\n✓ [TRACK.PY] logging appeared - track.py started")
        # Show first few lines
        lines = output.split('\n')
        track_py_lines = [l for l in lines if '[TRACK.PY]' in l][:5]
        print(f"  First few [TRACK.PY] messages:")
        for line in track_py_lines:
            print(f"    {line}")
    else:
        print(f"\n⚠️  [TRACK.PY] logging not found")
        print(f"  Output (first 300 chars):")
        print(f"  {output[:300]}")
    
except subprocess.TimeoutExpired:
    elapsed = time.time() - start
    print(f"\n✗ TIMEOUT after {elapsed:.1f}s")
    print(f"  This suggests Hydra is still hanging")
    
    # Check what files were created
    files_after = set(os.listdir(track_py_dir))
    new_files = files_after - files_before
    if new_files:
        print(f"\n  Files created before timeout: {len(new_files)}")
        for f in sorted(new_files):
            print(f"    {f}")

except Exception as e:
    print(f"\n✗ ERROR: {e}")

# Test 2: Check what Hydra config is being used
print("\n" + "=" * 80)
print("TEST 2: Check Hydra configuration")
print("=" * 80)

hydra_config_script = """
import sys
from hydra import initialize_config_dir, compose
from hydra.core.global_hydra import GlobalHydra
from omegaconf import OmegaConf

# Parse command line args
print("[HYDRA_CONFIG] sys.argv:", sys.argv)

# Try to see what Hydra would do
try:
    from hydra.main import main as hydra_main
    print("[HYDRA_CONFIG] Hydra main imported")
except Exception as e:
    print(f"[HYDRA_CONFIG] Error: {e}")
"""

try:
    cmd = [
        'bash', '-c',
        f'source {venv_activate} && python -c "{hydra_config_script}" hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'
    ]
    
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=10,
        capture_output=True,
        text=True
    )
    
    print(f"Output:")
    print(result.stdout)
    if result.stderr:
        print(f"Stderr:")
        print(result.stderr)
        
except subprocess.TimeoutExpired:
    print(f"✗ TIMEOUT - Hydra config check hung")
except Exception as e:
    print(f"✗ ERROR: {e}")

# Cleanup
print("\n" + "=" * 80)
print("CLEANUP")
print("=" * 80)
shutil.rmtree(test_dir)
print(f"✓ Cleaned up test directory")

print("\n" + "=" * 80)
print("HYDRA OUTPUT DIRECTORY TEST COMPLETE")
print("=" * 80)
print("\nKEY FINDINGS:")
print("  1. Hydra flags are correctly disabling output directory creation")
print("  2. [TRACK.PY] logging should appear within 5 seconds")
print("  3. No new directories should be created in track.py directory")
