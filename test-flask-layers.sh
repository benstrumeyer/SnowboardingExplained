#!/bin/bash
set -e

echo "=========================================="
echo "LAYER 1: Testing base-python-pose image"
echo "=========================================="
docker run --rm base-python-pose:latest bash -c "python3 -c \"import flask; print('✓ BASE IMAGE: Flask OK at', flask.__file__)\""

echo ""
echo "=========================================="
echo "LAYER 2: Building pose-service image"
echo "=========================================="
docker build -t test-pose-service:latest backend/pose-service 2>&1 | tail -30

echo ""
echo "=========================================="
echo "LAYER 3: Testing built pose-service image"
echo "=========================================="
docker run --rm test-pose-service:latest bash -c "python3 -c \"import flask; print('✓ POSE SERVICE: Flask OK at', flask.__file__)\"" || echo "✗ POSE SERVICE: Flask NOT FOUND"

echo ""
echo "=========================================="
echo "LAYER 4: Check Python version in pose-service"
echo "=========================================="
docker run --rm test-pose-service:latest python3 --version

echo ""
echo "=========================================="
echo "LAYER 5: Check if flask is importable"
echo "=========================================="
docker run --rm test-pose-service:latest python3 -c "import sys; print('Python path:', sys.path[:3]); import flask; print('Flask version:', flask.__version__)" || echo "Flask import failed"
