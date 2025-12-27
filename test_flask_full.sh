#!/bin/bash
# Full Flask wrapper integration test

set -e

VENV_PATH="/home/ben/pose-service/4D-Humans/venv"
WRAPPER_DIR="/home/ben/pose-service"

echo "[INTEGRATION TEST] Flask Wrapper Full Test"
echo "[INTEGRATION TEST] ================================"

# Activate venv
source "$VENV_PATH/bin/activate"

# Start Flask wrapper in background
echo "[INTEGRATION TEST] Starting Flask wrapper..."
cd "$WRAPPER_DIR"
python flask_wrapper.py > /tmp/flask_integration.log 2>&1 &
FLASK_PID=$!
echo "[INTEGRATION TEST] Flask PID: $FLASK_PID"

# Wait for Flask to start
echo "[INTEGRATION TEST] Waiting for Flask to start (5 seconds)..."
sleep 5

# Check if Flask is still running
if ! kill -0 $FLASK_PID 2>/dev/null; then
    echo "[INTEGRATION TEST] ✗ Flask process died"
    echo "[INTEGRATION TEST] Flask logs:"
    cat /tmp/flask_integration.log
    exit 1
fi

echo "[INTEGRATION TEST] ✓ Flask process is running"

# Test 1: Health endpoint
echo ""
echo "[INTEGRATION TEST] Test 1: Health endpoint"
echo "[INTEGRATION TEST] ========================"
RESPONSE=$(curl -s http://localhost:5000/health)
echo "[INTEGRATION TEST] Response: $RESPONSE"

# Test 2: Create a test image and send to /pose/hybrid
echo ""
echo "[INTEGRATION TEST] Test 2: Process single frame"
echo "[INTEGRATION TEST] =============================="

# Create a test image
python3 << 'EOF'
import base64
import json
from PIL import Image
import numpy as np

# Create a simple test image (512x512 RGB)
img_array = np.random.randint(0, 256, (512, 512, 3), dtype=np.uint8)
img = Image.fromarray(img_array)
img.save('/tmp/test_frame.png')

# Encode to base64
with open('/tmp/test_frame.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

# Create JSON payload
payload = {
    'image_base64': b64,
    'frame_number': 0
}

# Save to file for curl
with open('/tmp/test_payload.json', 'w') as f:
    json.dump(payload, f)

print("[INTEGRATION TEST] Test image created and encoded")
EOF

# Send to Flask
echo "[INTEGRATION TEST] Sending frame to /pose/hybrid..."
echo "[INTEGRATION TEST] This may take 30-60 seconds on first request (models loading)..."

START_TIME=$(date +%s)
RESPONSE=$(curl -s -X POST http://localhost:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d @/tmp/test_payload.json)
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "[INTEGRATION TEST] Response received in ${ELAPSED}s"
echo "[INTEGRATION TEST] Response length: ${#RESPONSE} characters"

# Check if response contains expected fields
if echo "$RESPONSE" | grep -q "frame_number"; then
    echo "[INTEGRATION TEST] ✓ Response contains frame_number"
else
    echo "[INTEGRATION TEST] ✗ Response missing frame_number"
fi

if echo "$RESPONSE" | grep -q "keypoints"; then
    echo "[INTEGRATION TEST] ✓ Response contains keypoints"
else
    echo "[INTEGRATION TEST] ✗ Response missing keypoints"
fi

if echo "$RESPONSE" | grep -q "mesh_vertices_data"; then
    echo "[INTEGRATION TEST] ✓ Response contains mesh_vertices_data"
else
    echo "[INTEGRATION TEST] ✗ Response missing mesh_vertices_data"
fi

# Print first 500 chars of response
echo "[INTEGRATION TEST] Response preview:"
echo "$RESPONSE" | head -c 500
echo ""
echo ""

# Test 3: Process multiple frames
echo "[INTEGRATION TEST] Test 3: Process multiple frames"
echo "[INTEGRATION TEST] =================================="

for i in {1..3}; do
    echo "[INTEGRATION TEST] Processing frame $i..."
    START_TIME=$(date +%s)
    RESPONSE=$(curl -s -X POST http://localhost:5000/pose/hybrid \
      -H "Content-Type: application/json" \
      -d @/tmp/test_payload.json)
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    
    if echo "$RESPONSE" | grep -q "frame_number"; then
        echo "[INTEGRATION TEST] ✓ Frame $i processed in ${ELAPSED}s"
    else
        echo "[INTEGRATION TEST] ✗ Frame $i failed"
        echo "[INTEGRATION TEST] Response: $RESPONSE"
    fi
done

# Stop Flask
echo ""
echo "[INTEGRATION TEST] Stopping Flask wrapper..."
kill $FLASK_PID 2>/dev/null || true
sleep 1

# Check Flask logs
echo "[INTEGRATION TEST] Flask logs (last 50 lines):"
tail -50 /tmp/flask_integration.log

echo ""
echo "[INTEGRATION TEST] ✓ Full integration test complete"
