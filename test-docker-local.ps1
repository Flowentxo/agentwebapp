# ============================================
# Local Docker Test Script
# Nutzt deine lokale Offline-Umgebung
# ============================================

Write-Host "🔍 Testing Docker Container Locally..." -ForegroundColor Cyan
Write-Host "📦 Using local offline environment (Postgres:5435, Redis:6379, Mongo:27017)" -ForegroundColor Yellow

# Lokale Datenbanken (aus deiner Offline-Umgebung)
# WICHTIG: Docker Container braucht "host.docker.internal" statt "localhost"
$DATABASE_URL = "postgresql://postgres:postgres_password_local@host.docker.internal:5435/brain_ai"
$REDIS_URL = "redis://:redis_password_local@host.docker.internal:6379"
$MONGODB_URI = "mongodb://mongo_user:mongo_password_local@host.docker.internal:27017"

# OpenAI Key - Ersetze mit deinem echten Key oder nutze Placeholder für Test
$OPENAI_API_KEY = "sk-placeholder-for-local-test"

# Security Secrets (für lokalen Test OK)
$JWT_SECRET = "local_test_secret_minimum_32_characters_long"
$JWT_REFRESH_SECRET = "local_test_refresh_secret_32_chars_min"
$SESSION_SECRET = "local_test_session_secret_32_chars_min"
$ENCRYPTION_KEY = "local_test_encryption_key_32_char"
$CSRF_SECRET = "local_test_csrf_secret_32_chars_min"

Write-Host "`n📦 Step 1: Building Docker Image..." -ForegroundColor Yellow
docker build -t ai-agent-webapp-test .

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Build fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Prüfe das Dockerfile und die Logs oben." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ Build erfolgreich!" -ForegroundColor Green
Write-Host "`n🚀 Step 2: Starting Container on Port 8080..." -ForegroundColor Yellow
Write-Host "   (Container nutzt deine lokalen Datenbanken via host.docker.internal)" -ForegroundColor Gray

# Starte Container
docker run -p 8080:8080 `
    --add-host=host.docker.internal:host-gateway `
    -e PORT=8080 `
    -e NODE_ENV=production `
    -e DATABASE_URL=$DATABASE_URL `
    -e REDIS_URL=$REDIS_URL `
    -e MONGODB_URI=$MONGODB_URI `
    -e OPENAI_API_KEY=$OPENAI_API_KEY `
    -e JWT_SECRET=$JWT_SECRET `
    -e JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET `
    -e SESSION_SECRET=$SESSION_SECRET `
    -e ENCRYPTION_KEY=$ENCRYPTION_KEY `
    -e CSRF_SECRET=$CSRF_SECRET `
    -e AWS_ACCESS_KEY_ID=minio_user `
    -e AWS_SECRET_ACCESS_KEY=minio_password_local `
    -e AWS_ENDPOINT=http://host.docker.internal:9000 `
    -e AWS_REGION=us-east-1 `
    -e AWS_S3_BUCKET=flowent-ai-files `
    ai-agent-webapp-test

# Container läuft jetzt
# In einem anderen Terminal testen:
# curl http://localhost:8080/api/ping
