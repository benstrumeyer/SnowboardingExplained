#!/usr/bin/env python3
"""Test script to verify Flask wrapper integration with 4D-Humans + PHALP."""

import sys
import time
import base64
import requests
import numpy as np
from PIL import Image
import io

# Configuration
FLASK_URL = "http://localhost:5000"
HEALTH_ENDPOINT = f"{FLASK_URL}/health"
POSE_ENDPOINT = f"{FLASK_URL}/pose/hybrid"

def create_test_image(width=512, height=512):
    """Create a simple test image."""
    # Create a random RGB image
    image_array = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    image = Image.fromarray(image_array, 'RGB')
    return image

def image_to_base64(image):
    """Convert PIL image to base64 string."""
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    image_data = buffer.getvalue()
    return base64.b64encode(image_data).decode('utf-8')

def test_health_endpoint():
    """Test the health endpoint."""
    print("\n[TEST] Testing health endpoint...")
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=10)
        print(f"[TEST] Status code: {response.status_code}")
        data = response.json()
        print(f"[TEST] Response: {data}")
        
        if response.status_code == 200:
            print("[TEST] ✓ Health endpoint working")
            return True
        else:
            print("[TEST] ✗ Health endpoint returned error")
            return False
    except Exception as e:
        print(f"[TEST] ✗ Health endpoint failed: {e}")
        return False

def test_pose_endpoint():
    """Test the pose endpoint with a test image."""
    print("\n[TEST] Testing pose endpoint...")
    try:
        # Create test image
        print("[TEST] Creating test image...")
        test_image = create_test_image()
        image_base64 = image_to_base64(test_image)
        
        # Prepare request
        payload = {
            'image_base64': image_base64,
            'frame_number': 0
        }
        
        print("[TEST] Sending pose request...")
        start_time = time.time()
        response = requests.post(POSE_ENDPOINT, json=payload, timeout=60)
        elapsed = time.time() - start_time
        
        print(f"[TEST] Status code: {response.status_code}")
        print(f"[TEST] Response time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            print(f"[TEST] Frame number: {data.get('frame_number')}")
            print(f"[TEST] Has 3D: {data.get('has_3d')}")
            print(f"[TEST] Processing time: {data.get('processing_time_ms'):.2f}ms")
            print(f"[TEST] Keypoints count: {len(data.get('keypoints', []))}")
            print("[TEST] ✓ Pose endpoint working")
            return True
        else:
            print(f"[TEST] ✗ Pose endpoint error: {response.text}")
            return False
    except Exception as e:
        print(f"[TEST] ✗ Pose endpoint failed: {e}")
        return False

def test_multiple_frames():
    """Test processing multiple frames."""
    print("\n[TEST] Testing multiple frames...")
    try:
        num_frames = 3
        results = []
        
        for i in range(num_frames):
            print(f"[TEST] Processing frame {i+1}/{num_frames}...")
            test_image = create_test_image()
            image_base64 = image_to_base64(test_image)
            
            payload = {
                'image_base64': image_base64,
                'frame_number': i
            }
            
            start_time = time.time()
            response = requests.post(POSE_ENDPOINT, json=payload, timeout=60)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                results.append({
                    'frame': i,
                    'time': elapsed,
                    'keypoints': len(data.get('keypoints', []))
                })
                print(f"[TEST] ✓ Frame {i}: {elapsed:.2f}s, {len(data.get('keypoints', []))} keypoints")
            else:
                print(f"[TEST] ✗ Frame {i} failed: {response.status_code}")
                return False
        
        print(f"\n[TEST] ✓ All {num_frames} frames processed successfully")
        avg_time = np.mean([r['time'] for r in results])
        print(f"[TEST] Average processing time: {avg_time:.2f}s per frame")
        return True
    except Exception as e:
        print(f"[TEST] ✗ Multiple frames test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("4D-Humans Flask Wrapper Integration Test")
    print("=" * 60)
    
    # Check if Flask is running
    print("\n[TEST] Checking if Flask is running...")
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=5)
        print("[TEST] ✓ Flask is running")
    except Exception as e:
        print(f"[TEST] ✗ Flask is not running: {e}")
        print("[TEST] Please start the Flask wrapper first:")
        print("[TEST]   cd /home/ben/pose-service")
        print("[TEST]   source 4D-Humans/venv/bin/activate")
        print("[TEST]   python flask_wrapper.py")
        return False
    
    # Run tests
    results = {
        'health': test_health_endpoint(),
        'pose': test_pose_endpoint(),
        'multiple': test_multiple_frames()
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name.upper()}: {status}")
    
    all_passed = all(results.values())
    print("\n" + ("=" * 60))
    if all_passed:
        print("✓ All tests passed!")
        print("=" * 60)
        return True
    else:
        print("✗ Some tests failed")
        print("=" * 60)
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
