#!/bin/bash
# Start 4D-Humans Flask wrapper on WSL
# This script activates the virtual environment and starts the Flask wrapper
# Safe to run multiple times - just starts the service

set -e

echo "[STARTUP] Starting 4D-Humans Flask wrapper..."
echo "[STARTUP] (This is a persistent service - runs until you stop it)"
echo ""

# Navigate to pose service directory
cd /home/ben/pose-service

# Check if 4D-Humans is installed
if [ ! -d "4D-Humans" ]; then
  echo "[STARTUP] ✗ 4D-Humans not found at /home/ben/pose-service/4D-Humans"
  echo "[STARTUP] Please run setup-4d-humans-wsl.sh first"
  exit 1
fi

# Navigate to 4D-Humans directory
cd 4D-Humans

# Check if virtual environment exists
if [ ! -d "venv" ]; then
  echo "[STARTUP] ✗ Virtual environment not found"
  echo "[STARTUP] Please run setup-4d-humans-wsl.sh first"
  exit 1
fi

# Activate virtual environment
echo "[STARTUP] Activating virtual environment..."
source venv/bin/activate

# Check if Flask wrapper exists
if [ ! -f "../flask_wrapper.py" ]; then
  echo "[STARTUP] ✗ Flask wrapper not found at /home/ben/pose-service/flask_wrapper.py"
  echo "[STARTUP] Please copy flask_wrapper.py to /home/ben/pose-service/"
  exit 1
fi

# Start Flask wrapper
echo "[STARTUP] Starting Flask wrapper..."
echo "[STARTUP] Listening on http://0.0.0.0:5000"
echo "[STARTUP] Press Ctrl+C to stop"
echo ""

cd ..
python flask_wrapper.py
