@echo off
title home-agent (local)

echo [1/2] Starting backend (FastAPI :8000) ...
start "backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --reload --port 8000"

echo [2/2] Starting frontend (Vite :5173) ...
start "frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Both servers launched in separate windows.
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo.
