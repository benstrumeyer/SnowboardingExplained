#!/usr/bin/env python3
"""
VERIFY HYDRA FIX: Check if the Flask wrapper has the correct argument order
"""

import os
import re

print("=" * 80)
print("VERIFY HYDRA FIX - Checking Flask Wrapper Command")
print("=" * 80)

flask_wrapper_path = os.path.expanduser('~/pose-service/flask_wrapper_minimal_safe.py')

if not os.path.exists(flask_wrapper_path):
    print(f"\n✗ Flask wrapper not found at: {flask_wrapper_path}")
    print(f"  Trying alternate path...")
    flask_wrapper_path = 'SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py'
    if not os.path.exists(flask_wrapper_path):
        print(f"✗ Flask wrapper not found at: {flask_wrapper_path}")
        exit(1)

print(f"\n✓ Found Flask wrapper at: {flask_wrapper_path}")

with open(flask_wrapper_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all lines with track.py commands
print("\n" + "=" * 80)
print("SEARCHING FOR track.py COMMANDS")
print("=" * 80)

lines = content.split('\n')
found_commands = []

for i, line in enumerate(lines, 1):
    if 'python track.py' in line and 'video.source' in line:
        found_commands.append((i, line))
        print(f"\nLine {i}:")
        print(f"  {line.strip()}")

if not found_commands:
    print("\n✗ No track.py commands found with video.source")
    exit(1)

print(f"\n✓ Found {len(found_commands)} command(s)")

# Analyze each command
print("\n" + "=" * 80)
print("ANALYZING ARGUMENT ORDER")
print("=" * 80)

for line_num, line in found_commands:
    print(f"\nLine {line_num}:")
    
    # Extract the command part
    if 'python track.py' in line:
        # Find the start of the command
        cmd_start = line.find('python track.py')
        cmd_part = line[cmd_start:]
        
        # Find positions of key arguments
        hydra_pos = cmd_part.find('hydra.job.chdir')
        video_pos = cmd_part.find('video.source')
        
        print(f"  Command: {cmd_part[:100]}...")
        print(f"  hydra.job.chdir position: {hydra_pos}")
        print(f"  video.source position: {video_pos}")
        
        if hydra_pos == -1:
            print(f"  ⚠️  No Hydra args found!")
        elif video_pos == -1:
            print(f"  ⚠️  No video.source found!")
        elif hydra_pos < video_pos:
            print(f"  ✓ CORRECT: Hydra args come BEFORE video.source")
            print(f"    Hydra args at position {hydra_pos}")
            print(f"    video.source at position {video_pos}")
        else:
            print(f"  ✗ WRONG: video.source comes BEFORE Hydra args")
            print(f"    video.source at position {video_pos}")
            print(f"    Hydra args at position {hydra_pos}")

# Check track.py for enhanced logging
print("\n" + "=" * 80)
print("CHECKING track.py FOR ENHANCED LOGGING")
print("=" * 80)

track_py_path = os.path.expanduser('~/pose-service/4D-Humans/track.py')
if not os.path.exists(track_py_path):
    track_py_path = 'SnowboardingExplained/backend/pose-service/4D-Humans/track.py'

if os.path.exists(track_py_path):
    print(f"\n✓ Found track.py at: {track_py_path}")
    
    with open(track_py_path, 'r', encoding='utf-8', errors='ignore') as f:
        track_content = f.read()
    
    # Check for enhanced logging
    if '[TRACK.PY]' in track_content:
        print(f"  ✓ Enhanced logging found ([TRACK.PY] markers)")
        
        # Count flush calls
        flush_count = track_content.count('sys.stdout.flush()')
        print(f"  ✓ Found {flush_count} sys.stdout.flush() calls")
        
        if flush_count > 10:
            print(f"  ✓ Sufficient flush calls for debugging")
        else:
            print(f"  ⚠️  Only {flush_count} flush calls (might not be enough)")
    else:
        print(f"  ✗ No enhanced logging found")
else:
    print(f"\n✗ track.py not found at: {track_py_path}")

print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)
