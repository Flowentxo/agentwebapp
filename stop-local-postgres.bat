@echo off
echo ========================================
echo Stopping Local PostgreSQL Service
echo ========================================
echo.

net stop postgresql-x64-16

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ PostgreSQL service stopped successfully!
    echo.
    echo Now run: npx tsx scripts/direct-test.ts
    echo.
) else (
    echo.
    echo ❌ Failed to stop service. Make sure you run this as Administrator:
    echo    1. Right-click this file
    echo    2. Select "Run as administrator"
    echo.
)

pause
