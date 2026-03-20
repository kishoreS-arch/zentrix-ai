@echo off
echo ======================================================
echo    🚀 STARTING THE SEC AI - PROFESSIONAL React EDITION
echo ======================================================
echo.

:: 1. Start Backend in a new window
echo [STEP 1/2] Starting Python FastAPI Backend on Port 8000...
cd backend
start "SEC AI BACKEND" .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
echo.

:: 2. Start Frontend Server in a new window
echo [STEP 2/2] Starting Frontend React Environment...
cd ../frontend
start "SEC AI FRONTEND" npm run dev

echo.

echo ======================================================
echo    ✅ SYSTEM OPERATIONAL
echo    - BACKEND: http://127.0.0.1:8000
echo    - FRONTEND: http://127.0.0.1:5000
echo ======================================================
echo.
pause
