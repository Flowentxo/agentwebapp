# ═══════════════════════════════════════════════════════
# 🏖️ SINTRA SYSTEM - Holiday/Offline Mode Setup
# ═══════════════════════════════════════════════════════

Write-Host "🏖️ Starting SINTRA Offline Environment..." -ForegroundColor Cyan

# Check Docker
docker ps | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Start Containers
Write-Host "🚀 Starting Containers (Postgres, Redis, MongoDB)..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.offline.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers." -ForegroundColor Red
    exit 1
}

# Wait for health
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Display Info
Write-Host "`n✅ Offline Environment Ready!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Update your .env.local with these values:" -ForegroundColor Cyan

Write-Host "`n[PostgreSQL]" -ForegroundColor White
Write-Host "DATABASE_URL=postgresql://postgres:postgres_password_local@localhost:5432/brain_ai" -ForegroundColor Gray

Write-Host "`n[Redis]" -ForegroundColor White
Write-Host "REDIS_URL=redis://:redis_password_local@localhost:6379" -ForegroundColor Gray

Write-Host "`n[MongoDB]" -ForegroundColor White
Write-Host "MONGODB_URI=mongodb://mongo_user:mongo_password_local@localhost:27017" -ForegroundColor Gray

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "To stop: docker compose -f docker/docker-compose.offline.yml down" -ForegroundColor Yellow
