# PowerShell Launcher for Winaity Template Builder services
$root = $PSScriptRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "      Lancement des microservices Winaity Template Builder            " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Lancement de Auth Service (Port HTTP 3003)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\auth-service'; Write-Host '--- Auth Service (3003) ---' -ForegroundColor Cyan; npm run start:dev"
Start-Sleep -Seconds 2

Write-Host "[2/5] Lancement de Template Service (Port HTTP 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\template-service'; Write-Host '--- Template Service (3002) ---' -ForegroundColor Cyan; npm run start:dev"
Start-Sleep -Seconds 2

Write-Host "[3/5] Lancement de API Gateway (Port HTTP 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\api-gateway'; Write-Host '--- API Gateway (3000) ---' -ForegroundColor Cyan; npm run start:dev"
Start-Sleep -Seconds 2

Write-Host "[4/5] Lancement de AI Template Service (Port HTTP 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\ai-template-service'; Write-Host '--- AI Template Service (8001) ---' -ForegroundColor Cyan; & '$root\.venv\Scripts\uvicorn.exe' app.main:app --reload --port 8001"
Start-Sleep -Seconds 1

Write-Host "[5/5] Lancement de Image Pipeline (Port HTTP 8002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\image-pipeline'; Write-Host '--- Image Pipeline (8002) ---' -ForegroundColor Cyan; & '$root\.venv\Scripts\uvicorn.exe' search_api:app --reload --port 8002"
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "Tous les 5 services sont en cours de demarrage dans leurs fenetres de terminal !" -ForegroundColor Yellow
Write-Host "Optionnel: pour lancer le frontend Next.js (port 3001) :" -ForegroundColor Gray
Write-Host "  cd frontend ; npm run dev" -ForegroundColor Gray
