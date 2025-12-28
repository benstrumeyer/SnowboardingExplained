# Run track.py directly - no Flask, no subprocess complexity
# Just like 4D-Humans does it

Write-Host "🚀 Running track.py directly..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

# Set environment
$env:PYTHONDONTWRITEBYTECODE = 1

# Run track.py with video path from command line
# Usage: .\run-track-directly.ps1 "C:\path\to\video.mp4"

if ($args.Count -eq 0) {
    Write-Host "Usage: .\run-track-directly.ps1 `"C:\path\to\video.mp4`"" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Cyan
    Write-Host "  .\run-track-directly.ps1 `"C:\Users\benja\Videos\test.mp4`"" -ForegroundColor White
    exit 1
}

$video_path = $args[0]

Write-Host "Video: $video_path" -ForegroundColor Cyan
Write-Host ""

# Convert Windows path to WSL path
$wsl_video_path = $video_path -replace '\\', '/' -replace 'C:', '/mnt/c'

Write-Host "WSL path: $wsl_video_path" -ForegroundColor Cyan
Write-Host ""

# Run track.py directly
wsl bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B 4D-Humans/track.py video.video_path=$wsl_video_path video.extract_video=False 2>&1"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Done" -ForegroundColor Green
