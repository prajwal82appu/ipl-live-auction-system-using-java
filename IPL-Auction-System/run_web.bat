@echo off
rem Launcher for IPL Auction Web Application
cd /d "%~dp0web"
echo Starting IPL Mega Auction 2026 Web Server...
start "" "http://localhost:8000"
python -m http.server 8000
if errorlevel 1 (
    echo Python not found, opening index.html directly...
    start "" "%~dp0web\index.html"
)
