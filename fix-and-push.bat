@echo off
REM Run this from a terminal opened INSIDE your project folder (where wrangler.toml is):
REM    s21-fix\fix-and-push.bat
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix.ps1" -Project "%CD%"
pause
