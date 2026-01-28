#!/bin/sh
# =============================================================================
# SINTRA.AI v3 - Production Docker Entrypoint
# Starts both Next.js frontend and Express backend
# =============================================================================

set -e

echo "═══════════════════════════════════════════"
echo "🚀 SINTRA.AI v3 - Production Startup"
echo "═══════════════════════════════════════════"

# Validate required environment variables
check_required_env() {
    local missing=""

    [ -z "$DATABASE_URL" ] && missing="$missing DATABASE_URL"
    [ -z "$REDIS_URL" ] && missing="$missing REDIS_URL"
    [ -z "$JWT_SECRET" ] && missing="$missing JWT_SECRET"

    if [ -n "$missing" ]; then
        echo "❌ Missing required environment variables:$missing"
        exit 1
    fi
}

# Wait for dependencies
wait_for_postgres() {
    echo "⏳ Waiting for PostgreSQL..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if node -e "
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            pool.query('SELECT 1').then(() => {
                pool.end();
                process.exit(0);
            }).catch(() => process.exit(1));
        " 2>/dev/null; then
            echo "✅ PostgreSQL is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
    done

    echo "❌ PostgreSQL connection failed after $max_attempts attempts"
    exit 1
}

wait_for_redis() {
    echo "⏳ Waiting for Redis..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if node -e "
            const Redis = require('ioredis');
            const redis = new Redis(process.env.REDIS_URL);
            redis.ping().then(() => {
                redis.disconnect();
                process.exit(0);
            }).catch(() => process.exit(1));
        " 2>/dev/null; then
            echo "✅ Redis is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
    done

    echo "❌ Redis connection failed after $max_attempts attempts"
    exit 1
}

# Run database migrations if enabled
run_migrations() {
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        echo "📦 Running database migrations..."
        node node_modules/.bin/drizzle-kit push || {
            echo "⚠️ Migration failed, continuing anyway..."
        }
    fi
}

# Main startup sequence
main() {
    echo ""
    echo "📋 Configuration:"
    echo "   NODE_ENV: $NODE_ENV"
    echo "   PORT: ${PORT:-4000}"
    echo "   NEXT_PORT: ${NEXT_PORT:-3000}"
    echo ""

    # Check environment
    check_required_env

    # Wait for dependencies
    wait_for_postgres
    wait_for_redis

    # Run migrations if enabled
    run_migrations

    echo ""
    echo "═══════════════════════════════════════════"
    echo "🎯 Starting SINTRA.AI Services..."
    echo "═══════════════════════════════════════════"

    # Option 1: Run with concurrently (recommended)
    if command -v npx >/dev/null 2>&1 && [ -f "node_modules/.bin/concurrently" ]; then
        echo "📦 Starting with concurrently..."
        exec npx concurrently \
            --names "NEXT,API" \
            --prefix-colors "cyan,magenta" \
            --kill-others-on-fail \
            "node server.js" \
            "npx tsx server/index.ts"
    fi

    # Option 2: Single server mode (Express serves everything)
    echo "📦 Starting in unified server mode..."
    exec npx tsx server/index.ts
}

# Handle signals gracefully
trap 'echo "Received shutdown signal..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
