/**
 * RATE LIMITING & DoS PROTECTION
 *
 * Protects API endpoints from abuse and excessive requests
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the 100 requests in 15 minutes limit. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    logger.warn('[RATE_LIMIT] API limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict rate limiter for AI chat endpoints
 * 10 requests per minute per user (cost protection!)
 */
export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI calls per minute
  message: {
    error: 'AI request limit exceeded',
    message: 'You can make up to 10 AI requests per minute. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('[RATE_LIMIT] AI chat limit exceeded', {
      userId: req.headers['x-user-id'] || req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'AI request limit exceeded',
      message: 'You have reached the limit of 10 AI requests per minute. Please wait before sending another message.',
      retryAfter: '60 seconds'
    });
  }
});

/**
 * Login brute-force protection
 * 5 failed attempts per 15 minutes
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many login attempts',
    message: 'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.'
  },
  handler: (req: Request, res: Response) => {
    logger.warn('[RATE_LIMIT] Login brute-force attempt detected', {
      ip: req.ip,
      email: req.body?.email
    });

    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes or reset your password.'
    });
  }
});

/**
 * Strict limiter for expensive operations
 * (e.g., password reset, email sending)
 */
export const expensiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    error: 'Operation limit exceeded',
    message: 'You can only perform this operation 3 times per hour. Please try again later.'
  },
  handler: (req: Request, res: Response) => {
    logger.warn('[RATE_LIMIT] Expensive operation limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      error: 'Operation limit exceeded',
      message: 'This operation has a limit of 3 requests per hour. Please try again later.'
    });
  }
});

/**
 * Severe rate limiter for global abuse prevention
 * 1000 requests per hour per IP
 */
export const severeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    logger.error('[RATE_LIMIT] IP BLOCKED for severe abuse', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // TODO: Add IP to permanent blocklist
    // await blockIPAddress(req.ip);

    res.status(429).json({
      error: 'IP temporarily blocked',
      message: 'Your IP address has been temporarily blocked due to excessive requests. If you believe this is an error, please contact support.'
    });
  }
});

/**
 * Agent metrics endpoint limiter
 * Prevent excessive metrics queries
 */
export const metricsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Metrics request limit exceeded',
    message: 'Please wait before requesting more metrics data.'
  }
});

/**
 * File upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Upload limit exceeded',
    message: 'You can upload up to 20 files per hour.'
  }
});

/**
 * Admin operations limiter (more lenient for admins)
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  message: {
    error: 'Admin rate limit exceeded',
    message: 'Even admins have limits. Please slow down.'
  }
});

/**
 * Dynamic rate limiter based on user role
 */
export function createRoleBasedLimiter() {
  return (req: any, res: Response, next: any) => {
    const userRole = req.user?.role;

    // Admin gets higher limits
    if (userRole === 'admin') {
      return adminLimiter(req, res, next);
    }

    // Power users get medium limits
    if (userRole === 'poweruser') {
      return apiLimiter(req, res, next);
    }

    // Regular users get standard limits
    return apiLimiter(req, res, next);
  };
}
