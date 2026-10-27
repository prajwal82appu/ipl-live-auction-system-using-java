@echo off
rem Launcher for IPL Player Auction Management System
cd /d "%~dp0IPL-Auction-System"
if not exist out mkdir out
javac -d out src\ipl\*.java
if errorlevel 1 (
    echo Compilation failed.
    pause
    exit /b 1
)
java -cp out ipl.Main
