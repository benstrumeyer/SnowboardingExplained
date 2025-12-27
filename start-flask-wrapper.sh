#!/bin/bash
# Start Flask wrapper for 4D-Humans pose service

set -e

VENV_PATH="/home/ben/pose-service/4D-Humans/venv"
WRAPPER_DIR="/home/ben/pose-service"
WRAPPER_SCRIPT="flask_wrapper_safe.py"

echo "[FLASK] Starting Flask wrapper..."
echo "[FLASK] ================================"

# Check if venv exists
if [ ! -d "$VENV_PATH" ]; then
    echo "[FLASK] ✗ Virtual environment not found at $VENV_PATH"
    exit 1
fi

echo "[FLASK] ✓ Virtual environment found"

# Activate venv and start Flask
cd "$WRAPPER_DIR"
source "$VENV_PATH/bin/activate"

echo "[FLASK] Python version: $(python --version)"
echo "[FLASK] Starting Flask wrapper..."
echo "[FLASK] Listening on 0.0.0.0:5000"
echo "[FLASK] ================================"

# Start Flask wrapper
python "$WRAPPER_SCRIPT"
