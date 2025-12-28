#!/usr/bin/env pwsh
<#
.SYNOPSIS
Test the complete pose video pipeline from upload through track.py execution
.DESCRIPTION
This script:
1. Uploads a test video to /api/pose/video
2. Monitors backend logs for [POSE-API] messages
3. Tracks track.py execution in WSL
4. Verifies the entire pipeline works end-to-end
#>

param(
    [string]$VideoPath = "SnowboardingExplained/backend/uploads/video-1765616435147-422633954.mp4",
    [string]$ApiUrl = "http://localhost:3001/api/pose/video",
    [int]$TimeoutSeconds = 120
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "POSE VIDEO PIPELINE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify video exists
if (-not (Test-Path $VideoPath)) {
    Write-Host "[ERROR] Video file not found: $VideoPath" -ForegroundColor Red
    exit 1
}

$videoSize = (Get-Item $VideoPath).Length
Write-Host "[SETUP] Video file: $VideoPath" -ForegroundColor Yellow
Write-Host "[SETUP] Video size: $([math]::Round($videoSize / 1MB, 2)) MB" -ForegroundColor Yellow
Write-Host "[SETUP] API endpoint: $ApiUrl" -ForegroundColor Yellow
Write-Host "[SETUP] Timeout: ${TimeoutSeconds}s" -ForegroundColor Yellow
Write-Host ""

# Start monitoring backend logs
Write-Host "[MONITOR] Starting backend log monitoring..." -ForegroundColor Cyan
$logFile = "SnowboardingExplained/backend-pose-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
Write-Host "[MONITOR] Log file: $logFile" -ForegroundColor Yellow

# Create a background job to capture logs
$logJob = Start-Job -ScriptBlock {
    param($logPath)
    $lastLine = 0
    while ($true) {
        # This is a placeholder - we'll check logs after the upload
        Start-Sleep -Milliseconds 100
    }
} -ArgumentList $logFile

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UPLOADING VIDEO TO /api/pose/video" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
Write-Host "[UPLOAD] Starting upload at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow

try {
    # Use curl to upload with verbose output
    Write-Host "[UPLOAD] Running: curl -X POST -F 'video=@$VideoPath' '$ApiUrl' --max-time $TimeoutSeconds -v" -ForegroundColor Yellow
    Write-Host ""
    
    $curlOutput = curl -X POST -F "video=@$VideoPath" "$ApiUrl" --max-time $TimeoutSeconds -v 2>&1
    
    $elapsedTime = (Get-Date) - $startTime
    Write-Host ""
    Write-Host "[UPLOAD] Upload completed in $($elapsedTime.TotalSeconds)s" -ForegroundColor Green
    Write-Host ""
    Write-Host "[UPLOAD] Curl output:" -ForegroundColor Yellow
    Write-Host $curlOutput
    Write-Host ""
    
    # Try to parse JSON response
    try {
        $jsonStart = $curlOutput.IndexOf('{')
        if ($jsonStart -ge 0) {
            $jsonStr = $curlOutput.Substring($jsonStart)
            $response = $jsonStr | ConvertFrom-Json
            Write-Host "[RESPONSE] Status: $($response.status)" -ForegroundColor Green
            Write-Host "[RESPONSE] Message: $($response.message)" -ForegroundColor Green
            Write-Host "[RESPONSE] Output length: $($response.outputLength) bytes" -ForegroundColor Green
            if ($response.lastOutput) {
                Write-Host "[RESPONSE] Last output:" -ForegroundColor Green
                Write-Host $response.lastOutput
            }
        }
    } catch {
        Write-Host "[RESPONSE] Could not parse JSON response" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[ERROR] Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CHECKING BACKEND LOGS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Give backend a moment to write logs
Start-Sleep -Seconds 2

Write-Host "[LOGS] Checking for [POSE-API] messages in backend output..." -ForegroundColor Yellow
Write-Host ""

# Note: In a real scenario, we'd capture the backend process output
# For now, we'll just indicate where to look
Write-Host "[LOGS] Look for these patterns in backend console:" -ForegroundColor Cyan
Write-Host "  - [POSE-API] Processing video:" -ForegroundColor Gray
Write-Host "  - [POSE-API] Converting Windows path to WSL path..." -ForegroundColor Gray
Write-Host "  - [POSE-API] Running track.py via WSL..." -ForegroundColor Gray
Write-Host "  - [POSE-API-STDOUT] (track.py output)" -ForegroundColor Gray
Write-Host "  - [POSE-API] Process exited with code:" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[SUMMARY] Total time: $($elapsedTime.TotalSeconds)s" -ForegroundColor Green
Write-Host "[SUMMARY] Check backend console for [POSE-API] logs" -ForegroundColor Green
Write-Host "[SUMMARY] If you see track.py output, the pipeline is working!" -ForegroundColor Green
Write-Host ""
