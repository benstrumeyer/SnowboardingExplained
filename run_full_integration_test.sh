#!/bin/bash
# Full integration test script for 4D-Humans + PHALP Flask wrapper

set -e

echo "=========================================="
echo "4D-Humans + PHALP Integration Test"
echo "=========================================="
echo ""

# Configuration
POSE_SERVICE_DIR="/home/ben/pose-service"
VENV_PATH="$POSE_SERVICE_DIR/4D-Humans/venv"
FLASK_WRAPPER="$POSE_SERVICE_DIR/flask_wrapper.py"
TEST_SCRIPT="$POSE_SERVICE_DIR/test_flask_integration.py"

# Check if directories exist
echo "[SETUP] Checking directories..."
if [ ! -d "$POSE_SERVICE_DIR" ]; then
    echo "[ERROR] Pose service directory not found: $POSE_SERVICE_DIR"
    exit 1
fi

if [ ! -d "$VENV_PATH" ]; then
    echo "[ERROR] Virtual environment not found: $VENV_PATH"
    exit 1
fi

if [ ! -f "$FLASK_WRAPPER" ]; then
    echo "[ERROR] Flask wrapper not found: $FLASK_WRAPPER"
    exit 1
fi

echo "[SETUP] ✓ All directories found"
echo ""

# Copy test script to pose-service directory
echo "[SETUP] Copying test script..."
cp /mnt/c/Users/benja/repos/SnowboardingExplained/test_flask_integration.py "$POSE_SERVICE_DIR/"
echo "[SETUP] ✓ Test script copied"
echo ""

# Start Flask wrapper
echo "[STARTUP] Starting Flask wrapper..."
cd "$POSE_SERVICE_DIR"
source "$VENV_PATH/bin/activate"

# Start Flask in background
nohup python flask_wrapper.py > /tmp/flask_wrapper.log 2>&1 &
FLASK_PID=$!
echo "[STARTUP] Flask wrapper started (PID: $FLASK_PID)"

# Wait for Flask to start
echo "[STARTUP] Waiting for Flask to initialize..."
sleep 5

# Check if Flask is running
if ! ps -p $FLASK_PID > /dev/null; then
    echo "[ERROR] Flask wrapper failed to start"
    cat /tmp/flask_wrapper.log
    exit 1
fi

echo "[STARTUP] ✓ Flask wrapper is running"
echo ""

# Run tests
echo "[TEST] Running integration tests..."
python test_flask_integration.py
TEST_RESULT=$?

# Cleanup
echo ""
echo "[CLEANUP] Stopping Flask wrapper..."
kill $FLASK_PID 2>/dev/null || true
sleep 1

echo "[CLEANUP] ✓ Flask wrapper stopped"
echo ""

# Summary
echo "=========================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "✓ Integration test PASSED"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Start the Flask wrapper in production:"
    echo "   cd /home/ben/pose-service"
    echo "   source 4D-Humans/venv/bin/activate"
    echo "   python flask_wrapper.py"
    echo ""
    echo "2. Your Node.js backend can now call:"
    echo "   POST http://localhost:5000/pose/hybrid"
    echo ""
    exit 0
else
    echo "✗ Integration test FAILED"
    echo "=========================================="
    echo ""
    echo "Check Flask logs:"
    echo "   cat /tmp/flask_wrapper.log"
    echo ""
    exit 1
fi
