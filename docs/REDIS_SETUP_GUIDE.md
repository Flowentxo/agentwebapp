# 🔧 Redis Setup Guide for SINTRA System

## Problem

BullMQ requires Redis for queue management. Without Redis running, you'll see errors like:

```
❌ Redis connection failed: Error: Connection is closed.
Internal Server Error (500)
```

## Quick Setup (Recommended)

### For Windows (Docker):

```bash
# Automated setup via npm script
npm run redis:setup

# Manual setup
docker run --name sintra-redis -p 6379:6379 -d redis:7
```

### For WSL2/Linux:

```bash
# Run the setup script
chmod +x scripts/setup-redis.sh
./scripts/setup-redis.sh

# Or manual install
sudo apt update && sudo apt install redis-server -y
sudo service redis-server start
```

### For macOS:

```bash
# Run the setup script
chmod +x scripts/setup-redis.sh
./scripts/setup-redis.sh

# Or manual install via Homebrew
brew install redis
brew services start redis
```

## Verify Redis Connection

```bash
# Check Redis status
npm run redis:check

# Expected output:
# ✅ Redis connection successful!
#    URL: redis://localhost:6379
```

## Alternative: Cloud Redis (Production-Ready)

For deployment or if you can't run Redis locally:

### Option 1: Upstash (Free Tier)

1. Visit https://upstash.com
2. Create a new Redis database
3. Copy the connection URL
4. Update `.env`:

```env
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:PORT
```

### Option 2: Redis Cloud

1. Visit https://redis.com/try-free/
2. Create a free database
3. Copy the connection URL
4. Update `.env`

### Option 3: Railway

1. Visit https://railway.app
2. Add Redis service to your project
3. Copy the `REDIS_URL` variable
4. Update `.env`

## Configuration

### Environment Variables

Ensure `.env` contains:

```env
# Redis Configuration (for BullMQ queues and rate limiting)
REDIS_URL=redis://localhost:6379
BULLMQ_PREFIX=sintra
```

### BullMQ Connection Settings

The system is configured with stable connection parameters in `workers/queues.ts:26-30`:

```typescript
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,       // No timeout for long jobs
  enableReadyCheck: false,           // Faster startup
  reconnectOnError: () => true,      // Auto-reconnect
});
```

## Troubleshooting

### "Connection is closed" Error

**Cause:** Redis server is not running

**Solution:**
1. Start Redis: `npm run redis:setup`
2. Verify: `npm run redis:check`
3. Restart dev server: `npm run dev`

### Docker Container Already Exists

```bash
# Check status
docker ps -a | findstr sintra-redis

# Start existing container
docker start sintra-redis

# Or remove and recreate
docker rm -f sintra-redis
npm run redis:setup
```

### Port 6379 Already in Use

```bash
# Windows - Find process using port 6379
netstat -ano | findstr :6379
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :6379
kill -9 <PID>
```

### WSL2 Redis Won't Start

```bash
# Check service status
sudo service redis-server status

# Force restart
sudo service redis-server restart

# Check logs
sudo tail -f /var/log/redis/redis-server.log
```

## Useful Redis Commands

### Docker Redis

```bash
# View logs
docker logs sintra-redis

# Access Redis CLI
docker exec -it sintra-redis redis-cli

# Test connection
docker exec sintra-redis redis-cli ping

# Stop/Start
docker stop sintra-redis
docker start sintra-redis

# Remove container
docker rm -f sintra-redis
```

### Local Redis

```bash
# Redis CLI
redis-cli

# Test connection
redis-cli ping

# Monitor all commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# Flush all data (CAUTION!)
redis-cli FLUSHALL
```

### Common Redis CLI Commands

```bash
# Inside redis-cli:
PING                    # Test connection
KEYS *                  # List all keys
GET key                 # Get value
DEL key                 # Delete key
FLUSHDB                 # Clear current database
INFO                    # Server info
CLIENT LIST             # Connected clients
```

## What Uses Redis in SINTRA?

1. **BullMQ Queues** (`workers/queues.ts`)
   - `knowledge-index` - Knowledge base indexing
   - `index-revision` - Document revision processing
   - `reindex-kb` - Full knowledge base reindexing

2. **Rate Limiting** (`lib/auth/rateLimit.ts`)
   - Login attempts
   - API request throttling
   - CSRF token validation

3. **Session Storage** (future)
   - User sessions
   - Temporary auth tokens

## Development Workflow

```bash
# 1. Start Redis (first time only)
npm run redis:setup

# 2. Verify connection
npm run redis:check

# 3. Start development servers
npm run dev

# 4. Monitor Redis (optional)
docker logs -f sintra-redis
```

## Production Deployment

### Recommended Cloud Redis Providers

| Provider | Free Tier | Use Case |
|----------|-----------|----------|
| **Upstash** | 10K commands/day | Small projects, staging |
| **Redis Cloud** | 30MB storage | Medium apps |
| **Railway** | Usage-based | Full-stack deployments |
| **AWS ElastiCache** | Pay-as-you-go | Enterprise |

### Deployment Checklist

- [ ] Set `REDIS_URL` in production environment
- [ ] Enable Redis persistence (RDB or AOF)
- [ ] Configure maxmemory-policy (e.g., `allkeys-lru`)
- [ ] Set up Redis monitoring/alerts
- [ ] Enable TLS encryption for Redis connection
- [ ] Configure backup/restore procedures
- [ ] Test failover behavior

## Performance Tuning

### Recommended Redis Configuration

For local development, defaults are fine. For production:

```conf
# /etc/redis/redis.conf (Linux) or redis.conf (Docker)

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (choose one)
save 900 1          # RDB: Save after 900s if 1 key changed
appendonly yes      # AOF: Log every write

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

### BullMQ Performance Tips

```typescript
// High-throughput settings
const queue = new Queue('knowledge-index', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,   // Keep last 100 completed jobs
    removeOnFail: 500,       // Keep last 500 failed jobs
  },
});
```

## Security Best Practices

### Local Development

```env
# No authentication needed for localhost
REDIS_URL=redis://localhost:6379
```

### Production

```env
# Always use authentication
REDIS_URL=redis://default:STRONG_PASSWORD@your-host:6379

# Or with TLS
REDIS_URL=rediss://default:PASSWORD@your-host:6380
```

### Redis ACL (Redis 6+)

```bash
# Create limited user for BullMQ
redis-cli
> ACL SETUSER bullmq on >password123 ~bull:* +@all -@dangerous
> ACL SAVE
```

Then use:
```env
REDIS_URL=redis://bullmq:password123@localhost:6379
```

## Support

If you encounter issues:

1. **Check Redis status**: `npm run redis:check`
2. **View logs**: `docker logs sintra-redis`
3. **Test connection**: `redis-cli ping` (or `docker exec sintra-redis redis-cli ping`)
4. **Restart Redis**: `docker restart sintra-redis`
5. **Verify `.env`**: Ensure `REDIS_URL` is set correctly

For further help, see:
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Redis Image](https://hub.docker.com/_/redis)

---

**✅ After Redis is running, all BullMQ queues will function correctly and you won't see 500 errors.**
