#!/usr/bin/env python3
"""Test HMR2 initialization by sending a test frame."""

import requests
import base64
import json
import numpy as np
from PIL import Image
import io

# Create a simple test image (256x256 RGB)
test_image = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
pil_image = Image.fromarray(test_image)

# Convert to base64
buffer = io.BytesIO()
pil_image.save(buffer, format='PNG')
image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

# Send to Flask wrapper
url = 'http://localhost:5000/pose/hybrid'
payload = {
    'image_base64': image_base64,
    'frame_number': 0
}

print("[TEST] Sending test frame to /pose/hybrid...")
try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"[TEST] Status code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("[TEST] ✓ Success!")
        print(f"[TEST] Response keys: {list(result.keys())}")
        if 'error' in result and result['error']:
            print(f"[TEST] Error: {result['error']}")
        else:
            print(f"[TEST] Keypoints detected: {len(result.get('keypoints', []))}")
            print(f"[TEST] Processing time: {result.get('processing_time_ms', 'N/A')} ms")
    else:
        print(f"[TEST] ✗ Error: {response.status_code}")
        print(f"[TEST] Response: {response.text}")
except Exception as e:
    print(f"[TEST] ✗ Exception: {e}")
