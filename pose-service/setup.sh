#!/bin/bash
set -e

echo "🔧 Setting up Pose Service..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create model cache directory
mkdir -p .models

# Download models
echo "📥 Downloading 4DHumans (HMR2) model..."
python3 -c "from src.models import download_hmr2; download_hmr2('.models')"

echo "📥 Downloading ViTPose model..."
python3 -c "from src.models import download_vitpose; download_vitpose('.models')"

echo "✅ Setup complete!"
echo "To start the service, run: python app.py"
