@echo off
title AI Interview Strategist - Launching...
color 0b
cd /d "%~dp0"

echo ===============================================================================
echo            AI-Powered Career Strategist ^& Tailored Resume Platform
echo ===============================================================================
echo.
echo [1/4] Verifying Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js ^(v18+^) from https://nodejs.org/
    pause
    exit /b 1
)

echo [2/4] Checking dependencies...
if not exist "Backend\node_modules" (
    echo      Installing backend packages ^(first run only^)...
    call npm --prefix Backend install
)
if not exist "Frontend\node_modules" (
    echo      Installing frontend packages ^(first run only^)...
    call npm --prefix Frontend install
)

if not exist "Backend\.env" (
    if exist "Backend\.env.example" (
        copy "Backend\.env.example" "Backend\.env" >nul
        echo [WARN] Backend\.env was missing - created from .env.example.
        echo        Open Backend\.env and add your GOOGLE_GENAI_API_KEY and JWT_SECRET.
    )
)

echo [3/4] Starting Backend Server (Port 3000)...
start "Backend Server (Port 3000)" cmd /k "cd Backend && npm run dev"

echo [4/4] Starting Frontend Vite Server (Port 5173)...
start "Frontend Client (Port 5173)" cmd /k "cd Frontend && npm run dev"

echo.
echo ===============================================================================
echo   Servers are launching!
echo   - Backend API:    http://localhost:3000
echo   - API Health:     http://localhost:3000/api/health
echo   - Frontend UI:    http://localhost:5173
echo.
echo   Opening browser in 5 seconds...
echo ===============================================================================
timeout /t 5 >nul
start http://localhost:5173

echo.
echo Both servers are active in separate terminal windows.
echo To stop them, simply close those terminal windows.
echo.
