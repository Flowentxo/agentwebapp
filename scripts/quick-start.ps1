# ========================================
# QUICK START SCRIPT
# One-command development environment setup
# ========================================

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\luis\Desktop\Flowent-AI-Agent"

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  COLLABORATION LAB V2 - QUICK START   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
    exit 1
}

try {
    docker ps | Out-Null
    Write-Host "  ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker not running! Please start Docker Desktop" -ForegroundColor Red
    exit 1
}

if (Test-Path "$ProjectRoot\.env.local") {
    Write-Host "  ✅ .env.local found" -ForegroundColor Green
} else {
    Write-Host "  ❌ .env.local not found!" -ForegroundColor Red
    exit 1
}

# Step 2: Clean up existing processes
Write-Host "`n[2/6] Cleaning up existing processes..." -ForegroundColor Yellow

Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Write-Host "  ✅ Ports cleaned" -ForegroundColor Green

# Step 3: Start database services
Write-Host "`n[3/6] Starting database services..." -ForegroundColor Yellow

docker start crm-postgres | Out-Null
docker start crm-redis | Out-Null
Start-Sleep -Seconds 3

Write-Host "  ✅ PostgreSQL started" -ForegroundColor Green
Write-Host "  ✅ Redis started" -ForegroundColor Green

# Step 4: Verify database connections
Write-Host "`n[4/6] Verifying database connections..." -ForegroundColor Yellow

try {
    # Test PostgreSQL
    $pgStatus = docker exec crm-postgres pg_isready -U postgres 2>&1
    if ($pgStatus -match "accepting connections") {
        Write-Host "  ✅ PostgreSQL ready" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  PostgreSQL check failed" -ForegroundColor Yellow
}

try {
    # Test Redis
    $redisStatus = docker exec crm-redis redis-cli ping 2>&1
    if ($redisStatus -match "PONG") {
        Write-Host "  ✅ Redis ready" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Redis check failed" -ForegroundColor Yellow
}

# Step 5: Start development servers
Write-Host "`n[5/6] Starting development servers..." -ForegroundColor Yellow
Write-Host "  This will open a new window..." -ForegroundColor Gray

Set-Location $ProjectRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm run dev" -WindowStyle Normal

Write-Host "  ✅ Development servers starting..." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Cyan

# Step 6: Wait and open browser
Write-Host "`n[6/6] Waiting for servers to be ready..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0
$frontendReady = $false

while ($attempt -lt $maxAttempts -and !$frontendReady) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if ($frontendReady) {
    Write-Host "  ✅ Servers ready!" -ForegroundColor Green

    Write-Host "`n[SUCCESS] Opening Collaboration Lab..." -ForegroundColor Green
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000/agents/collaborate"

    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  🚀 DEVELOPMENT ENVIRONMENT READY!    ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Collaboration Lab: http://localhost:3000/agents/collaborate" -ForegroundColor Cyan
    Write-Host "📍 API Health:        http://localhost:4000/api/health" -ForegroundColor Cyan
    Write-Host "📍 Database Studio:   npm run db:studio" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Useful Commands:" -ForegroundColor Yellow
    Write-Host "   - Run tests:       .\scripts\api-test-suite.ps1" -ForegroundColor Gray
    Write-Host "   - Sprint tools:    .\scripts\sprint-automation.ps1" -ForegroundColor Gray
    Write-Host "   - Stop servers:    .\scripts\stop-all.ps1" -ForegroundColor Gray
    Write-Host ""

} else {
    Write-Host "  ⚠️  Servers not ready after $maxAttempts attempts" -ForegroundColor Yellow
    Write-Host "  Check the server window for errors" -ForegroundColor Yellow
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
