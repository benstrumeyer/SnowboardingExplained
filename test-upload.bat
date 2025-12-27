@echo off
setlocal enabledelayedexpansion

set VIDEO_PATH=C:\Users\benja\OneDrive\Desktop\clips\not.mov
set API_URL=http://localhost:3001/api/upload-video-with-pose

if not exist "%VIDEO_PATH%" (
    echo Error: Video file not found
    exit /b 1
)

echo Uploading video...
curl -X POST -F "video=@%VIDEO_PATH%" -F "role=rider" %API_URL%

echo.
echo Done
