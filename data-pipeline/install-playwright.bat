@echo off
echo Installing Playwright...
node node_modules\npm\bin\npm-cli.js install playwright
echo.
echo Installing Playwright browsers...
node node_modules\playwright\cli.js install chromium
echo.
echo Done! Now run: node node_modules\tsx\dist\cli.mjs scripts\playwright-scrape.ts
