#!/bin/bash
# Install detectron2 - try multiple methods

echo "Attempting to install detectron2..."

# Method 1: Try PyPI directly (most reliable)
echo "Method 1: Installing from PyPI..."
pip install detectron2

if [ $? -eq 0 ]; then
    echo "✓ detectron2 installed successfully from PyPI"
    exit 0
fi

# Method 2: Try with specific CUDA wheels
echo "Method 2: Trying CUDA 12.1 wheels..."
pip install detectron2 -f https://dl.fbaipublicfiles.com/detectron2/wheels/cu121/torch2.5/index.html

if [ $? -eq 0 ]; then
    echo "✓ detectron2 installed successfully with CUDA wheels"
    exit 0
fi

# Method 3: Try building from source
echo "Method 3: Building from source..."
pip install 'git+https://github.com/facebookresearch/detectron2.git'

if [ $? -eq 0 ]; then
    echo "✓ detectron2 installed successfully from source"
    exit 0
fi

echo "✗ All installation methods failed"
exit 1
