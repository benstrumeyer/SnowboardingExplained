#!/bin/bash
# Debug Flask wrapper startup and connectivity

set -e

VENV_PATH="/home/ben/pose-service/4D-Humans/venv"
WRAPPER_DIR="/home/ben/pose-service"

echo "[TEST] Flask Wrapper Debug Script"
echo "[TEST] ================================"

# Check if venv exists
if [ ! -d "$VENV_PATH" ]; then
    echo "[TEST] ✗ Virtual environment not found at $VENV_PATH"
    exit 1
fi

echo "[TEST] ✓ Virtual environment found"

# Activate venv
echo "[TEST] Activating virtual environment..."
source "$VENV_PATH/bin/activate"

# Check Python
echo "[TEST] Python version:"
python --version

# Check if Flask is installed
echo "[TEST] Checking Flask installation..."
python -c "import flask; print(f'Flask {flask.__version__} installed')" || {
    echo "[TEST] ✗ Flask not installed"
    exit 1
}

# Check if torch is installed
echo "[TEST] Checking torch installation..."
python -c "import torch; print(f'Torch {torch.__version__} installed'); print(f'CUDA available: {torch.cuda.is_available()}')" || {
    echo "[TEST] ✗ Torch not installed"
    exit 1
}

# Check if PIL is installed
echo "[TEST] Checking PIL installation..."
python -c "from PIL import Image; print('PIL installed')" || {
    echo "[TEST] ✗ PIL not installed"
    exit 1
}

# Check if numpy is installed
echo "[TEST] Checking numpy installation..."
python -c "import numpy; print('Numpy installed')" || {
    echo "[TEST] ✗ Numpy not installed"
    exit 1
}

# Check if 4D-Humans directory exists
echo "[TEST] Checking 4D-Humans directory..."
if [ ! -d "$WRAPPER_DIR/4D-Humans" ]; then
    echo "[TEST] ✗ 4D-Humans directory not found"
    exit 1
fi
echo "[TEST] ✓ 4D-Humans directory found"

# Try importing the Flask app
echo "[TEST] Testing Flask app import..."
cd "$WRAPPER_DIR"
python -c "from flask_wrapper import app; print('Flask app imported successfully')" || {
    echo "[TEST] ✗ Failed to import Flask app"
    exit 1
}

# Start Flask wrapper in background
echo "[TEST] Starting Flask wrapper..."
python flask_wrapper.py > /tmp/flask_test.log 2>&1 &
FLASK_PID=$!
echo "[TEST] Flask PID: $FLASK_PID"

# Wait for Flask to start
echo "[TEST] Waiting for Flask to start (5 seconds)..."
sleep 5

# Check if Flask is still running
if ! kill -0 $FLASK_PID 2>/dev/null; then
    echo "[TEST] ✗ Flask process died"
    echo "[TEST] Flask logs:"
    cat /tmp/flask_test.log
    exit 1
fi

echo "[TEST] ✓ Flask process is running"

# Check if port 5000 is listening
echo "[TEST] Checking if port 5000 is listening..."
if netstat -tlnp 2>/dev/null | grep -q ":5000"; then
    echo "[TEST] ✓ Port 5000 is listening"
else
    echo "[TEST] ⚠ Port 5000 not found in netstat"
    echo "[TEST] Trying with ss..."
    ss -tlnp 2>/dev/null | grep -q ":5000" && echo "[TEST] ✓ Port 5000 is listening (via ss)" || echo "[TEST] ✗ Port 5000 not listening"
fi

# Test health endpoint
echo "[TEST] Testing /health endpoint..."
if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/health 2>&1 || echo "error")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "[TEST] ✓ Health endpoint returned 200"
        echo "[TEST] Response: $BODY"
    else
        echo "[TEST] ✗ Health endpoint returned $HTTP_CODE"
        echo "[TEST] Response: $BODY"
    fi
else
    echo "[TEST] ⚠ curl not available, skipping health test"
fi

# Stop Flask
echo "[TEST] Stopping Flask wrapper..."
kill $FLASK_PID 2>/dev/null || true
sleep 1

# Check Flask logs
echo "[TEST] Flask logs:"
cat /tmp/flask_test.log

echo "[TEST] ✓ Debug test complete"
