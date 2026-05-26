# WearYourStyle One-Click Startup Script
Write-Host ">>> WearYourStyle: AI Fashion Ecosystem Start-up Sequence..." -ForegroundColor Cyan

$ports = @(3000, 5000, 5174)

Write-Host "`nStep 1: Cleaning up existing port usage..." -ForegroundColor Yellow
foreach ($port in $ports) {
    try {
        $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($proc) {
            $pids = $proc.OwningProcess | Select-Object -Unique
            foreach ($pid in $pids) {
                Write-Host "Forcefully terminating process on port $port (PID: $pid)..."
                taskkill /F /PID $pid /T
            }
        }
    } catch {
        # Catch errors if port is not in use or process can't be stopped
    }
}

Write-Host "OK: Ports cleared and ready!" -ForegroundColor Green

Write-Host "`nStep 2: Launching Microservices in separate windows..." -ForegroundColor Cyan

# 1. Start Server (Node.js)
Write-Host "[1/3] Launching Backend Server (Port 3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Server; npm run dev"

# 2. Start ML Server (Python)
Write-Host "[2/3] Launching AI ML Server (Port 5000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd MlServer; if (Test-Path '.\venv\Scripts\python.exe') { .\venv\Scripts\python.exe main.py } else { python main.py }"

# 3. Start Client (Frontend)
Write-Host "[3/3] Launching React Client (Port 5174)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Client; npm run dev"

Write-Host "`nAll services are launching! Check the new terminal windows for logs." -ForegroundColor Green
Write-Host "Access the app at: http://localhost:5174" -ForegroundColor Yellow
