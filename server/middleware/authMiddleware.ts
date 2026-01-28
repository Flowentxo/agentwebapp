/**
 * Authentication Middleware (Cookie-based)
 * Protects routes and checks user permissions
 *
 * SECURITY ENHANCED VERSION
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../utils/jwt'
import { logger } from '../utils/logger'

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

/**
 * Extract JWT token from multiple sources (prioritized order)
 * 1. Authorization header (Bearer token) - for cross-origin requests
 * 2. accessToken cookie (new format)
 * 3. token cookie (legacy format)
 */
function extractToken(req: Request): string | null {
  // 1. Check Authorization header first (highest priority for cross-origin)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // 2. Check new accessToken cookie
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken
  }

  // 3. Fall back to legacy token cookie
  if (req.cookies?.token) {
    return req.cookies.token
  }

  return null
}

/**
 * Authenticate user from JWT token in cookie OR Authorization header
 * Supports multiple token sources for cross-origin compatibility
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from multiple sources
    const token = extractToken(req)

    if (!token) {
      logger.warn('[AUTH] No token found in Authorization header or cookies', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
        hasCookies: Object.keys(req.cookies || {}).length > 0,
        cookieNames: Object.keys(req.cookies || {})
      })
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Verify token
    const payload = verifyToken(token)
    req.user = payload

    // Log successful authentication (debug level to avoid spam)
    logger.debug('[AUTH] User authenticated', {
      userId: payload.userId,
      role: payload.role,
      path: req.path,
      tokenSource: req.headers.authorization ? 'header' : 'cookie'
    })

    next()
  } catch (error: any) {
    logger.warn('[AUTH] Token verification failed', {
      ip: req.ip,
      path: req.path,
      error: error.message
    })
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    logger.warn('[AUTH] Admin access attempted without authentication', {
      ip: req.ip,
      path: req.path
    })
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (req.user.role !== 'admin') {
    logger.warn('[AUTH] Non-admin user attempted admin access', {
      userId: req.user.userId,
      role: req.user.role,
      ip: req.ip,
      path: req.path
    })
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    })
  }

  // Log admin access (for security audit trail)
  logger.info('[AUTH] Admin access granted', {
    userId: req.user.userId,
    email: req.user.email,
    ip: req.ip,
    path: req.path,
    method: req.method
  })

  next()
}

/**
 * Admin IP whitelist check (optional security layer)
 * Only allow admin access from specific IPs
 */
export function requireAdminIP(req: Request, res: Response, next: NextFunction) {
  const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || []

  // If no whitelist configured, skip this check (development mode)
  if (whitelist.length === 0) {
    return next()
  }

  const clientIP = req.ip || req.socket.remoteAddress || 'unknown'

  if (!whitelist.includes(clientIP)) {
    logger.error('[AUTH] Admin access denied from unauthorized IP', {
      ip: clientIP,
      userId: req.user?.userId,
      path: req.path
    })
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin access is restricted from this IP address'
    })
  }

  next()
}

/**
 * Optional authentication (doesn't fail if no token)
 * Uses the same token extraction logic as authenticate()
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req)

    if (token) {
      const payload = verifyToken(token)
      req.user = payload
    }

    next()
  } catch (error) {
    // Continue without user (token invalid/expired is OK for optional auth)
    next()
  }
}
