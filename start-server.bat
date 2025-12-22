@echo off
echo Starting local web server...
echo.
echo Open your browser and go to: http://localhost:8000
echo.
echo For Android Emulator, use: http://10.0.2.2:8000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python...
    python -m http.server 8000
    goto :end
)

REM Try Python 2
python2 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python 2...
    python2 -m SimpleHTTPServer 8000
    goto :end
)

REM Try Node.js http-server
where npx >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js http-server...
    npx http-server -p 8000
    goto :end
)

echo ERROR: No web server found!
echo.
echo Please install one of the following:
echo   1. Python (https://www.python.org/downloads/)
echo   2. Node.js (https://nodejs.org/)
echo.
echo Or use browser DevTools (F12) to test mobile view directly.
pause

:end

