#!/bin/bash
# Test Flask wrapper locally
# This script tests the health endpoint and sample frame processing

echo "[TEST] Starting Flask wrapper tests..."

# Test health endpoint
echo "[TEST] Testing health endpoint..."
curl -X GET http://localhost:5000/health

# Wait for response
sleep 1

# Test with sample frame (create a simple test image)
echo "[TEST] Creating test image..."
python3 << 'EOF'
import base64
import json
import requests
from PIL import Image
import numpy as np

# Create a simple test image (100x100 RGB)
img = Image.new('RGB', (100, 100), color='red')
img_bytes = img.tobytes()
img_base64 = base64.b64encode(img_bytes).decode('utf-8')

# Send to Flask wrapper
print("[TEST] Sending test frame to Flask wrapper...")
response = requests.post(
    'http://localhost:5000/pose/hybrid',
    json={
        'image_base64': img_base64,
        'frame_number': 0
    }
)

print(f"[TEST] Response status: {response.status_code}")
print(f"[TEST] Response: {json.dumps(response.json(), indent=2)}")

# Verify response format
data = response.json()
required_fields = ['frame_number', 'keypoints', 'has_3d', 'processing_time_ms']
missing_fields = [f for f in required_fields if f not in data]

if missing_fields:
    print(f"[TEST] ✗ Missing fields: {missing_fields}")
else:
    print(f"[TEST] ✓ Response format is correct")

EOF

echo "[TEST] ✓ Flask wrapper tests complete"
