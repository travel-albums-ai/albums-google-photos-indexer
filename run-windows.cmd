@echo off
cd /d "%~dp0"
start "" powershell.exe -ExecutionPolicy Bypass -File "%~dp0launcher.ps1"