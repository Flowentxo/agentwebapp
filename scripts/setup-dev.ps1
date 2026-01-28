# =============================================================================
# SINTRA.AI - Developer Setup Script (Windows PowerShell)
# =============================================================================
# This script sets up a complete development environment for SINTRA.AI
# Run: .\scripts\setup-dev.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# Colors
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warn { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Header
Write-Host ""
Write-Host "==============================================" -ForegroundColor Blue
Write-Host "       SINTRA.AI Development Setup" -ForegroundColor Blue
Write-Host "==============================================" -ForegroundColor Blue
Write-Host ""

# =============================================================================
# Prerequisites Check
# =============================================================================
Write-Info "Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 20) {
        Write-Error "Node.js version must be 20.x or higher. Current: $nodeVersion"
        exit 1
    }
    Write-Success "Node.js $nodeVersion found"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js 20.x or higher."
    exit 1
}

# Check npm or pnpm
$PKG_MANAGER = "npm"
try {
    $null = pnpm -v 2>$null
    $PKG_MANAGER = "pnpm"
    Write-Success "pnpm found"
} catch {
    try {
        $null = npm -v
        Write-Success "npm found"
    } catch {
        Write-Error "No package manager found. Please install npm or pnpm."
        exit 1
    }
}

# Check Docker
try {
    $null = docker --version
    Write-Success "Docker found"
} catch {
    Write-Error "Docker is not installed. Please install Docker Desktop."
    exit 1
}

Write-Host ""

# =============================================================================
# Environment Setup
# =============================================================================
Write-Info "Setting up environment..."

# Copy .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.local.example") {
        Copy-Item ".env.local.example" ".env.local"
        Write-Success "Created .env.local from example"
        Write-Warn "Please update .env.local with your API keys"
    } else {
        Write-Warn ".env.local.example not found, creating minimal .env.local"
        @"
# =============================================================================
# SINTRA.AI - Local Development Environment
# =============================================================================

# Database
DATABASE_URL=postgresql://sintra:sintra_dev_password@localhost:5432/sintra_dev

# Redis
REDIS_URL=redis://localhost:6379

# Authentication (generate your own secrets!)
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=2000

# Server Ports
PORT=4000
NEXT_PORT=3000

# Application
NODE_ENV=development
APP_URL=http://localhost:3000
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Success "Created minimal .env.local"
        Write-Warn "Please update .env.local with your API keys!"
    }
} else {
    Write-Info ".env.local already exists, skipping..."
}

Write-Host ""

# =============================================================================
# Install Dependencies
# =============================================================================
Write-Info "Installing dependencies..."

if ($PKG_MANAGER -eq "pnpm") {
    pnpm install
} else {
    npm install
}

Write-Success "Dependencies installed"
Write-Host ""

# =============================================================================
# Start Docker Services
# =============================================================================
Write-Info "Starting Docker services (PostgreSQL & Redis)..."

# Find docker-compose file
$COMPOSE_FILE = $null
if (Test-Path "docker-compose.yml") {
    $COMPOSE_FILE = "docker-compose.yml"
} elseif (Test-Path "docker/docker-compose.yml") {
    $COMPOSE_FILE = "docker/docker-compose.yml"
} else {
    Write-Error "docker-compose.yml not found"
    exit 1
}

# Start services
docker compose -f $COMPOSE_FILE up -d postgres redis

Write-Success "Docker services started"

# Wait for PostgreSQL to be ready
Write-Info "Waiting for PostgreSQL to be ready..."
$maxRetries = 30
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $result = docker exec sintra-postgres pg_isready -U sintra 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is ready"
            break
        }
    } catch {}
    $retryCount++
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}

if ($retryCount -eq $maxRetries) {
    Write-Warn "PostgreSQL may not be ready, but continuing..."
}

# Wait for Redis to be ready
Write-Info "Waiting for Redis to be ready..."
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $result = docker exec sintra-redis redis-cli ping 2>$null
        if ($result -eq "PONG") {
            Write-Success "Redis is ready"
            break
        }
    } catch {}
    $retryCount++
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}

Write-Host ""

# =============================================================================
# Database Setup
# =============================================================================
Write-Info "Running database migrations..."

try {
    if ($PKG_MANAGER -eq "pnpm") {
        pnpm db:push
    } else {
        npm run db:push
    }
    Write-Success "Database migrations complete"
} catch {
    try {
        npx drizzle-kit push
        Write-Success "Database migrations complete"
    } catch {
        Write-Warn "Could not run migrations automatically"
    }
}

Write-Host ""

# =============================================================================
# Seed Data (Optional)
# =============================================================================
$seedData = Read-Host "Do you want to seed the database with demo data? (y/N)"

if ($seedData -eq "y" -or $seedData -eq "Y") {
    Write-Info "Seeding database..."
    try {
        if ($PKG_MANAGER -eq "pnpm") {
            pnpm db:seed
        } else {
            npm run db:seed
        }
        Write-Success "Database seeded"
    } catch {
        Write-Warn "Seed script not found or failed, skipping..."
    }
}

Write-Host ""

# =============================================================================
# Create Admin User (Optional)
# =============================================================================
$createAdmin = Read-Host "Do you want to create an admin user? (y/N)"

if ($createAdmin -eq "y" -or $createAdmin -eq "Y") {
    Write-Info "Creating admin user..."
    if (Test-Path "scripts/seed-admin.ts") {
        try {
            npx tsx scripts/seed-admin.ts
            Write-Success "Admin user created"
        } catch {
            Write-Warn "Could not run admin seed script"
        }
    } else {
        Write-Warn "Admin seed script not found at scripts/seed-admin.ts"
    }
}

Write-Host ""

# =============================================================================
# Summary
# =============================================================================
Write-Host "==============================================" -ForegroundColor Green
Write-Host "         Setup Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Success "Your development environment is ready!"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Update .env.local with your API keys (especially OPENAI_API_KEY)"
Write-Host "  2. Start the development server:"
Write-Host ""
Write-Host "     $PKG_MANAGER run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Open your browser:"
Write-Host "     - Frontend: http://localhost:3000"
Write-Host "     - API: http://localhost:4000"
Write-Host "     - API Health: http://localhost:4000/api/health"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor White
Write-Host "  - $PKG_MANAGER run dev          Start development server" -ForegroundColor Cyan
Write-Host "  - $PKG_MANAGER run dev:all      Start frontend + backend + worker" -ForegroundColor Cyan
Write-Host "  - $PKG_MANAGER run db:studio    Open Drizzle Studio" -ForegroundColor Cyan
Write-Host "  - $PKG_MANAGER run test:unit    Run unit tests" -ForegroundColor Cyan
Write-Host "  - $PKG_MANAGER run build        Build for production" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docker services:" -ForegroundColor White
Write-Host "  - docker compose logs -f       View logs" -ForegroundColor Cyan
Write-Host "  - docker compose down          Stop services" -ForegroundColor Cyan
Write-Host ""
Write-Success "Happy coding!"
Write-Host ""
