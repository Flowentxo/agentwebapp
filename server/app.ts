import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { logger } from './utils/logger'
import { severeLimiter } from './middleware/rate-limiter'
import { agentManager } from './services/AgentManager'

export const app = express()

// ============================================================================
// TRUST PROXY - Required for rate limiting behind proxies (Next.js, nginx, etc.)
// This ensures req.ip returns the real client IP, not the proxy IP
// ============================================================================
app.set('trust proxy', 1)

// Build allowed origins for CORS
// Use 127.0.0.1 explicitly to avoid IPv6 resolution issues
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'https://sintra.ai',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true, // Allow cookies - ESSENTIAL for session auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-user-id'],
  exposedHeaders: ['Content-Length', 'X-Request-Id', 'set-cookie'],
  maxAge: 86400 // 24 hours
}))

// Handle preflight requests
app.options('*', cors())

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow dev tooling + Vercel analytics script in dev; tighten in production
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'blob:',
        'https://va.vercel-scripts.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
        'https://r2cdn.perplexity.ai',
      ],
      connectSrc: ["'self'", 'http://localhost:4000', 'https://api.openai.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding from same origin
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow CORS
}))

// Global rate limiting (prevent severe abuse)
app.use(severeLimiter)

logger.info('✅ Security middleware initialized (Helmet + Rate Limiting)')

// Request timeout protection
app.use((req, res, next) => {
  // Use longer timeout for team execution endpoints (60s)
  // Use standard timeout for other endpoints (20s)
  const timeout = req.originalUrl.includes('/teams/') && req.originalUrl.includes('/execute')
    ? 60000  // 60 seconds for multi-agent team execution
    : 20000; // 20 seconds for standard requests

  res.setTimeout(timeout, () => {
    logger.warn(`⚠️ Request timeout: ${req.method} ${req.originalUrl}`)
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'The server did not respond in time. Please try again.',
        timestamp: new Date().toISOString()
      })
    }
  })
  next()
})

// Health check endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    server: 'DEXTER v2 - Multi-Agent System',
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: '2.0.0'
  })
})

// Root route - SINTRA.AI v3 API Overview
app.get('/', (req, res) => {
  const systemHealth = agentManager.isSystemHealthy()
  const stats = agentManager.getSystemStats()

  res.json({
    name: 'SINTRA.AI v3 - Multi-Agent Intelligence System',
    version: '3.0.0',
    status: systemHealth ? 'online' : 'degraded',
    totalAgents: stats.totalAgents,
    agents: {
      dexter: 'Data Analysis Agent',
      cassie: 'Communication & CRM Agent',
      emmie: 'Marketing Intelligence Agent',
      aura: 'Workflow Orchestration Agent',
      nova: 'Insights & Reporting Agent',
      kai: 'Knowledge Automation Agent',
      lex: 'Legal & Compliance Agent',
      finn: 'Finance & Forecasting Agent',
      ari: 'AI Research & Model Ops Agent',
      echo: 'Event & Notification Agent',
      vera: 'Visualization & BI Agent',
      omni: 'System Operations Agent'
    },
    endpoints: {
      health: 'GET /api/ping',
      system: 'GET /api/unified-agents/health',
      agents: 'GET /api/unified-agents',
      export: 'POST /api/export',
      brainAI: 'GET /api/brain/*',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      }
    },
    features: {
      realDataMode: true,
      brainAI: true,
      interAgentCommunication: true,
      exportFormats: ['PDF', 'CSV', 'XLSX', 'PPTX'],
      authentication: 'JWT with Refresh Tokens',
      logging: 'Winston',
      websockets: true
    },
    documentation: 'SINTRA.AI v3 Complete System'
  })
})

export function setupErrorHandling() {
    // Error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error('💥 API Error:', err.message)
        logger.error('Stack:', err.stack)

        // Don't send error if headers already sent
        if (res.headersSent) {
            return next(err)
        }

        // Determine status code
        const statusCode = err.statusCode || err.status || 500

        // Send structured error response
        res.status(statusCode).json({
            status: 'error',
            message: process.env.NODE_ENV === 'production'
            ? 'An error occurred processing your request'
            : err.message,
            error: process.env.NODE_ENV === 'production' ? undefined : {
            message: err.message,
            type: err.name
            },
            timestamp: new Date().toISOString()
        })
    })
}
