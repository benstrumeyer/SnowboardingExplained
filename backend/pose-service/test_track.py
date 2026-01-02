#!/usr/bin/env python3
"""
Test script to upload a video to the test_track_direct endpoint
"""

import requests
import sys
import os

# Video path from Windows
video_path = r"C:\Users\benja\OneDrive\Desktop\clips\not.mov"

# Convert to WSL path if needed
if video_path.startswith("C:\\"):
    # Convert Windows path to WSL path
    drive = video_path[0].lower()
    rest = video_path[3:].replace("\\", "/")
    wsl_path = f"/mnt/{drive}/{rest}"
    print(f"[TEST] Windows path: {video_path}")
    print(f"[TEST] WSL path: {wsl_path}")
    video_path = wsl_path

if not os.path.exists(video_path):
    print(f"[ERROR] Video not found: {video_path}")
    sys.exit(1)

file_size = os.path.getsize(video_path)
print(f"[TEST] Video file: {video_path}")
print(f"[TEST] File size: {file_size / (1024*1024):.2f} MB")

# Upload to test endpoint
url = "http://localhost:5000/test_track_direct"
print(f"[TEST] Uploading to: {url}")

try:
    with open(video_path, 'rb') as f:
        files = {'video': f}
        data = {'max_frames': '5'}
        
        print("[TEST] Sending request...")
        response = requests.post(url, files=files, data=data, timeout=3600)
        
        print(f"[TEST] Status code: {response.status_code}")
        print(f"[TEST] Response text: {response.text}")
        
        if response.status_code == 404:
            print("[ERROR] Endpoint not found (404). Did you restart the pose service?")
            print("[ERROR] Make sure /test_track_direct endpoint is available")
            sys.exit(1)
        
        try:
            print(f"[TEST] Response JSON:")
            print(response.json())
        except:
            print(f"[TEST] Could not parse JSON response")
        
except Exception as e:
    print(f"[ERROR] {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
