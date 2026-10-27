# PowerShell Launcher for IPL Auction Web Application
$webDir = Join-Path $PSScriptRoot "web"
Set-Location $webDir
Write-Host "Opening IPL Mega Auction 2026 in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:8000"
Write-Host "Web server running at http://localhost:8000 (Press Ctrl+C to stop)" -ForegroundColor Green
python -m http.server 8000
