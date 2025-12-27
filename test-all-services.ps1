#!/usr/bin/env pwsh
# Test all services after startup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$services = @(
    @{ Name = "Flask (Pose Service)"; URL = "http://localhost:5000/health"; Port = 5000 },
    @{ Name = "Backend API"; URL = "http://localhost:5001"; Port = 5001 },
    @{ Name = "Frontend"; URL = "http://localhost:3000"; Port = 3000 },
    @{ Name = "MongoDB"; URL = "localhost:27017"; Port = 27017 },
    @{ Name = "Redis"; URL = "localhost:6379"; Port = 6379 }
)

$results = @()

foreach ($service in $services) {
    Write-Host "`nTesting $($service.Name)..." -ForegroundColor Yellow
    
    try {
        if ($service.Name -eq "Flask (Pose Service)") {
            $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 5 -ErrorAction Stop
            $json = $response.Content | ConvertFrom-Json
            Write-Host "  ✓ Status: $($json.status)" -ForegroundColor Green
            Write-Host "  ✓ Device: $($json.device)" -ForegroundColor Green
            Write-Host "  ✓ Models: HMR2=$($json.models.hmr2), PHALP=$($json.models.phalp)" -ForegroundColor Green
            $results += @{ Service = $service.Name; Status = "OK" }
        }
        elseif ($service.Name -eq "Backend API") {
            $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  ✓ Backend is responding" -ForegroundColor Green
            $results += @{ Service = $service.Name; Status = "OK" }
        }
        elseif ($service.Name -eq "Frontend") {
            $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  ✓ Frontend is responding" -ForegroundColor Green
            $results += @{ Service = $service.Name; Status = "OK" }
        }
        else {
            # For MongoDB and Redis, just check if port is open
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.Connect("localhost", $service.Port)
            $tcpClient.Close()
            Write-Host "  ✓ Port $($service.Port) is open" -ForegroundColor Green
            $results += @{ Service = $service.Name; Status = "OK" }
        }
    }
    catch {
        Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{ Service = $service.Name; Status = "FAILED" }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$results | ForEach-Object {
    $color = if ($_.Status -eq "OK") { "Green" } else { "Red" }
    Write-Host "$($_.Service): $($_.Status)" -ForegroundColor $color
}

$passCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$totalCount = $results.Count

Write-Host "`nPassed: $passCount/$totalCount" -ForegroundColor Cyan

if ($passCount -eq $totalCount) {
    Write-Host "`n✓ All services are running!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor Yellow
    Write-Host "  1. Open http://localhost:3000 in your browser" -ForegroundColor Cyan
    Write-Host "  2. Upload a video to test the full pipeline" -ForegroundColor Cyan
    Write-Host "  3. Monitor Flask logs for pose estimation progress" -ForegroundColor Cyan
}
else {
    Write-Host "`n✗ Some services are not running" -ForegroundColor Red
    Write-Host "`nCheck the startup terminals for errors" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
