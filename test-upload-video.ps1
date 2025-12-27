#!/usr/bin/env pwsh
# Test video upload

$videoPath = "C:\Users\benja\OneDrive\Desktop\clips\not.mov"
$apiUrl = "http://localhost:3001/api/upload-video-with-pose"

if (-not (Test-Path $videoPath)) {
    Write-Host "❌ Video file not found: $videoPath"
    exit 1
}

Write-Host "📤 Uploading video: $videoPath"
Write-Host "🎯 API URL: $apiUrl"

$form = @{
    video = Get-Item $videoPath
    role = "rider"
}

try {
    $response = Invoke-WebRequest -Uri $apiUrl -Method Post -Form $form -TimeoutSec 600
    Write-Host "✅ Upload successful!"
    Write-Host "Response: $($response.Content)"
    
    # Extract videoId from response
    $json = $response.Content | ConvertFrom-Json
    $videoId = $json.videoId
    Write-Host "📹 Video ID: $videoId"
    
    # Wait a moment for processing
    Write-Host "⏳ Waiting for processing..."
    Start-Sleep -Seconds 5
    
    # Check MongoDB
    Write-Host "🔍 Checking MongoDB..."
    node "SnowboardingExplained/backend/node_modules/.bin/node" "SnowboardingExplained/diagnose-upload.js" $videoId
    
} catch {
    Write-Host "❌ Upload failed: $_"
    exit 1
}
