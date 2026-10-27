@echo off
rem Launcher for IPL Mega Auction 2026 - 4-Team Manual Bidding Console
cd /d "%~dp0"
title IPL Mega Auction 2026 - 4-Team Manual Bidding Console
node live_auction.js
if errorlevel 1 (
    echo.
    echo Node.js not found or error occurred.
    pause
)
