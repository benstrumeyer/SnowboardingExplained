@echo off
echo ========================================
echo Scraping ALL videos from channel
echo ========================================
echo.
echo IMPORTANT: If you have existing videos in Pinecone,
echo run extract-existing.bat FIRST to avoid duplicates!
echo.
echo This will:
echo - Scrape all ~200 videos from the channel
echo - Skip videos already in database
echo - Respect rate limits (safe to leave running)
echo - Auto-retry on failures
echo.
echo Press Ctrl+C to stop at any time
echo (Progress is saved, you can resume later)
echo.
pause

npx tsx scripts/playwright-scrape-pinecone.ts

echo.
echo ========================================
echo Scraping complete!
echo ========================================
pause
