@echo off
echo.
echo [1/3] Building Zentrix Frontend...
cd frontend
npm install && npm run build
if %errorlevel% neq 0 (
    echo Error building frontend.
    exit /b %errorlevel%
)
echo Frontend build complete (dist/ folder created).
cd ..

echo.
echo [2/3] Preparing Backend...
echo Backend is ready in "backend" directory.
echo Ensure you have GROQ_API_KEY in your Render environment variables.

echo.
echo [3/3] Deployment URL Update Needed...
echo Once you deploy your backend to Render:
echo 1. Get your URL (e.g. https://your-ai.onrender.com)
echo 2. Update frontend/.env.local with VITE_API_URL=your_url
echo 3. Run this script again to rebuild the frontend.
echo.
echo [Next Step] Visit https://www.pwabuilder.com/ to convert your hosted site to an APK. ✅
pause
