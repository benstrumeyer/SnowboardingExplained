#!/bin/bash

# Monitor base-python-pose build progress

echo "=========================================="
echo "Monitoring base-python-pose Build"
echo "=========================================="
echo ""
echo "Build started at: $(date)"
echo ""

# Check every 10 seconds
while true; do
    clear
    echo "=========================================="
    echo "base-python-pose Build Status"
    echo "=========================================="
    echo "Time: $(date)"
    echo ""
    
    # Check if image exists
    if docker images | grep -q "base-python-pose"; then
        echo "✅ BUILD COMPLETE!"
        echo ""
        docker images | grep base-python-pose
        echo ""
        echo "Ready to build services with: docker-compose build"
        break
    else
        echo "⏳ Build in progress..."
        echo ""
        
        # Show recent build steps
        echo "Recent build output:"
        docker buildx du 2>/dev/null || echo "(checking build status...)"
        
        echo ""
        echo "Checking again in 10 seconds..."
    fi
    
    sleep 10
done
