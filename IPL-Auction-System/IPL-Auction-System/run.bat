@echo off
rem Compile and run the IPL Auction (Windows). Run from the project root.
if not exist out mkdir out
javac -d out src\ipl\*.java
if errorlevel 1 pause & exit /b 1
java -cp out ipl.Main
