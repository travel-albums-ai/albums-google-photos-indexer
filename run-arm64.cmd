@echo off
cd /d "%~dp0"
node.exe server.mjs --config server-config.json %*
