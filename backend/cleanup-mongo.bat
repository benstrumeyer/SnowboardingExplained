@echo off
echo Stopping all MongoDB containers...
for /f "tokens=1" %%i in ('docker ps -a -q --filter "ancestor=mongo:7.0"') do docker stop %%i
for /f "tokens=1" %%i in ('docker ps -a -q --filter "ancestor=mongo:7.0"') do docker rm %%i

echo Stopping all mongo-express containers...
for /f "tokens=1" %%i in ('docker ps -a -q --filter "ancestor=mongo-express:latest"') do docker stop %%i
for /f "tokens=1" %%i in ('docker ps -a -q --filter "ancestor=mongo-express:latest"') do docker rm %%i

echo Restarting docker-compose...
docker-compose up -d

echo Waiting for MongoDB to be ready...
timeout /t 5

echo Testing connection...
node test-mongo-connection.js

pause
