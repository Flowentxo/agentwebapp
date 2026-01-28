# ============================================
# Cloud Run Deployment Script (Interactive)
# ============================================

Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Cyan

# Function to prompt for secret if not set
function Get-Secret {
    param (
        [string]$Name,
        [string]$CurrentValue
    )

    if ($CurrentValue -like "*YOUR_*") {
        $Input = Read-Host "🔑 Enter value for $Name"
        if ([string]::IsNullOrWhiteSpace($Input)) {
            Write-Host "❌ $Name is required!" -ForegroundColor Red
            exit 1
        }
        return $Input
    }
    return $CurrentValue
}

# Configuration
$DATABASE_URL = "postgresql-url-placeholder"
$REDIS_URL = "redis-url-placeholder"
$MONGODB_URI = "mongodb-url-placeholder"
$OPENAI_API_KEY = "openai-key-placeholder"
$JWT_SECRET = "jwt-secret-placeholder"
$JWT_REFRESH_SECRET = "jwt-refresh-secret-placeholder"
$SESSION_SECRET = "session-secret-placeholder"
$ENCRYPTION_KEY = "encryption-key-placeholder"
$CSRF_SECRET = "csrf-secret-placeholder"

# Prompt for secrets
Write-Host "`n📝 Configuration Check:" -ForegroundColor Yellow
$DATABASE_URL = Get-Secret -Name "DATABASE_URL" -CurrentValue "YOUR_DATABASE_URL"
$REDIS_URL = Get-Secret -Name "REDIS_URL" -CurrentValue "YOUR_REDIS_URL"
$MONGODB_URI = Get-Secret -Name "MONGODB_URI" -CurrentValue "YOUR_MONGODB_URI"
$OPENAI_API_KEY = Get-Secret -Name "OPENAI_API_KEY" -CurrentValue "YOUR_OPENAI_API_KEY"
$JWT_SECRET = Get-Secret -Name "JWT_SECRET" -CurrentValue "YOUR_JWT_SECRET"
$JWT_REFRESH_SECRET = Get-Secret -Name "JWT_REFRESH_SECRET" -CurrentValue "YOUR_JWT_REFRESH_SECRET"
$SESSION_SECRET = Get-Secret -Name "SESSION_SECRET" -CurrentValue "YOUR_SESSION_SECRET"
$ENCRYPTION_KEY = Get-Secret -Name "ENCRYPTION_KEY" -CurrentValue "YOUR_ENCRYPTION_KEY"
$CSRF_SECRET = Get-Secret -Name "CSRF_SECRET" -CurrentValue "YOUR_CSRF_SECRET"

Write-Host "`n✅ Configuration complete" -ForegroundColor Green

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dependency installation failed!" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "`n🔨 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy
Write-Host "`n📦 Deploying to Cloud Run..." -ForegroundColor Yellow
$envVars = "NODE_ENV=production,DATABASE_URL=$DATABASE_URL,REDIS_URL=$REDIS_URL,MONGODB_URI=$MONGODB_URI,OPENAI_API_KEY=$OPENAI_API_KEY,JWT_SECRET=$JWT_SECRET,JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET,SESSION_SECRET=$SESSION_SECRET,ENCRYPTION_KEY=$ENCRYPTION_KEY,CSRF_SECRET=$CSRF_SECRET"

gcloud run deploy ai-agent-webapp `
    --source . `
    --region europe-west3 `
    --allow-unauthenticated `
    --set-env-vars=$envVars `
    --memory=1Gi `
    --cpu=1 `
    --timeout=300 `
    --max-instances=10

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    gcloud run services describe ai-agent-webapp --region europe-west3 --format='value(status.url)'
}
else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
}
