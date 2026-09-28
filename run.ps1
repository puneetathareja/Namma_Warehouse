# Namma Warehouse - Quick Start Script (PowerShell)
# Launches both FastAPI Backend and Vite Frontend

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting Namma Warehouse (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$ROOT_DIR = $PSScriptRoot

# 1. Start FastAPI Backend in a new terminal window
Write-Host "[1/2] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\backend'; Write-Host 'FastAPI Backend Running on http://127.0.0.1:8000' -ForegroundColor Green; python -m uvicorn app:app --port 8000 --reload"

# Wait 2 seconds for backend to bind port
Start-Sleep -Seconds 2

# 2. Start Vite Frontend in a new terminal window
Write-Host "[2/2] Starting React + Vite Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\frontend'; Write-Host 'Vite Frontend Running on http://localhost:3000' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Both servers launched successfully!" -ForegroundColor Green
Write-Host "Open your browser at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API docs available at:  http://127.0.0.1:8000/docs" -ForegroundColor DarkCyan
Write-Host "==========================================================" -ForegroundColor Cyan
