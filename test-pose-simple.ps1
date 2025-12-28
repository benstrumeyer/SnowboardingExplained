#!/usr/bin/env powershell
<#
.SYNOPSIS
Simple test of the pose video pipeline
#>

$VideoPath = "SnowboardingExplained/backend/uploads/video-1765616435147-422633954.mp4"
$ApiUrl = "http://localhost:3001/api/pose/video"

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
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UPLOADING VIDEO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
Write-Host "[UPLOAD] Starting at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow

try {
    # Create multipart form data using .NET
    $fileStream = [System.IO.File]::OpenRead($VideoPath)
    $boundary = [System.Guid]::NewGuid().ToString()
    
    $request = [System.Net.HttpWebRequest]::Create($ApiUrl)
    $request.Method = "POST"
    $request.ContentType = "multipart/form-data; boundary=$boundary"
    $request.Timeout = 600000  # 10 minutes
    
    # Build multipart body
    $bodyBuilder = New-Object System.Text.StringBuilder
    $bodyBuilder.AppendLine("--$boundary") | Out-Null
    $bodyBuilder.AppendLine('Content-Disposition: form-data; name="video"; filename="test.mp4"') | Out-Null
    $bodyBuilder.AppendLine("Content-Type: video/mp4") | Out-Null
    $bodyBuilder.AppendLine("") | Out-Null
    
    $requestStream = $request.GetRequestStream()
    
    # Write headers
    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyBuilder.ToString())
    $requestStream.Write($headerBytes, 0, $headerBytes.Length)
    
    # Write file
    $buffer = New-Object byte[] 4096
    while (($bytesRead = $fileStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        $requestStream.Write($buffer, 0, $bytesRead)
    }
    
    # Write footer
    $footerBytes = [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
    $requestStream.Write($footerBytes, 0, $footerBytes.Length)
    
    $requestStream.Close()
    $fileStream.Close()
    
    Write-Host "[UPLOAD] Request sent, waiting for response..." -ForegroundColor Yellow
    
    # Get response
    $response = $request.GetResponse()
    $responseStream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    $response.Close()
    
    $elapsedTime = (Get-Date) - $startTime
    
    Write-Host "[UPLOAD] Response received in $($elapsedTime.TotalSeconds)s" -ForegroundColor Green
    Write-Host ""
    Write-Host "[RESPONSE] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "[RESPONSE] Body:" -ForegroundColor Green
    Write-Host $responseBody
    Write-Host ""
    
    # Try to parse JSON
    try {
        $json = $responseBody | ConvertFrom-Json
        Write-Host "[PARSED] Status: $($json.status)" -ForegroundColor Green
        Write-Host "[PARSED] Message: $($json.message)" -ForegroundColor Green
        if ($json.error) {
            Write-Host "[PARSED] Error: $($json.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "[PARSE] Could not parse JSON" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[ERROR] Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[ERROR] Details: $($_.Exception)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[NEXT] Check backend console for [POSE-API] logs" -ForegroundColor Green
Write-Host "[NEXT] Look for track.py output starting with [TRACK.PY]" -ForegroundColor Green
