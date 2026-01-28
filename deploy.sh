#!/bin/bash

# =============================================================================
# FLOWENT AI PLATFORM - Production Deployment Script
# =============================================================================
# This script handles the complete deployment process for production
#
# Usage:
#   ./deploy.sh                    # Full deployment (build + migrate + start)
#   ./deploy.sh --build-only       # Only build images
#   ./deploy.sh --start-only       # Only start services (no rebuild)
#   ./deploy.sh --migrate-only     # Only run migrations
#   ./deploy.sh --pull             # Pull latest git changes first
#   ./deploy.sh --no-cache         # Build with --no-cache flag
#   ./deploy.sh --down             # Stop all services
#   ./deploy.sh --logs             # Show logs
#   ./deploy.sh --status           # Show service status
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Create it by copying .env.production.example:"
        log_info "  cp .env.production.example .env.production"
        exit 1
    fi

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Pull latest changes from git
pull_changes() {
    log_info "Pulling latest changes from git..."

    if [ -d ".git" ]; then
        git fetch origin
        git pull origin main || git pull origin master
        log_success "Git pull completed"
    else
        log_warning "Not a git repository, skipping pull"
    fi
}

# Build Docker images
build_images() {
    local no_cache=""

    if [ "$1" == "--no-cache" ]; then
        no_cache="--no-cache"
        log_info "Building images with --no-cache..."
    else
        log_info "Building Docker images..."
    fi

    # Load environment variables for build args
    set -a
    source "$ENV_FILE"
    set +a

    # Build frontend and backend
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build $no_cache

    log_success "Docker images built successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Ensure postgres is running
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres

    # Wait for postgres to be healthy
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 10

    # Run migrations using drizzle-kit
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm backend \
        npx drizzle-kit migrate

    log_success "Database migrations completed"
}

# Start all services
start_services() {
    log_info "Starting all services..."

    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    log_success "All services started"

    # Show status
    show_status
}

# Stop all services
stop_services() {
    log_info "Stopping all services..."

    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

    log_success "All services stopped"
}

# Show logs
show_logs() {
    log_info "Showing logs (Ctrl+C to exit)..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
}

# Show service status
show_status() {
    echo ""
    log_info "Service Status:"
    echo "========================================"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    echo ""

    # Check health
    log_info "Health Check:"
    echo "========================================"

    # Frontend health
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "Frontend (port 3000): ${GREEN}HEALTHY${NC}"
    else
        echo -e "Frontend (port 3000): ${RED}NOT RESPONDING${NC}"
    fi

    # Backend health
    if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
        echo -e "Backend  (port 4000): ${GREEN}HEALTHY${NC}"
    else
        echo -e "Backend  (port 4000): ${RED}NOT RESPONDING${NC}"
    fi

    # Postgres health
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready > /dev/null 2>&1; then
        echo -e "Postgres (port 5432): ${GREEN}HEALTHY${NC}"
    else
        echo -e "Postgres (port 5432): ${RED}NOT RESPONDING${NC}"
    fi

    # Redis health
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "Redis    (port 6379): ${GREEN}HEALTHY${NC}"
    else
        echo -e "Redis    (port 6379): ${RED}NOT RESPONDING${NC}"
    fi

    echo ""
}

# Full deployment
full_deploy() {
    local no_cache=""
    local do_pull=false

    # Parse flags
    for arg in "$@"; do
        case $arg in
            --no-cache)
                no_cache="--no-cache"
                ;;
            --pull)
                do_pull=true
                ;;
        esac
    done

    echo ""
    echo "========================================"
    echo "  FLOWENT AI PLATFORM - DEPLOYMENT"
    echo "========================================"
    echo ""

    check_prerequisites

    if [ "$do_pull" = true ]; then
        pull_changes
    fi

    build_images $no_cache
    run_migrations
    start_services

    echo ""
    log_success "🚀 Deployment completed successfully!"
    echo ""
    echo "Access your application:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:4000"
    echo ""
}

# Show help
show_help() {
    echo ""
    echo "FLOWENT AI PLATFORM - Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  (no args)          Full deployment (build + migrate + start)"
    echo "  --build-only       Only build Docker images"
    echo "  --start-only       Only start services (no rebuild)"
    echo "  --migrate-only     Only run database migrations"
    echo "  --pull             Pull latest git changes first"
    echo "  --no-cache         Build images without cache"
    echo "  --down             Stop all services"
    echo "  --logs             Show service logs"
    echo "  --status           Show service status"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                     # Full deployment"
    echo "  ./deploy.sh --pull --no-cache   # Pull changes and rebuild from scratch"
    echo "  ./deploy.sh --start-only        # Restart without rebuilding"
    echo ""
}

# Main script logic
main() {
    case "${1:-}" in
        --build-only)
            check_prerequisites
            build_images "${2:-}"
            ;;
        --start-only)
            check_prerequisites
            start_services
            ;;
        --migrate-only)
            check_prerequisites
            run_migrations
            ;;
        --down)
            stop_services
            ;;
        --logs)
            show_logs
            ;;
        --status)
            show_status
            ;;
        --help|-h)
            show_help
            ;;
        *)
            full_deploy "$@"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
