# Restart MongoDB Docker containers
Write-Host "Stopping Docker containers..."
docker-compose down -v --remove-orphans

Write-Host "Starting Docker containers..."
docker-compose up -d

Write-Host "Waiting for MongoDB to be ready..."
Start-Sleep -Seconds 5

Write-Host "Checking MongoDB status..."
docker ps | Select-String "snowboarding-mongodb"

Write-Host "Done! MongoDB should be running now."
