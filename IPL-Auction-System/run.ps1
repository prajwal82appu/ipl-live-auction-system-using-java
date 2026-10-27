# PowerShell launcher for IPL Player Auction System
$projectDir = Join-Path $PSScriptRoot "IPL-Auction-System"
Set-Location $projectDir
if (!(Test-Path "out")) {
    New-Item -ItemType Directory -Path "out" -Force | Out-Null
}
Write-Host "Compiling IPL Auction System..." -ForegroundColor Cyan
javac -d out (Get-ChildItem src\ipl\*.java)
if ($LASTEXITCODE -eq 0) {
    Write-Host "Starting IPL Auction GUI..." -ForegroundColor Green
    java -cp out ipl.Main
} else {
    Write-Host "Compilation failed with error code $LASTEXITCODE" -ForegroundColor Red
}
