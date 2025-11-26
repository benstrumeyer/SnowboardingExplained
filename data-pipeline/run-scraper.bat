@echo off
echo Running Playwright YouTube Scraper...
echo.

cd /d "%~dp0"

call npx tsx scripts\playwright-scrape.ts

echo.
echo Done!
pause
