# ========================================
# STOP ALL SERVICES
# Clean shutdown of all development services
# ========================================

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║  STOPPING ALL SERVICES...             ║" -ForegroundColor Red
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# Stop Frontend (Port 3000)
Write-Host "[1/4] Stopping Frontend (Port 3000)..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Stopped process $_" -ForegroundColor Green
    }

# Stop Backend (Port 4000)
Write-Host "`n[2/4] Stopping Backend (Port 4000)..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Stopped process $_" -ForegroundColor Green
    }

# Stop Node processes (cleanup)
Write-Host "`n[3/4] Cleaning up Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -match "npm|sintra" } |
    ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Stopped Node process $($_.Id)" -ForegroundColor Green
    }

# Optional: Stop Docker containers
Write-Host "`n[4/4] Docker containers..." -ForegroundColor Yellow
$stopDocker = Read-Host "Stop Docker containers? (y/N)"

if ($stopDocker -eq "y" -or $stopDocker -eq "Y") {
    docker stop crm-postgres 2>&1 | Out-Null
    docker stop crm-redis 2>&1 | Out-Null
    Write-Host "  ✅ PostgreSQL stopped" -ForegroundColor Green
    Write-Host "  ✅ Redis stopped" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Docker containers left running" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ ALL SERVICES STOPPED              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "To restart: .\scripts\quick-start.ps1" -ForegroundColor Cyan
Write-Host ""
