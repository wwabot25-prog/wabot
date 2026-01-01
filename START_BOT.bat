@echo off
title WhatsApp Bot Honda - Starting...
color 0A

echo ========================================
echo   WhatsApp Bot Honda - Auto Starter
echo ========================================
echo.
echo [INFO] Starting bot...
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Bot is starting...
echo [INFO] Scan QR code with WhatsApp when it appears
echo [INFO] Press Ctrl+C to stop the bot
echo.
echo ========================================
echo.

npm start

pause
