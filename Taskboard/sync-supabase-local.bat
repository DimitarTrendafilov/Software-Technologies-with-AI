@echo off
cd /d "%~dp0"
echo Syncing Supabase (remote + local)...
npm run db:sync
if errorlevel 1 (
  echo.
  echo Sync failed. Check Supabase login/link and Docker/Supabase local services.
  pause
  exit /b 1
)
echo.
echo Sync completed successfully.
pause
