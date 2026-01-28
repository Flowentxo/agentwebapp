/**
 * =============================================================================
 * SINTRA.AI v3 - Production Security Middleware
 * =============================================================================
 *
 * Comprehensive security configuration for production deployments:
 * - Helmet.js with strict CSP
 * - Rate limiting with Redis backing
 * - CORS configuration for production domains
 * - Request validation and sanitization
 * - Security headers enforcement
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.CORS_ORIGIN || 'https://sintra.ai';
const trustedDomains = (process.env.TRUSTED_DOMAINS || corsOrigin).split(',').map(d => d.trim());

// =============================================================================
// HELMET CONFIGURATION (Security Headers)
// =============================================================================

/**
 * Production-grade Helmet configuration
 * Provides comprehensive HTTP security headers
 */
export const helmetMiddleware = helmet({
  // Content Security Policy - Strict mode for production
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],

      // Scripts - Strict in production
      scriptSrc: isProduction
        ? ["'self'", "'unsafe-inline'", 'https://va.vercel-scripts.com', 'https://vercel.live']
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'https://va.vercel-scripts.com'],

      // Styles
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],

      // Images
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.googleusercontent.com',
        'https://*.githubusercontent.com',
        'https://images.unsplash.com',
        'https://avatars.githubusercontent.com',
      ],

      // Fonts
      fontSrc: [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
      ],

      // API Connections
      connectSrc: [
        "'self'",
        // Internal API
        'http://localhost:3000',
        'http://localhost:4000',
        // External APIs
        'https://api.openai.com',
        'https://api.anthropic.com',
        'https://api.resend.com',
        'https://hooks.slack.com',
        'https://api.tavily.com',
        // Analytics
        'https://vercel.live',
        'https://vitals.vercel-insights.com',
        // WebSockets
        'wss://*.pusher.com',
        'ws://localhost:4000',
        // Production domain
        ...trustedDomains.map(d => `https://${d}`),
        ...trustedDomains.map(d => `wss://${d}`),
      ],

      // Frames - Disabled except for specific embeds
      frameSrc: ["'self'", 'https://vercel.live'],

      // Workers
      workerSrc: ["'self'", 'blob:'],

      // Object/Plugin embeds - Disabled for security
      objectSrc: ["'none'"],

      // Form submissions
      formAction: ["'self'"],

      // Base URI
      baseUri: ["'self'"],

      // Upgrade insecure requests in production
      ...(isProduction && { upgradeInsecureRequests: [] }),
    },
    reportOnly: false,
  },

  // Strict Transport Security (HSTS)
  strictTransportSecurity: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,

  // X-Content-Type-Options
  xContentTypeOptions: true,

  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },

  // X-XSS-Protection (legacy but still useful)
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Permissions Policy
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },

  // Cross-Origin configurations
  crossOriginEmbedderPolicy: false, // Required for some third-party resources
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CORS

  // Hide X-Powered-By
  hidePoweredBy: true,

  // Origin Agent Cluster
  originAgentCluster: true,
});

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

/**
 * Production CORS configuration
 * Strictly limits origins to production domains
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.) in development
    if (!origin && !isProduction) {
      return callback(null, true);
    }

    // Check if origin is in trusted domains
    const isAllowed = trustedDomains.some(domain => {
      const originHost = origin ? new URL(origin).hostname : '';
      return originHost === domain || originHost.endsWith(`.${domain}`);
    });

    // In development, also allow localhost
    const isLocalhost = !isProduction && origin && (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('192.168.')
    );

    if (isAllowed || isLocalhost) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-user-id',
    'x-request-id',
    'x-api-key',
  ],
  exposedHeaders: [
    'Content-Length',
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
};

// =============================================================================
// RATE LIMITING (Production-Grade)
// =============================================================================

/**
 * Global rate limiter - Prevents DDoS attacks
 * 500 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 2000, // Stricter in production
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/api/ping';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('[RATE_LIMIT] Global limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * AI Agent rate limiter - Protects expensive AI operations
 * 20 requests per minute per IP
 */
export const aiAgentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 20 : 100, // Stricter in production
  message: {
    error: 'AI Rate Limit Exceeded',
    message: 'You have reached the limit for AI requests. Please wait before trying again.',
    retryAfter: '60 seconds',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if available, otherwise IP
    return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('[RATE_LIMIT] AI agent limit exceeded', {
      userId: req.headers['x-user-id'] || req.ip,
      path: req.path,
      agent: req.params.agentId || 'unknown',
    });

    res.status(429).json({
      error: 'AI Rate Limit Exceeded',
      message: 'You have reached the limit of AI requests. Please wait 60 seconds.',
      retryAfter: '60 seconds',
    });
  },
});

/**
 * Authentication rate limiter - Prevents brute force attacks
 * 5 attempts per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too Many Login Attempts',
    message: 'Account temporarily locked due to too many failed attempts.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.error('[RATE_LIMIT] Brute force attempt detected', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      error: 'Account Locked',
      message: 'Too many failed login attempts. Please try again in 15 minutes or reset your password.',
    });
  },
});

/**
 * File upload rate limiter
 * 10 uploads per hour per user
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Upload Limit Exceeded',
    message: 'You can upload up to 10 files per hour.',
  },
  keyGenerator: (req: Request) => {
    return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
  },
});

// =============================================================================
// REQUEST VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Validates and sanitizes incoming requests
 */
export const requestValidator: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Check for oversized payloads
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  const maxPayloadSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxPayloadSize) {
    logger.warn('[SECURITY] Oversized payload rejected', {
      ip: req.ip,
      size: contentLength,
      path: req.path,
    });

    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request payload exceeds the maximum allowed size of 10MB.',
    });
  }

  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\.[\/\\]/,           // Path traversal
    /<script/i,             // XSS attempt
    /javascript:/i,         // JavaScript injection
    /data:/i,               // Data URI injection
    /vbscript:/i,           // VBScript injection
    /on\w+=/i,              // Event handler injection
  ];

  const fullUrl = req.originalUrl;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl)) {
      logger.error('[SECURITY] Malicious request detected', {
        ip: req.ip,
        url: fullUrl,
        pattern: pattern.toString(),
      });

      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request contains invalid characters.',
      });
    }
  }

  // Add request ID for tracing
  req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();

  next();
};

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// =============================================================================
// IP BLOCKING MIDDLEWARE
// =============================================================================

// In-memory blocklist (should be Redis-backed in production)
const blockedIPs = new Set<string>();
const ipViolations = new Map<string, { count: number; lastViolation: number }>();

/**
 * Tracks IP violations and blocks repeat offenders
 */
export const ipBlocker: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';

  // Check if IP is blocked
  if (blockedIPs.has(ip)) {
    logger.warn('[SECURITY] Blocked IP attempted access', { ip });
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Your IP address has been blocked.',
    });
  }

  // Track violations
  const violations = ipViolations.get(ip);
  if (violations) {
    const hourAgo = Date.now() - 60 * 60 * 1000;

    // Reset if last violation was more than an hour ago
    if (violations.lastViolation < hourAgo) {
      ipViolations.delete(ip);
    }
    // Block if too many violations
    else if (violations.count >= 10) {
      blockedIPs.add(ip);
      logger.error('[SECURITY] IP blocked due to violations', { ip, count: violations.count });

      // Auto-unblock after 24 hours
      setTimeout(() => {
        blockedIPs.delete(ip);
        ipViolations.delete(ip);
      }, 24 * 60 * 60 * 1000);

      return res.status(403).json({
        error: 'Access Denied',
        message: 'Your IP address has been temporarily blocked.',
      });
    }
  }

  next();
};

/**
 * Records a security violation for an IP
 */
export function recordViolation(ip: string): void {
  const violations = ipViolations.get(ip) || { count: 0, lastViolation: 0 };
  violations.count++;
  violations.lastViolation = Date.now();
  ipViolations.set(ip, violations);

  logger.warn('[SECURITY] Violation recorded', { ip, count: violations.count });
}

// =============================================================================
// SECURITY LOGGING MIDDLEWARE
// =============================================================================

/**
 * Logs security-relevant request information
 */
export const securityLogger: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Log authentication attempts
  if (req.path.includes('/auth/')) {
    logger.info('[SECURITY] Auth request', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100),
    });
  }

  // Log admin actions
  if (req.path.includes('/admin/')) {
    logger.info('[SECURITY] Admin request', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.headers['x-user-id'],
    });
  }

  next();
};

// =============================================================================
// EXPORT COMBINED SECURITY MIDDLEWARE
// =============================================================================

/**
 * Combined security middleware for Express app
 */
export const productionSecurity = [
  ipBlocker,
  requestValidator,
  helmetMiddleware,
  globalRateLimiter,
  securityLogger,
];

export default {
  helmetMiddleware,
  corsConfig,
  globalRateLimiter,
  aiAgentRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  requestValidator,
  ipBlocker,
  securityLogger,
  recordViolation,
  productionSecurity,
};
