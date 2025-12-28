#!/usr/bin/env pwsh
<#
.SYNOPSIS
Setup WSL symlinks for 4D-Humans and pose service
This script creates symlinks for all necessary directories in WSL

.DESCRIPTION
Runs the bash setup script in WSL to create symlinks for:
- 4D-Humans directory
- PHALP directory
- Flask wrapper
- HMR2 loader
- Necessary output directories

.EXAMPLE
.\setup-wsl-symlinks.ps1
#>

Write-Host "=========================================="
Write-Host "WSL Symlink Setup for 4D-Humans"
Write-Host "=========================================="
Write-Host ""

# Check if WSL is available
try {
    $wslVersion = wsl --version 2>$null
    Write-Host "✓ WSL is available"
    Write-Host "  Version: $wslVersion"
} catch {
    Write-Host "✗ WSL is not available or not installed"
    Write-Host "  Please install WSL2 first"
    exit 1
}

Write-Host ""
Write-Host "Running setup script in WSL..."
Write-Host ""

# Run the bash script in WSL
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$bashScript = Join-Path $scriptPath "setup-wsl-symlinks.sh"

if (-not (Test-Path $bashScript)) {
    Write-Host "✗ setup-wsl-symlinks.sh not found at: $bashScript"
    exit 1
}

Write-Host "Script path: $bashScript"
Write-Host ""

# Convert Windows path to WSL path
$wslScriptPath = $bashScript -replace '\\', '/' -replace 'C:', '/mnt/c'

Write-Host "Running: wsl bash $wslScriptPath"
Write-Host ""

# Run the script
wsl bash $wslScriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "✓ Setup Complete!"
    Write-Host "=========================================="
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Open WSL terminal: wsl"
    Write-Host "2. Test track.py: cd ~/pose-service/4D-Humans && python test_startup.py"
    Write-Host "3. Start Flask: cd ~/pose-service && python flask_wrapper_minimal_safe.py"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Setup failed with exit code: $LASTEXITCODE"
    exit 1
}
