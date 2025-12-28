# Test the /api/pose/video endpoint with a real video upload
# This script uploads a test video and monitors the backend logs for [POSE-API] messages

param(
    [string]$VideoPath = "SnowboardingExplained/backend/uploads/video-1766341602726-564877181.mov",
    [string]$ApiUrl = "http://localhost:3001",
    [int]$TimeoutSeconds = 300
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎬 POSE VIDEO ENDPOINT TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify video file exists
if (-not (Test-Path $VideoPath)) {
    Write-Host "❌ Video file not found: $VideoPath" -ForegroundColor Red
    exit 1
}

$videoFile = Get-Item $VideoPath
$videoSizeMB = [math]::Round($videoFile.Length / 1024 / 1024, 2)

Write-Host "📹 Video Details:" -ForegroundColor Yellow
Write-Host "  Path: $VideoPath"
Write-Host "  Size: $videoSizeMB MB"
Write-Host "  API URL: $ApiUrl"
Write-Host ""

# Create form data
Write-Host "📤 Uploading video to /api/pose/video..." -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date

try {
    # Use curl to upload the file (more reliable for multipart form data)
    Write-Host "Using curl to upload..." -ForegroundColor Gray
    
    $curlOutput = & curl.exe -s -w "`n%{http_code}" `
        -F "video=@$VideoPath" `
        "$ApiUrl/api/pose/video"
    
    # Split output to get status code and body
    $lines = $curlOutput -split "`n"
    $httpCode = $lines[-1]
    $responseBody = $lines[0..($lines.Length-2)] -join "`n"
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds

    Write-Host "HTTP Status: $httpCode" -ForegroundColor Gray
    
    if ($httpCode -eq "200") {
        Write-Host "✅ Upload completed in $([math]::Round($duration, 2)) seconds" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Response:" -ForegroundColor Yellow
        Write-Host ($responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 10)
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✓ TEST PASSED" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host "❌ Upload failed with HTTP $httpCode after $([math]::Round($duration, 2)) seconds" -ForegroundColor Red
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Red
        Write-Host $responseBody
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "✗ TEST FAILED" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        exit 1
    }

} catch {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds

    Write-Host "❌ Upload failed after $([math]::Round($duration, 2)) seconds" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ TEST FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
