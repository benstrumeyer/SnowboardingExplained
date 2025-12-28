# Test WSL setup and connectivity

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WSL SETUP DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if WSL is installed
Write-Host "TEST 1: Check if WSL is installed" -ForegroundColor Yellow
try {
    $wslVersion = wsl --version
    Write-Host "✓ WSL is installed" -ForegroundColor Green
    Write-Host "  Version: $wslVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ WSL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Check if WSL can run commands
Write-Host "TEST 2: Check if WSL can run basic commands" -ForegroundColor Yellow
try {
    $result = wsl echo "Hello from WSL"
    Write-Host "✓ WSL can run commands" -ForegroundColor Green
    Write-Host "  Output: $result" -ForegroundColor Green
} catch {
    Write-Host "✗ WSL command failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Check if /tmp/pose-videos directory can be created
Write-Host "TEST 3: Check if /tmp/pose-videos directory can be created" -ForegroundColor Yellow
try {
    wsl mkdir -p /tmp/pose-videos
    Write-Host "✓ Directory creation succeeded" -ForegroundColor Green
} catch {
    Write-Host "✗ Directory creation failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Verify it exists
try {
    $exists = wsl test -d /tmp/pose-videos
    Write-Host "✓ Directory exists in WSL" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not verify directory existence" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Check if wslpath works
Write-Host "TEST 4: Check if wslpath command works" -ForegroundColor Yellow
try {
    $testPath = "C:\Users\benja\repos\SnowboardingExplained"
    $wslPath = wsl wslpath "$testPath"
    Write-Host "✓ wslpath works" -ForegroundColor Green
    Write-Host "  Windows path: $testPath" -ForegroundColor Green
    Write-Host "  WSL path: $wslPath" -ForegroundColor Green
} catch {
    Write-Host "✗ wslpath failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: Check if we can copy a file
Write-Host "TEST 5: Check if we can copy a file to WSL" -ForegroundColor Yellow
try {
    # Create a test file
    $testFile = "C:\temp\test-wsl-copy.txt"
    New-Item -Path "C:\temp" -ItemType Directory -Force | Out-Null
    "Test content" | Out-File -FilePath $testFile -Encoding UTF8
    
    # Convert to WSL path
    $wslTestPath = wsl wslpath "$testFile"
    Write-Host "  Test file: $testFile" -ForegroundColor Gray
    Write-Host "  WSL path: $wslTestPath" -ForegroundColor Gray
    
    # Copy to /tmp/pose-videos
    wsl cp "$wslTestPath" "/tmp/pose-videos/test-copy.txt"
    Write-Host "✓ File copy succeeded" -ForegroundColor Green
    
    # Verify it exists
    $exists = wsl test -f /tmp/pose-videos/test-copy.txt
    Write-Host "✓ File exists in WSL" -ForegroundColor Green
    
    # Clean up
    wsl rm /tmp/pose-videos/test-copy.txt
    Remove-Item -Path $testFile -Force
} catch {
    Write-Host "✗ File copy failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 6: Check Flask wrapper connectivity
Write-Host "TEST 6: Check Flask wrapper connectivity" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://172.24.183.130:5000/health" -TimeoutSec 5
    Write-Host "✓ Flask wrapper is running" -ForegroundColor Green
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Flask wrapper is not responding" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
