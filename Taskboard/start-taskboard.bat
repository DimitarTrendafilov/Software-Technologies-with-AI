@echo off
cd /d "%~dp0"
echo Starting Taskboard dev server...
npm run dev
if errorlevel 1 (
  echo.
  echo Failed to start. Check Node.js/npm installation and run npm install if needed.
  pause
)
