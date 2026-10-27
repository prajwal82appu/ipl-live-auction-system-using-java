# PowerShell Launcher for IPL Mega Auction 2026 - 4-Team Manual Bidding Console
$host.UI.RawUI.WindowTitle = "IPL Mega Auction 2026 - 4-Team Manual Bidding Console"
Set-Location $PSScriptRoot

if (Get-Command node -ErrorAction SilentlyContinue) {
    node "$PSScriptRoot\live_auction.js"
} else {
    Write-Host "Node.js not detected. Please install Node.js to run the interactive console." -ForegroundColor Red
}
