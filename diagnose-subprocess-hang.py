#!/usr/bin/env python3
"""
DIAGNOSE SUBPROCESS HANG: Find out what's happening when track.py is called
This runs the EXACT command from Flask and captures all output
"""

import subprocess
import os
import sys
import time
import tempfile

print("=" * 80)
print("SUBPROCESS HANG DIAGNOSIS")
print("=" * 80)

venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
track_py_dir = os.path.expanduser('~/pose-service/4D-Humans')

# Create a test video
test_video_dir = tempfile.mkdtemp(prefix='diag_')
test_video = os.path.join(test_video_dir, 'test.mov')
with open(test_video, 'wb') as f:
    f.write(b'dummy video')

print(f"\n✓ Test video: {test_video}")
print(f"✓ Track.py dir: {track_py_dir}")
print(f"✓ Venv: {venv_activate}")

# Run the EXACT command from Flask wrapper
print("\n" + "=" * 80)
print("RUNNING EXACT FLASK COMMAND")
print("=" * 80)

cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={test_video}']

print(f"\nCommand:")
print(f"  bash -c 'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={test_video}'")
print(f"\nWorking directory: {track_py_dir}")
print(f"Timeout: 30 seconds")
print(f"\nStarting subprocess...")

try:
    start = time.time()
    result = subprocess.run(
        cmd,
        cwd=track_py_dir,
        timeout=30,
        capture_output=True,
        text=True
    )
    elapsed = time.time() - start
    
    print(f"\n✓ Subprocess completed in {elapsed:.1f}s")
    print(f"\nExit code: {result.returncode}")
    print(f"Stdout length: {len(result.stdout)} chars")
    print(f"Stderr length: {len(result.stderr)} chars")
    
    print(f"\n" + "=" * 80)
    print("STDOUT OUTPUT")
    print("=" * 80)
    if result.stdout:
        print(result.stdout)
    else:
        print("(empty)")
    
    print(f"\n" + "=" * 80)
    print("STDERR OUTPUT")
    print("=" * 80)
    if result.stderr:
        print(result.stderr)
    else:
        print("(empty)")
    
    # Check for [TRACK.PY] logging
    combined = result.stdout + result.stderr
    if '[TRACK.PY]' in combined:
        print(f"\n✓ [TRACK.PY] logging found!")
        lines = combined.split('\n')
        track_lines = [l for l in lines if '[TRACK.PY]' in l]
        print(f"  Found {len(track_lines)} [TRACK.PY] messages")
        for line in track_lines[:10]:
            print(f"    {line}")
    else:
        print(f"\n✗ NO [TRACK.PY] logging found - track.py didn't start!")
    
except subprocess.TimeoutExpired:
    elapsed = time.time() - start
    print(f"\n✗ TIMEOUT after {elapsed:.1f}s")
    print(f"  Subprocess is hanging - no output received")
    print(f"\n  This means:")
    print(f"    1. Python is not starting")
    print(f"    2. Venv activation is failing")
    print(f"    3. Hydra is hanging before printing anything")
    print(f"    4. track.py is not being executed")

except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()

# Cleanup
import shutil
shutil.rmtree(test_video_dir)

print("\n" + "=" * 80)
print("DIAGNOSIS COMPLETE")
print("=" * 80)
