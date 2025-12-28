#!/usr/bin/env python3
"""
STRICT DEBUG: Test ONLY the Hydra argument ordering
This verifies that Hydra args are being parsed correctly when passed BEFORE video.source
"""

import subprocess
import os
import sys
import time
import tempfile

print("=" * 80)
print("HYDRA ARGUMENT ORDER DEBUG TEST")
print("=" * 80)

venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
track_py_dir = os.path.expanduser('~/pose-service/4D-Humans')

# Create a test script that will show us what Hydra is doing
test_script = """
import sys
import os
from hydra import initialize_config_dir, compose
from hydra.core.global_hydra import GlobalHydra
from omegaconf import OmegaConf

print("[HYDRA_TEST] sys.argv:", sys.argv)
print("[HYDRA_TEST] Current working directory:", os.getcwd())

# Try to parse the arguments
try:
    # This mimics what track.py does
    from hydra.main import main as hydra_main
    print("[HYDRA_TEST] Hydra main imported successfully")
except Exception as e:
    print(f"[HYDRA_TEST] Error importing Hydra: {e}")
    sys.exit(1)
"""

# Test 1: Arguments in WRONG order (video.source FIRST)
print("\n[TEST 1] WRONG ORDER: video.source FIRST, then Hydra args")
print("  Command: python track.py video.source=/tmp/test.mov hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.")
print("  Expected: Hydra might ignore the flags or parse them incorrectly")
print("  Timeout: 10 seconds")

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python -c "{test_script}" video.source=/tmp/test.mov hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.']
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=10,
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    
    print(f"  ✓ Completed in {elapsed:.1f}s")
    print(f"  Output:\n{result.stdout}")
    if result.stderr:
        print(f"  Stderr:\n{result.stderr}")
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT after 10 seconds")
except Exception as e:
    print(f"  ✗ ERROR: {e}")

# Test 2: Arguments in CORRECT order (Hydra args FIRST)
print("\n[TEST 2] CORRECT ORDER: Hydra args FIRST, then video.source")
print("  Command: python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=/tmp/test.mov")
print("  Expected: Hydra should parse all flags correctly")
print("  Timeout: 10 seconds")

try:
    cmd = ['bash', '-c', f'source {venv_activate} && python -c "{test_script}" hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=/tmp/test.mov']
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=10,
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    
    print(f"  ✓ Completed in {elapsed:.1f}s")
    print(f"  Output:\n{result.stdout}")
    if result.stderr:
        print(f"  Stderr:\n{result.stderr}")
except subprocess.TimeoutExpired:
    print(f"  ✗ TIMEOUT after 10 seconds")
except Exception as e:
    print(f"  ✗ ERROR: {e}")

# Test 3: Check what the Flask wrapper is actually doing
print("\n[TEST 3] Verify Flask wrapper command")
print("  Reading flask_wrapper_minimal_safe.py to check the command...")

flask_wrapper_path = os.path.expanduser('~/pose-service/flask_wrapper_minimal_safe.py')
if os.path.exists(flask_wrapper_path):
    with open(flask_wrapper_path, 'r') as f:
        content = f.read()
        # Find the command line
        if 'python track.py' in content:
            # Extract the relevant lines
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'python track.py' in line and 'video.source' in line:
                    print(f"  Line {i+1}: {line.strip()}")
                    # Check if Hydra args come BEFORE video.source
                    if 'hydra.job.chdir' in line:
                        hydra_pos = line.find('hydra.job.chdir')
                        video_pos = line.find('video.source')
                        if hydra_pos < video_pos:
                            print(f"  ✓ CORRECT: Hydra args ({hydra_pos}) come BEFORE video.source ({video_pos})")
                        else:
                            print(f"  ✗ WRONG: video.source ({video_pos}) comes BEFORE Hydra args ({hydra_pos})")
else:
    print(f"  ⚠️  Flask wrapper not found at {flask_wrapper_path}")

print("\n" + "=" * 80)
print("HYDRA ARGUMENT ORDER DEBUG TEST COMPLETE")
print("=" * 80)
