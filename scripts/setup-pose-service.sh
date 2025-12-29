#!/bin/bash

# Setup Pose Service - macOS/Linux Bash Script
# This script sets up the Python virtual environment and installs dependencies

echo "========================================"
echo "Pose Service Setup Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "pose-service" ]; then
    echo "ERROR: pose-service directory not found!"
    echo "Please run this script from the SnowboardingExplained directory"
    exit 1
fi

# Navigate to pose-service
cd pose-service
echo "Working directory: $(pwd)"
echo ""

# Step 1: Create virtual environment
echo "Step 1: Creating virtual environment..."
if [ -d "venv" ]; then
    echo "Virtual environment already exists, skipping creation"
else
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        echo "✓ Virtual environment created"
    else
        echo "✗ Failed to create virtual environment"
        exit 1
    fi
fi
echo ""

# Step 2: Activate virtual environment
echo "Step 2: Activating virtual environment..."
source venv/bin/activate
if [ $? -eq 0 ]; then
    echo "✓ Virtual environment activated"
else
    echo "✗ Failed to activate virtual environment"
    exit 1
fi
echo ""

# Step 3: Upgrade pip
echo "Step 3: Upgrading pip..."
python -m pip install --upgrade pip setuptools wheel
if [ $? -eq 0 ]; then
    echo "✓ pip upgraded"
else
    echo "✗ Failed to upgrade pip"
    exit 1
fi
echo ""

# Step 4: Install requirements
echo "Step 4: Installing dependencies..."
echo "This may take a few minutes..."
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi
echo ""

# Step 5: Verify imports
echo "Step 5: Verifying imports..."
python -c "import cv2; import torch; print('✓ All imports successful')"
if [ $? -eq 0 ]; then
    echo "✓ Imports verified"
else
    echo "✗ Import verification failed"
    exit 1
fi
echo ""

# Step 6: Download models
echo "Step 6: Downloading models..."
echo "This may take several minutes (downloading ~600MB)..."
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
if [ $? -eq 0 ]; then
    echo "✓ Models downloaded"
else
    echo "✗ Failed to download models"
    echo "You can try downloading manually later"
fi
echo ""

# Step 7: Verify models
echo "Step 7: Verifying models..."
if [ -d ".models" ] && [ -d ".models/hmr2" ] && [ -d ".models/vitpose" ]; then
    echo "✓ Models verified"
else
    echo "⚠ Models directory not found or incomplete"
    echo "You may need to download models manually"
fi
echo ""

# Summary
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Keep this terminal window open (venv is activated)"
echo "2. Or activate venv manually in a new window:"
echo "   cd SnowboardingExplained/pose-service"
echo "   source venv/bin/activate"
echo "3. Run the backend:"
echo "   cd SnowboardingExplained/backend"
echo "   npm run dev"
echo ""
echo "The pose service will be automatically spawned by the backend"
echo ""
