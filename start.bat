@echo off
title Namma Warehouse Launcher
echo ==========================================================
echo   Starting Namma Warehouse (Backend + Frontend)
echo ==========================================================
echo.

echo [0/2] Installing/Verifying Python dependencies from requirements.txt...
python -m pip install -r "%~dp0requirements.txt"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Dependency installation encountered issues. Attempting to proceed...
)
echo.

echo [1/2] Starting Python FastAPI Backend on port 8000...
start "GRIDPOINT Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting for backend to initialize...
timeout /t 2 /nobreak >nul

echo [2/2] Starting React + Vite Frontend on port 3000...
start "Namma Warehouse Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers have been launched!
echo Opening http://localhost:3000 in your browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo You can keep the two server terminal windows minimized.
echo ==========================================================
