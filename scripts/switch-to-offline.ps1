# ═══════════════════════════════════════════════════════
# 🏖️ SINTRA SYSTEM - Switch to Offline Mode
# ═══════════════════════════════════════════════════════

Write-Host "🏖️ Switching to Offline Configuration..." -ForegroundColor Cyan

$envLocalPath = ".env.local"
$backupPath = ".env.local.backup"

# Backup existing .env.local
if (Test-Path $envLocalPath) {
    Write-Host "📦 Backing up .env.local to .env.local.backup" -ForegroundColor Yellow
    Copy-Item $envLocalPath $backupPath -Force
}

# Create new offline .env.local content using an array to avoid here-string issues
$offlineContent = @(
    "# ============================================",
    "# OFFLINE MODE CONFIGURATION",
    "# ============================================",
    "NODE_ENV=development",
    "NEXT_PUBLIC_API_URL=http://localhost:3000",
    "NEXT_PUBLIC_WS_URL=ws://localhost:3000",
    "",
    "# Database (Local Docker)",
    "DATABASE_URL=postgresql://postgres:postgres_password_local@localhost:5432/brain_ai",
    "",
    "# Redis (Local Docker)",
    "REDIS_URL=redis://:redis_password_local@localhost:6379",
    "",
    "# MongoDB (Local Docker)",
    "MONGODB_URI=mongodb://mongo_user:mongo_password_local@localhost:27017",
    "",
    "# MinIO (Local S3 Replacement)",
    "AWS_ACCESS_KEY_ID=minio_user",
    "AWS_SECRET_ACCESS_KEY=minio_password_local",
    "AWS_REGION=us-east-1",
    "AWS_S3_BUCKET=flowent-ai-files",
    "AWS_ENDPOINT=http://localhost:9000",
    "AWS_USE_PATH_STYLE_ENDPOINT=true",
    "",
    "# OpenAI (Keep existing key if available, or use local)",
    "# To use local Ollama, uncomment the line below:",
    "# OPENAI_BASE_URL=http://localhost:11434/v1",
    "OPENAI_API_KEY=sk-placeholder-offline-mode",
    "",
    "# Security Secrets (Generated for offline dev)",
    "JWT_SECRET=offline_dev_secret_min_32_chars_long_12345",
    "JWT_REFRESH_SECRET=offline_dev_refresh_secret_min_32_chars_123",
    "SESSION_SECRET=offline_dev_session_secret_min_32_chars_123",
    "ENCRYPTION_KEY=offline_dev_encryption_key_32ch!",
    "CSRF_SECRET=offline_dev_csrf_secret_min_32_chars_123",
    "",
    "# Feature Flags",
    "ENABLE_REDIS_CACHE=true",
    "ENABLE_BROWSER_CACHE=false"
)

# Write new .env.local
$offlineContent | Set-Content -Path $envLocalPath
Write-Host "✅ Created offline .env.local" -ForegroundColor Green

# Update start-offline-env.ps1 to include MinIO check
Write-Host "🚀 Starting Offline Environment..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File scripts/start-offline-env.ps1

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "✅ Offline Mode Activated!" -ForegroundColor Green
Write-Host "   - Database: Local Postgres" -ForegroundColor White
Write-Host "   - Cache: Local Redis" -ForegroundColor White
Write-Host "   - Storage: Local MinIO (http://localhost:9001)" -ForegroundColor White
Write-Host "   - AI: OpenAI (Requires Internet) or Local Ollama" -ForegroundColor White
Write-Host "`n💡 To restore original config: Copy .env.local.backup to .env.local" -ForegroundColor Yellow
