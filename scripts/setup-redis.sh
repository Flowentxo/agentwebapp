#!/bin/bash

# ═══════════════════════════════════════════════════════
# 🔧 SINTRA SYSTEM - Redis Setup Script (Linux/macOS/WSL2)
# ═══════════════════════════════════════════════════════
# This script sets up Redis for local development

set -e

echo "🔧 SINTRA Redis Setup"
echo "═══════════════════════════════════════════════════════"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)
        OS_TYPE="Linux"
        ;;
    Darwin*)
        OS_TYPE="macOS"
        ;;
    *)
        OS_TYPE="Unknown"
        ;;
esac

echo ""
echo "📋 Detected OS: $OS_TYPE"

# Function to check if Redis is already running
check_redis_running() {
    if redis-cli ping &>/dev/null; then
        echo "✅ Redis is already running!"
        redis-cli ping
        echo ""
        echo "📋 Connection Details:"
        echo "   URL: redis://localhost:6379"
        return 0
    fi
    return 1
}

# Check if Redis is already running
if check_redis_running; then
    exit 0
fi

# Check if Docker is available
if command -v docker &>/dev/null; then
    echo ""
    echo "🐳 Docker found - using Docker setup"
    echo ""

    # Check if Docker is running
    if ! docker ps &>/dev/null; then
        echo "❌ Docker is not running"
        echo "💡 Please start Docker and run this script again"
        exit 1
    fi

    # Check for existing container
    if docker ps -a --filter "name=sintra-redis" --format "{{.Names}}" | grep -q "sintra-redis"; then
        echo "📦 Found existing 'sintra-redis' container"

        # Check if running
        if docker ps --filter "name=sintra-redis" --format "{{.Names}}" | grep -q "sintra-redis"; then
            echo "✅ Redis container is already running!"
        else
            echo "🔄 Starting existing Redis container..."
            docker start sintra-redis
            echo "✅ Redis container started"
        fi
    else
        echo "🚀 Creating new Redis container..."
        docker run --name sintra-redis -p 6379:6379 -d redis:7
        echo "✅ Redis container created and started"
    fi

    # Wait for Redis to be ready
    echo ""
    echo "⏳ Waiting for Redis to be ready..."
    sleep 2

    # Test connection
    echo ""
    echo "🧪 Testing Redis connection..."
    if docker exec sintra-redis redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis is responding: PONG"
    else
        echo "❌ Redis connection test failed"
        exit 1
    fi

elif [ "$OS_TYPE" = "Linux" ]; then
    echo ""
    echo "📦 Installing Redis via package manager..."

    # Check if running in WSL
    if grep -qi microsoft /proc/version; then
        echo "🔍 WSL detected"
        IS_WSL=true
    else
        IS_WSL=false
    fi

    # Install Redis
    if command -v apt-get &>/dev/null; then
        echo "🔄 Using apt-get..."
        sudo apt-get update
        sudo apt-get install -y redis-server

        if [ "$IS_WSL" = true ]; then
            echo "🔄 Starting Redis (WSL)..."
            sudo service redis-server start
        else
            echo "🔄 Enabling and starting Redis..."
            sudo systemctl enable redis-server
            sudo systemctl start redis-server
        fi

    elif command -v yum &>/dev/null; then
        echo "🔄 Using yum..."
        sudo yum install -y redis
        sudo systemctl enable redis
        sudo systemctl start redis
    else
        echo "❌ Could not find package manager"
        echo "💡 Please install Redis manually or use Docker"
        exit 1
    fi

    echo "✅ Redis installed and started"

elif [ "$OS_TYPE" = "macOS" ]; then
    echo ""
    echo "📦 Installing Redis via Homebrew..."

    if ! command -v brew &>/dev/null; then
        echo "❌ Homebrew not found"
        echo "💡 Please install Homebrew from https://brew.sh"
        exit 1
    fi

    brew install redis
    brew services start redis
    echo "✅ Redis installed and started"

else
    echo "❌ Unsupported OS: $OS_TYPE"
    echo "💡 Please install Redis manually or use Docker"
    exit 1
fi

# Final connection test
echo ""
echo "🧪 Testing final connection..."
sleep 1

if redis-cli ping &>/dev/null; then
    echo "✅ Redis is responding: PONG"
else
    echo "❌ Redis connection test failed"
    exit 1
fi

# Display summary
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Redis Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Connection Details:"
echo "   URL: redis://localhost:6379"
echo ""
echo "🔧 Useful Commands:"
if command -v docker &>/dev/null && docker ps --filter "name=sintra-redis" --format "{{.Names}}" | grep -q "sintra-redis"; then
    echo "   Stop Redis:    docker stop sintra-redis"
    echo "   Start Redis:   docker start sintra-redis"
    echo "   View logs:     docker logs sintra-redis"
    echo "   Redis CLI:     docker exec -it sintra-redis redis-cli"
else
    echo "   Redis CLI:     redis-cli"
    if [ "$OS_TYPE" = "macOS" ]; then
        echo "   Stop Redis:    brew services stop redis"
        echo "   Start Redis:   brew services start redis"
    elif [ "$IS_WSL" = true ]; then
        echo "   Stop Redis:    sudo service redis-server stop"
        echo "   Start Redis:   sudo service redis-server start"
    else
        echo "   Stop Redis:    sudo systemctl stop redis-server"
        echo "   Start Redis:   sudo systemctl start redis-server"
    fi
fi
echo ""
echo "🚀 Next Steps:"
echo "   1. Run: npm run dev"
echo "   2. Test login at http://localhost:3000"
echo "   3. BullMQ queues should now work without errors"
echo ""
echo "═══════════════════════════════════════════════════════"
