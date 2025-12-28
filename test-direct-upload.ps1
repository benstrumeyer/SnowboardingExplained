# Test direct upload endpoint
$filePath = "C:\Users\benja\OneDrive\Desktop\clips\not.mov"

if (-not (Test-Path $filePath)) {
  Write-Host "❌ File not found: $filePath"
  exit 1
}

$fileItem = Get-Item -Path $filePath
Write-Host "📁 File: $($fileItem.Name)"
Write-Host "📊 Size: $([math]::Round($fileItem.Length / 1MB, 2)) MB"

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$body = @()

# Add file
$body += "--$boundary"
$body += 'Content-Disposition: form-data; name="video"; filename="' + $fileItem.Name + '"'
$body += "Content-Type: video/quicktime"
$body += ""
$body += [System.IO.File]::ReadAllBytes($filePath)
$body += "--$boundary--"

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($body -join "`r`n"))

Write-Host "🚀 Uploading to http://localhost:3001/api/pose/video..."

try {
  $response = Invoke-WebRequest -Uri "http://localhost:3001/api/pose/video" `
    -Method Post `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $bodyBytes `
    -TimeoutSec 600
  
  Write-Host "✅ Success!"
  $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | ConvertFrom-Json | ConvertTo-Json -Depth 10
  }
}
