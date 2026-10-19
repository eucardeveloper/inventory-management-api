@echo off
:: Inventory restore. Usage:  .\restore.bat 20261019_180000
:: WARNING: replaces the current database with the contents of the chosen backup.
setlocal
cd /d "%~dp0"
if "%~1"=="" (echo Usage: .\restore.bat YYYYMMDD_HHMMSS & goto :end)
set FILE=%~dp0backups\%~1\inventory_db.dump
if not exist "%FILE%" (echo ERROR: backup not found: %FILE% & goto :end)
set /p OK=This replaces the current data with %~1. Type YES to continue: 
if /i not "%OK%"=="YES" (echo Cancelled. & goto :end)
docker compose stop inventory-backend
docker compose up -d inventory-database
docker exec -i inventory-database pg_restore -U postgres -d inventory_db --clean --if-exists --no-owner < "%FILE%"
docker compose up -d
echo Restore finished. Wait about a minute, then open http://localhost:3002 and check the data.
:end
endlocal
