@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo Git Commit + Push + Firebase Deploy
echo ==========================================
echo.

set /p COMMIT_MSG=Enter commit message: 

if "%COMMIT_MSG%"=="" (
    echo.
    echo ERROR: Commit message is required.
    pause
    exit /b 1
)

echo.
echo [1/5] Checking for changes...
git status --short

echo.
echo [2/5] Staging files...
git add -A
if errorlevel 1 goto :fail

echo.
echo [3/5] Creating commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo.
    echo Commit failed. If there were no changes, nothing was committed.
    goto :fail
)

echo.
echo [4/5] Pushing to origin/main...
git push origin main
if errorlevel 1 goto :fail

echo.
echo [5/5] Deploying to Firebase Hosting...
firebase.cmd deploy --only hosting
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo Done
echo ==========================================
echo.
echo Live site:
echo https://todo-ledger.web.app
echo.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo Failed
echo ==========================================
echo Review the output above.
echo.
pause
exit /b 1
