# Setup Pose Service - Windows PowerShell Script
# This script sets up the Python virtual environment and installs dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pose Service Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "pose-service")) {
    Write-Host "ERROR: pose-service directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the SnowboardingExplained directory" -ForegroundColor Red
    exit 1
}

# Navigate to pose-service
cd pose-service
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Step 1: Create virtual environment
Write-Host "Step 1: Creating virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists, skipping creation" -ForegroundColor Green
} else {
    python -m venv venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Virtual environment created" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 2: Activate virtual environment
Write-Host "Step 2: Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Upgrade pip
Write-Host "Step 3: Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ pip upgraded" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to upgrade pip" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Install requirements
Write-Host "Step 4: Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Verify imports
Write-Host "Step 5: Verifying imports..." -ForegroundColor Yellow
python -c "import cv2; import torch; print('✓ All imports successful')"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Imports verified" -ForegroundColor Green
} else {
    Write-Host "✗ Import verification failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Download models
Write-Host "Step 6: Downloading models..." -ForegroundColor Yellow
Write-Host "This may take several minutes (downloading ~600MB)..." -ForegroundColor Cyan
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Models downloaded" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to download models" -ForegroundColor Red
    Write-Host "You can try downloading manually later" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Verify models
Write-Host "Step 7: Verifying models..." -ForegroundColor Yellow
if ((Test-Path ".models") -and (Test-Path ".models\hmr2") -and (Test-Path ".models\vitpose")) {
    Write-Host "✓ Models verified" -ForegroundColor Green
} else {
    Write-Host "⚠ Models directory not found or incomplete" -ForegroundColor Yellow
    Write-Host "You may need to download models manually" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Keep this PowerShell window open (venv is activated)" -ForegroundColor White
Write-Host "2. Or activate venv manually in a new window:" -ForegroundColor White
Write-Host "   cd SnowboardingExplained\pose-service" -ForegroundColor Cyan
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host "3. Run the backend:" -ForegroundColor White
Write-Host "   cd SnowboardingExplained\backend" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "The pose service will be automatically spawned by the backend" -ForegroundColor Green
Write-Host ""
