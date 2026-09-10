@echo off
title Winaity Template Builder Launcher
echo ======================================================================
echo           Demarrage des microservices Winaity Template Builder
echo ======================================================================
echo.

echo [1/5] Lancement de Auth Service (Port gRPC 50055)...
start "Auth Service (50055)" cmd /k "cd /d "%~dp0auth-service" && npm run start:dev"
ping -n 3 127.0.0.1 >nul

echo [2/5] Lancement de Template Service (Port gRPC 50054)...
start "Template Service (50054)" cmd /k "cd /d "%~dp0template-service" && npm run start:dev"
ping -n 3 127.0.0.1 >nul

echo [3/5] Lancement de API Gateway (Port HTTP 3000)...
start "API Gateway (3000)" cmd /k "cd /d "%~dp0api-gateway" && npm run start:dev"
ping -n 3 127.0.0.1 >nul

echo [4/5] Lancement de AI Template Service (Port HTTP 8001)...
start "AI Template Service (8001)" cmd /k "cd /d "%~dp0ai-template-service" && "..\.venv\Scripts\uvicorn.exe" app.main:app --reload --port 8001"
ping -n 2 127.0.0.1 >nul

echo [5/5] Lancement de Image Pipeline (Port HTTP 8002)...
start "Image Pipeline (8002)" cmd /k "cd /d "%~dp0image-pipeline" && "..\.venv\Scripts\uvicorn.exe" search_api:app --reload --port 8002"
ping -n 2 127.0.0.1 >nul

echo.
echo ======================================================================
echo  Tous les 5 services ont ete lances dans leurs terminaux respectifs !
echo ======================================================================
echo.
echo Pour lancer le Frontend Next.js (port 3001) si besoin:
echo   cd frontend ^&^& npm run dev
echo.
pause
