#!/bin/bash
# Setup 4D-Humans with PHALP on WSL
# This script handles all setup tasks: clone, install, download models
# It's idempotent - safe to run multiple times

set -e

echo "[SETUP] Starting 4D-Humans setup..."

# Navigate to pose service directory
cd /home/ben/pose-service

# Task 1: Clone 4D-Humans
echo "[TASK 1] Checking 4D-Humans repository..."
if [ -d "4D-Humans" ]; then
  echo "[TASK 1] ✓ 4D-Humans already exists (skipping clone)"
else
  echo "[TASK 1] Cloning 4D-Humans repository..."
  git clone https://github.com/shubham-goel/4D-Humans.git
  echo "[TASK 1] ✓ 4D-Humans cloned successfully"
fi

cd 4D-Humans

# Task 2: Install Dependencies
echo "[TASK 2] Setting up Python environment..."

# Create virtual environment
if [ -d "venv" ]; then
  echo "[TASK 2] ✓ Virtual environment already exists"
else
  echo "[TASK 2] Creating virtual environment..."
  python3 -m venv venv
  echo "[TASK 2] ✓ Virtual environment created"
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are already installed
if python -c "import torch; import hmr2; import phalp; import flask" 2>/dev/null; then
  echo "[TASK 2] ✓ All dependencies already installed (skipping)"
else
  echo "[TASK 2] Installing dependencies..."
  
  # Upgrade pip
  pip install --upgrade pip
  
  # Install PyTorch with CUDA
  echo "[TASK 2] Installing PyTorch with CUDA..."
  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
  
  # Install 4D-Humans requirements
  echo "[TASK 2] Installing 4D-Humans requirements..."
  pip install -r requirements.txt
  
  # Install PHALP
  echo "[TASK 2] Installing PHALP..."
  pip install git+https://github.com/brjathu/PHALP.git
  
  # Install Flask
  echo "[TASK 2] Installing Flask..."
  pip install flask
  
  echo "[TASK 2] ✓ All dependencies installed"
fi

# Verify installations
echo "[TASK 2] Verifying installations..."
python -c "import torch; import hmr2; import phalp; import flask; print('✓ All imports successful')"

# Task 3: Download Models
echo "[TASK 3] Checking models..."

# Check if models are already cached
if [ -f "$HOME/.cache/torch/hub/hmr2_model.pth" ] 2>/dev/null || [ -d "$HOME/.cache/torch/hub" ] && [ "$(ls -A $HOME/.cache/torch/hub)" ]; then
  echo "[TASK 3] ✓ Models already cached (skipping download)"
else
  echo "[TASK 3] Downloading models (this may take a few minutes)..."
  
  # Download HMR2 model
  echo "[TASK 3] Downloading HMR2 model..."
  python -c "from hmr2.models import download_model; download_model(); print('✓ HMR2 model downloaded')"
  
  # Download ViTPose model
  echo "[TASK 3] Downloading ViTPose model..."
  python -c "from vitpose.models import download_model; download_model(); print('✓ ViTPose model downloaded')"
fi

# Verify models are cached
echo "[TASK 3] Verifying models are cached..."
if [ -d "$HOME/.cache/torch/hub" ]; then
  echo "[TASK 3] ✓ Models cached in ~/.cache/torch/hub"
  du -sh ~/.cache/torch/hub/
else
  echo "[TASK 3] ⚠ Model cache directory not found"
fi

echo ""
echo "[SETUP] ✓ Setup complete!"
echo "[SETUP] ✓ 4D-Humans is ready to use"
echo ""
echo "[SETUP] Next steps:"
echo "[SETUP] 1. Copy flask_wrapper.py to /home/ben/pose-service/"
echo "[SETUP] 2. Start Flask wrapper: bash start-pose-service.sh"
echo "[SETUP] 3. Test health endpoint: curl http://172.24.183.130:5000/health"
echo ""
echo "[SETUP] Note: This setup is idempotent - safe to run multiple times"
echo "[SETUP] It will skip steps that are already complete"
