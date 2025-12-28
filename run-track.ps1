# Run track.py directly - exactly like 4D-Humans
# Usage: .\run-track.ps1 "C:\path\to\video.mp4"

param(
    [Parameter(Mandatory=$true)]
    [string]$VideoPath
)

Write-Host "🚀 Running PHALP tracking..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "Video: $VideoPath" -ForegroundColor Cyan

# Verify video exists
if (-not (Test-Path $VideoPath)) {
    Write-Host "❌ Video not found: $VideoPath" -ForegroundColor Red
    exit 1
}

# Convert Windows path to WSL path
$WslPath = $VideoPath -replace '\\', '/' -replace 'C:', '/mnt/c'

Write-Host "WSL path: $WslPath" -ForegroundColor Cyan
Write-Host ""

# Run track.py directly
wsl bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B 4D-Humans/track.py video.video_path=$WslPath video.extract_video=False 2>&1"

$ExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

if ($ExitCode -eq 0) {
    Write-Host "✅ Tracking completed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Tracking failed with exit code $ExitCode" -ForegroundColor Red
}

exit $ExitCode
