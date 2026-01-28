/**
 * =============================================================================
 * FLOWENT AI PLATFORM - PM2 ECOSYSTEM CONFIGURATION
 * =============================================================================
 * Process Manager configuration for VPS deployment (Hetzner, DigitalOcean, etc.)
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # Start all services
 *   pm2 start ecosystem.config.js --only backend  # Start only backend
 *   pm2 restart all                        # Restart all services
 *   pm2 reload all                         # Zero-downtime reload
 *   pm2 logs                               # View all logs
 *   pm2 monit                              # Monitor processes
 *   pm2 save                               # Save process list
 *   pm2 startup                            # Setup boot script
 *
 * Prerequisites:
 *   - Node.js 20+ installed
 *   - PostgreSQL 16+ running (local or external)
 *   - Redis 7+ running (local or external)
 *   - npm install -g pm2
 *   - Environment variables configured in .env.production
 * =============================================================================
 */

module.exports = {
  apps: [
    // =========================================================================
    // BACKEND API SERVER (Express.js + Socket.IO)
    // =========================================================================
    {
      name: 'flowent-backend',
      script: 'npx',
      args: 'tsx server/index.ts',
      cwd: '/var/www/flowent',
      interpreter: 'none',

      // Instance configuration
      instances: 1, // Use 1 for WebSocket sticky sessions, or 'max' with Redis adapter
      exec_mode: 'fork', // Use 'cluster' only with Redis adapter for Socket.IO

      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },

      // Restart strategy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,

      // Resource limits
      max_memory_restart: '1G',

      // Logging
      error_file: '/var/log/flowent/backend-error.log',
      out_file: '/var/log/flowent/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Monitoring
      monitoring: false,
      pmx: false,

      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 30000,
      shutdown_with_message: true,

      // Source maps for TypeScript
      source_map_support: true,

      // Watch (disable in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', '*.log'],

      // Auto-restart on file changes (dev only)
      autorestart: true,
    },

    // =========================================================================
    // FRONTEND SERVER (Next.js Standalone)
    // =========================================================================
    {
      name: 'flowent-frontend',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/var/www/flowent',

      // Instance configuration
      instances: 1,
      exec_mode: 'fork',

      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },

      // Restart strategy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Resource limits
      max_memory_restart: '512M',

      // Logging
      error_file: '/var/log/flowent/frontend-error.log',
      out_file: '/var/log/flowent/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Watch (disable in production)
      watch: false,
      autorestart: true,
    },

    // =========================================================================
    // BACKGROUND WORKER (Job Processing)
    // =========================================================================
    {
      name: 'flowent-worker',
      script: 'npx',
      args: 'tsx workers/agent-execution-worker.ts',
      cwd: '/var/www/flowent',
      interpreter: 'none',

      // Instance configuration
      instances: 2, // Can run multiple workers for parallel job processing
      exec_mode: 'fork',

      // Environment
      env_production: {
        NODE_ENV: 'production',
      },

      // Restart strategy
      max_restarts: 10,
      min_uptime: '5s',
      restart_delay: 5000,

      // Resource limits
      max_memory_restart: '512M',

      // Logging
      error_file: '/var/log/flowent/worker-error.log',
      out_file: '/var/log/flowent/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown (allow jobs to complete)
      kill_timeout: 30000,

      // Watch (disable in production)
      watch: false,
      autorestart: true,
    },
  ],

  // ===========================================================================
  // DEPLOYMENT CONFIGURATION
  // ===========================================================================
  deploy: {
    production: {
      // SSH configuration
      user: 'deploy',
      host: ['your-server.example.com'],
      key: '~/.ssh/id_rsa',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/flowent-ai.git',
      path: '/var/www/flowent',

      // Pre-setup commands (run once)
      'pre-setup': `
        mkdir -p /var/log/flowent
        mkdir -p /var/www/flowent
      `,

      // Post-deploy commands
      'post-deploy': `
        source ~/.nvm/nvm.sh
        npm ci --legacy-peer-deps
        npx prisma generate
        npx prisma migrate deploy
        npm run build
        pm2 reload ecosystem.config.js --env production
      `,

      // Environment file
      env: {
        NODE_ENV: 'production',
      },
    },

    staging: {
      user: 'deploy',
      host: ['staging.example.com'],
      key: '~/.ssh/id_rsa',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/flowent-ai.git',
      path: '/var/www/flowent-staging',

      'post-deploy': `
        source ~/.nvm/nvm.sh
        npm ci --legacy-peer-deps
        npx prisma generate
        npx prisma migrate deploy
        npm run build
        pm2 reload ecosystem.config.js --env staging
      `,

      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
