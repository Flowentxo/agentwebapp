#!/bin/sh
# =============================================================================
# Flowent AI Studio - Backend Entrypoint Script
# =============================================================================
# This script handles startup for both API and Worker modes
# Usage:
#   /entrypoint.sh api     - Start API server
#   /entrypoint.sh worker  - Start background worker
# =============================================================================

set -e

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Wait for Dependencies
# =============================================================================
wait_for_postgres() {
    log_info "Waiting for PostgreSQL to be ready..."

    # Use environment variables with defaults
    PGHOST="${POSTGRES_HOST:-postgres}"
    PGPORT="${POSTGRES_PORT:-5432}"
    PGUSER="${POSTGRES_USER:-flowent}"

    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" > /dev/null 2>&1; then
            log_info "PostgreSQL is ready!"
            return 0
        fi

        attempt=$((attempt + 1))
        log_warn "PostgreSQL not ready (attempt $attempt/$max_attempts). Waiting..."
        sleep 2
    done

    log_error "PostgreSQL did not become ready in time"
    return 1
}

wait_for_redis() {
    log_info "Waiting for Redis to be ready..."

    REDIS_HOST="${REDIS_HOST:-redis}"
    REDIS_PORT="${REDIS_PORT:-6379}"

    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "${REDIS_PASSWORD:-}" ping > /dev/null 2>&1; then
            log_info "Redis is ready!"
            return 0
        fi

        attempt=$((attempt + 1))
        log_warn "Redis not ready (attempt $attempt/$max_attempts). Waiting..."
        sleep 2
    done

    log_error "Redis did not become ready in time"
    return 1
}

# =============================================================================
# Database Migrations
# =============================================================================
run_migrations() {
    log_info "Running database migrations..."

    # Try Drizzle first, then Prisma
    if [ -f "drizzle.config.ts" ]; then
        log_info "Running Drizzle migrations..."
        npx drizzle-kit push 2>/dev/null || {
            log_warn "Drizzle push failed, trying migrate..."
            npx drizzle-kit migrate 2>/dev/null || log_warn "Drizzle migrations skipped"
        }
    elif [ -f "prisma/schema.prisma" ]; then
        log_info "Running Prisma migrations..."
        npx prisma migrate deploy 2>/dev/null || {
            log_warn "Prisma migrations failed, trying db push..."
            npx prisma db push 2>/dev/null || log_warn "Prisma push skipped"
        }
    else
        log_warn "No migration tool detected, skipping migrations"
    fi

    log_info "Migrations complete"
}

# =============================================================================
# Start Application
# =============================================================================
start_api() {
    log_info "Starting Flowent AI Studio API Server..."
    log_info "Port: ${PORT:-4000}"
    log_info "Environment: ${NODE_ENV:-development}"

    # Try different start commands in order of preference
    if [ -f "dist/server/index.js" ]; then
        log_info "Starting from compiled dist..."
        exec node dist/server/index.js
    elif [ -f "server/index.ts" ]; then
        log_info "Starting with ts-node..."
        exec npx ts-node --transpile-only server/index.ts
    elif [ -f "server/index.js" ]; then
        log_info "Starting from server/index.js..."
        exec node server/index.js
    else
        log_info "Starting with npm start..."
        exec npm start
    fi
}

start_worker() {
    log_info "Starting Flowent AI Studio Background Worker..."
    log_info "Concurrency: ${WORKER_CONCURRENCY:-5}"
    log_info "Max Retries: ${MAX_RETRIES:-3}"

    # Try different worker start commands
    if [ -f "dist/workers/indexer.js" ]; then
        log_info "Starting worker from compiled dist..."
        exec node dist/workers/indexer.js
    elif [ -f "workers/indexer.ts" ]; then
        log_info "Starting worker with ts-node..."
        exec npx ts-node --transpile-only workers/indexer.ts
    elif [ -f "workers/indexer.js" ]; then
        log_info "Starting worker from workers/indexer.js..."
        exec node workers/indexer.js
    else
        log_info "Starting worker with npm run worker..."
        exec npm run worker
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================
main() {
    MODE="${1:-api}"

    log_info "=============================================="
    log_info "  Flowent AI Studio - Backend Container"
    log_info "=============================================="
    log_info "Mode: $MODE"
    log_info "Time: $(date -Iseconds)"
    log_info "=============================================="

    # Wait for dependencies
    wait_for_postgres || exit 1
    wait_for_redis || exit 1

    # Run migrations only in API mode (not worker)
    if [ "$MODE" = "api" ]; then
        run_migrations
    fi

    # Start the appropriate process
    case "$MODE" in
        api)
            start_api
            ;;
        worker)
            start_worker
            ;;
        *)
            log_error "Unknown mode: $MODE"
            log_info "Usage: $0 [api|worker]"
            exit 1
            ;;
    esac
}

# Handle signals gracefully
trap 'log_info "Received shutdown signal, exiting..."; exit 0' SIGTERM SIGINT

# Run main function with all arguments
main "$@"
