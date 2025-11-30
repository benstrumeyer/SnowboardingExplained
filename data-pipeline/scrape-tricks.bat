@echo off
echo ========================================
echo Trick Tutorial Scraper
echo ========================================
echo.
echo Step 1: Scraping playlist and extracting tips...
npx tsx scripts/scrape-trick-playlist.ts
if errorlevel 1 (
    echo Error during scraping!
    pause
    exit /b 1
)
echo.
echo Step 2: Uploading to Pinecone...
npx tsx scripts/upload-trick-tutorials.ts
if errorlevel 1 (
    echo Error during upload!
    pause
    exit /b 1
)
echo.
echo ========================================
echo Done! Trick tutorials are now in Pinecone
echo ========================================
pause
