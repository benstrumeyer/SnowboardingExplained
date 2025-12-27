#!/usr/bin/env pwsh
# Test uploading the not.mov file

$videoPath = "C:\Users\benja\OneDrive\Desktop\clips\not.mov"
$apiUrl = "http://localhost:3001"

if (-not (Test-Path $videoPath)) {
    Write-Host "❌ Video file not found: $videoPath"
    exit 1
}

Write-Host "📹 Testing video upload"
Write-Host "File: $videoPath"
Write-Host "Size: $((Get-Item $videoPath).Length / 1MB)MB"

# Upload using curl
Write-Host "`n📤 Uploading..."
$response = curl.exe -X POST `
    -F "video=@`"$videoPath`"" `
    -F "role=rider" `
    "$apiUrl/api/upload-video-with-pose" `
    -s

Write-Host "Response:"
Write-Host $response | ConvertFrom-Json | ConvertTo-Json

# Extract videoId
$videoId = ($response | ConvertFrom-Json).videoId
Write-Host "`n✅ Video uploaded with ID: $videoId"

# Wait a bit for processing
Write-Host "`n⏳ Waiting 10 seconds for processing..."
Start-Sleep -Seconds 10

# Check the database
Write-Host "`n🔍 Checking database..."
node SnowboardingExplained/diagnose-upload.js $videoId
