#!/usr/bin/env python3
"""
Test script to verify CUDA OOM fix for frames 16-17 and 25-26.

This script:
1. Starts the Flask wrapper in a subprocess
2. Waits for it to initialize
3. Sends test frames to the /pose/hybrid endpoint
4. Monitors for CUDA OOM errors
5. Reports results
"""

import subprocess
import time
import requests
import json
import sys
import os
import signal
import numpy as np
import cv2
import base64
from pathlib import Path

# Configuration
FLASK_HOST = "http://localhost:5000"
FLASK_STARTUP_TIMEOUT = 60  # seconds
TEST_FRAMES = [16, 17, 25, 26]  # Frames that were failing
FRAME_SIZE = (640, 480)

def create_test_frame(frame_number):
    """Create a simple test frame (gradient pattern)."""
    # Create a gradient pattern that changes per frame
    frame = np.zeros((FRAME_SIZE[1], FRAME_SIZE[0], 3), dtype=np.uint8)
    
    # Add some variation based on frame number
    for i in range(FRAME_SIZE[1]):
        frame[i, :] = [
            (i + frame_number * 10) % 256,
            (i + frame_number * 20) % 256,
            (i + frame_number * 30) % 256
        ]
    
    return frame

def encode_frame_to_base64(frame):
    """Encode a frame to base64 for JSON transmission."""
    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

def wait_for_flask(timeout=FLASK_STARTUP_TIMEOUT):
    """Wait for Flask to be ready."""
    print(f"[TEST] Waiting for Flask to start (timeout: {timeout}s)...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{FLASK_HOST}/health", timeout=2)
            if response.status_code == 200:
                print(f"[TEST] ✅ Flask is ready!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        except Exception as e:
            print(f"[TEST] ⚠️  Error checking Flask: {e}")
        
        time.sleep(1)
    
    print(f"[TEST] ❌ Flask did not start within {timeout}s")
    return False

def test_frame(frame_number):
    """Send a test frame to the Flask wrapper."""
    print(f"\n[TEST] Testing frame {frame_number}...")
    
    try:
        # Create test frame
        frame = create_test_frame(frame_number)
        frame_b64 = encode_frame_to_base64(frame)
        
        # Prepare request
        payload = {
            "frame_number": frame_number,
            "image_base64": frame_b64
        }
        
        # Send request
        print(f"[TEST] Sending frame {frame_number} to /pose/hybrid...")
        start_time = time.time()
        
        response = requests.post(
            f"{FLASK_HOST}/pose/hybrid",
            json=payload,
            timeout=120  # 2 minute timeout for processing
        )
        
        elapsed = time.time() - start_time
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            print(f"[TEST] ✅ Frame {frame_number} processed successfully in {elapsed:.1f}s")
            print(f"[TEST]    - Keypoints: {len(data.get('keypoints', []))}")
            print(f"[TEST]    - Mesh vertices: {len(data.get('mesh_vertices_data', []))}")
            print(f"[TEST]    - Processing time: {data.get('processing_time_ms', 0):.1f}ms")
            return True
        else:
            print(f"[TEST] ❌ Frame {frame_number} failed with status {response.status_code}")
            print(f"[TEST]    Response: {response.text[:200]}")
            return False
    
    except requests.exceptions.Timeout:
        print(f"[TEST] ❌ Frame {frame_number} timed out (>120s)")
        return False
    except Exception as e:
        print(f"[TEST] ❌ Frame {frame_number} error: {e}")
        return False

def main():
    """Main test function."""
    print("=" * 60)
    print("[TEST] CUDA OOM Fix Verification")
    print("=" * 60)
    
    # Start Flask wrapper
    print("\n[TEST] Starting Flask wrapper...")
    flask_process = subprocess.Popen(
        ["bash", "-c", "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_minimal_safe.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    print(f"[TEST] Flask process started (PID: {flask_process.pid})")
    
    try:
        # Wait for Flask to be ready
        if not wait_for_flask():
            print("[TEST] ❌ Flask failed to start")
            return False
        
        # Test frames
        print("\n[TEST] Testing frames that were previously failing...")
        results = {}
        
        for frame_num in TEST_FRAMES:
            results[frame_num] = test_frame(frame_num)
            time.sleep(2)  # Wait between frames
        
        # Summary
        print("\n" + "=" * 60)
        print("[TEST] RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        
        for frame_num, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"[TEST] Frame {frame_num}: {status}")
        
        print(f"\n[TEST] Total: {passed}/{total} frames passed")
        
        if passed == total:
            print("[TEST] ✅ CUDA OOM fix verified - all frames processed successfully!")
            return True
        else:
            print(f"[TEST] ❌ {total - passed} frames failed - CUDA OOM fix may not be working")
            return False
    
    finally:
        # Stop Flask
        print("\n[TEST] Stopping Flask wrapper...")
        flask_process.terminate()
        try:
            flask_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            flask_process.kill()
        print("[TEST] Flask stopped")

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
