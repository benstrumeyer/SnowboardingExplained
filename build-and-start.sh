#!/bin/bash

# Docker BuildKit Build and Start Script
# Run this in a NEW terminal window

set -e

echo "=========================================="
echo "Docker BuildKit Build & Start Script"
echo "=========================================="
echo ""

# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "✓ BuildKit enabled"
echo ""

# Wait for base-python-pose to finish if still building
echo "Checking base images..."
while ! docker images | grep -q "base-python-pose"; do
    echo "⏳ Waiting for base-python-pose to finish building..."
    sleep 10
done

echo "✓ All base images ready"
echo ""

# Show base images
echo "Base images:"
docker images | grep base-

echo ""
echo "=========================================="
echo "Building all services..."
echo "=========================================="
echo ""

docker-compose build

echo ""
echo "✓ All services built successfully"
echo ""

echo "=========================================="
echo "Starting all services..."
echo "=========================================="
echo ""

docker-compose up

