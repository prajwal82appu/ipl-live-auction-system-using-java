@echo off
rem Launcher for IPL Mega Auction 2026 Interactive Console CLI
cd /d "%~dp0"
title IPL Mega Auction 2026 - Console System
node cli.js
if errorlevel 1 (
    echo.
    echo Node.js not found or error occurred. Attempting Java Console Demo...
    cd /d "%~dp0IPL-Auction-System"
    if not exist out mkdir out
    javac -d out src\ipl\*.java
    java -cp out ipl.ConsoleDemo
    pause
)
