#!/bin/bash
# =============================================================================
# SINTRA.AI - Developer Setup Script
# =============================================================================
# This script sets up a complete development environment for SINTRA.AI
# Run: chmod +x scripts/setup-dev.sh && ./scripts/setup-dev.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo ""
echo "=============================================="
echo "       SINTRA.AI Development Setup"
echo "=============================================="
echo ""

# =============================================================================
# Prerequisites Check
# =============================================================================
log_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 20.x or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    log_error "Node.js version must be 20.x or higher. Current: $(node -v)"
    exit 1
fi
log_success "Node.js $(node -v) found"

# Check npm or pnpm
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
    log_success "pnpm found"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    log_success "npm found"
else
    log_error "No package manager found. Please install npm or pnpm."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker."
    exit 1
fi
log_success "Docker found"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed."
    exit 1
fi
log_success "Docker Compose found"

echo ""

# =============================================================================
# Environment Setup
# =============================================================================
log_info "Setting up environment..."

# Copy .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        log_success "Created .env.local from example"
        log_warn "Please update .env.local with your API keys"
    else
        log_warn ".env.local.example not found, creating minimal .env.local"
        cat > .env.local << 'EOF'
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
EOF
        log_success "Created minimal .env.local"
        log_warn "Please update .env.local with your API keys!"
    fi
else
    log_info ".env.local already exists, skipping..."
fi

echo ""

# =============================================================================
# Install Dependencies
# =============================================================================
log_info "Installing dependencies..."

if [ "$PKG_MANAGER" = "pnpm" ]; then
    pnpm install
else
    npm install
fi

log_success "Dependencies installed"
echo ""

# =============================================================================
# Start Docker Services
# =============================================================================
log_info "Starting Docker services (PostgreSQL & Redis)..."

# Check if docker-compose file exists
if [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
elif [ -f "docker/docker-compose.yml" ]; then
    COMPOSE_FILE="docker/docker-compose.yml"
else
    log_error "docker-compose.yml not found"
    exit 1
fi

# Start services
if docker compose version &> /dev/null; then
    docker compose -f "$COMPOSE_FILE" up -d postgres redis
else
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
fi

log_success "Docker services started"

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec sintra-postgres pg_isready -U sintra &> /dev/null 2>&1; then
        log_success "PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_warn "PostgreSQL may not be ready, but continuing..."
fi

# Wait for Redis to be ready
log_info "Waiting for Redis to be ready..."
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec sintra-redis redis-cli ping &> /dev/null 2>&1; then
        log_success "Redis is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

echo ""

# =============================================================================
# Database Setup
# =============================================================================
log_info "Running database migrations..."

if [ "$PKG_MANAGER" = "pnpm" ]; then
    pnpm db:push 2>/dev/null || pnpm drizzle-kit push 2>/dev/null || npx drizzle-kit push
else
    npm run db:push 2>/dev/null || npx drizzle-kit push
fi

log_success "Database migrations complete"
echo ""

# =============================================================================
# Seed Data (Optional)
# =============================================================================
read -p "Do you want to seed the database with demo data? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Seeding database..."

    if [ "$PKG_MANAGER" = "pnpm" ]; then
        pnpm db:seed 2>/dev/null || log_warn "Seed script not found, skipping..."
    else
        npm run db:seed 2>/dev/null || log_warn "Seed script not found, skipping..."
    fi

    log_success "Database seeded"
fi

echo ""

# =============================================================================
# Create Admin User (Optional)
# =============================================================================
read -p "Do you want to create an admin user? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Creating admin user..."

    if [ -f "scripts/seed-admin.ts" ]; then
        npx tsx scripts/seed-admin.ts 2>/dev/null || npx ts-node scripts/seed-admin.ts 2>/dev/null || log_warn "Could not run admin seed script"
    else
        log_warn "Admin seed script not found at scripts/seed-admin.ts"
    fi
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo "=============================================="
echo "         Setup Complete!"
echo "=============================================="
echo ""
log_success "Your development environment is ready!"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your API keys (especially OPENAI_API_KEY)"
echo "  2. Start the development server:"
echo ""
echo "     ${BLUE}$PKG_MANAGER run dev${NC}"
echo ""
echo "  3. Open your browser:"
echo "     - Frontend: http://localhost:3000"
echo "     - API: http://localhost:4000"
echo "     - API Health: http://localhost:4000/api/health"
echo ""
echo "Useful commands:"
echo "  - ${BLUE}$PKG_MANAGER run dev${NC}          Start development server"
echo "  - ${BLUE}$PKG_MANAGER run dev:all${NC}      Start frontend + backend + worker"
echo "  - ${BLUE}$PKG_MANAGER run db:studio${NC}    Open Drizzle Studio"
echo "  - ${BLUE}$PKG_MANAGER run test:unit${NC}    Run unit tests"
echo "  - ${BLUE}$PKG_MANAGER run build${NC}        Build for production"
echo ""
echo "Docker services:"
echo "  - ${BLUE}docker compose logs -f${NC}       View logs"
echo "  - ${BLUE}docker compose down${NC}          Stop services"
echo ""
log_success "Happy coding!"
echo ""
