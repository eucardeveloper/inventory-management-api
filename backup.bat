@echo off
:: Inventory backup: database dump into backups\<timestamp>\ (custom format, restorable with restore.bat).
:: Run from this folder while the stack is up:  .\backup.bat
:: Code is backed up by git (push to GitHub); this script covers the data.
setlocal
cd /d "%~dp0"
for /f %%i in ('powershell -nologo -command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
set DIR=%~dp0backups\%TS%
mkdir "%DIR%"
echo Backing up database to %DIR% ...
docker exec inventory-database pg_dump -U postgres -Fc inventory_db > "%DIR%\inventory_db.dump"
if errorlevel 1 (echo ERROR: dump failed. Is the stack running? & goto :end)
for %%F in ("%DIR%\inventory_db.dump") do if %%~zF LSS 1000 (echo ERROR: dump is suspiciously small & goto :end)
echo OK: %DIR%\inventory_db.dump
echo Test it with:  .\restore.bat %TS%   (replaces the current data)
:end
endlocal
