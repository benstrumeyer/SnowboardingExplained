@echo off
echo ========================================
echo Extract Existing Videos from Pinecone
echo ========================================
echo.
echo This will query your Pinecone database
echo and create a list of already-processed videos.
echo.
echo Run this BEFORE scrape-all-videos.bat
echo if you already have videos in Pinecone!
echo.
pause

npx tsx scripts/extract-existing-videos.ts

echo.
echo ========================================
echo Extraction complete!
echo ========================================
echo.
echo Now you can run scrape-all-videos.bat
echo and it will skip the existing videos.
echo.
pause
