# PowerShell Launcher for IPL Mega Auction 2026 Interactive Console CLI
$host.UI.RawUI.WindowTitle = "IPL Mega Auction 2026 - Console System"
Set-Location $PSScriptRoot

if (Get-Command node -ErrorAction SilentlyContinue) {
    node "$PSScriptRoot\cli.js"
} else {
    Write-Host "Node.js not detected. Running Java console demo..." -ForegroundColor Yellow
    Set-Location (Join-Path $PSScriptRoot "IPL-Auction-System")
    if (-not (Test-Path "out")) { New-Item -ItemType Directory -Path "out" | Out-Null }
    javac -d out src/ipl/*.java
    java -cp out ipl.ConsoleDemo
}
