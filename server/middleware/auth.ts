import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

// CRITICAL: Must match the secret in lib/auth/session.ts and server/utils/jwt.ts
const JWT_SECRET = process.env.JWT_SECRET || '3pPhKpcuAuPPWU1YoUDrRfYt42DyLzApfQgvbawOcdHChrTUn87EYyZLcBFyltp0sVkAuk39vWar0TN2lSxlHw'

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    id: string; // Alias for userId (for backward compatibility)
    email?: string;
    role: 'user' | 'admin' | 'poweruser';
  }
}

// ============================================================================
// EXISTING AUTH (Preserved for backward compatibility)
// ============================================================================

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // STEP 1: Try Authorization header (Bearer token)
  const authHeader = req.headers['authorization']
  let token = authHeader && authHeader.split(' ')[1]
  let tokenSource = 'none'

  if (token) {
    tokenSource = 'header'
    logger.info('[AUTH] Step 1: Found token in Authorization header', { path: req.path })
  } else {
    logger.info('[AUTH] Step 1: No Authorization header', { path: req.path })
  }

  // STEP 2: Fallback to cookies if no Authorization header
  if (!token && req.cookies) {
    if (req.cookies.accessToken) {
      token = req.cookies.accessToken
      tokenSource = 'cookie:accessToken'
      logger.info('[AUTH] Step 2: Found token in accessToken cookie', { path: req.path })
    } else if (req.cookies.token) {
      token = req.cookies.token
      tokenSource = 'cookie:token'
      logger.info('[AUTH] Step 2: Found token in token cookie', { path: req.path })
    } else {
      logger.info('[AUTH] Step 2: No token cookies found', {
        path: req.path,
        availableCookies: Object.keys(req.cookies)
      })
    }
  }

  // STEP 3: No token found anywhere
  if (!token) {
    logger.warn('[AUTH] Step 3: FAILED - No token found', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasCookies: !!req.cookies,
      cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
      origin: req.headers.origin,
      referer: req.headers.referer
    })
    return res.status(401).json({ error: 'Authentication required' })
  }

  // STEP 4: Verify token structure
  const tokenParts = token.split('.');
  const isValidJWTStructure = tokenParts.length === 3;

  logger.info('[AUTH] Step 4: Verifying token', {
    tokenSource,
    path: req.path,
    isValidJWTStructure,
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 20),
  });

  if (!isValidJWTStructure) {
    logger.error('[AUTH] Step 4: Token is NOT a valid JWT (missing parts)', {
      path: req.path,
      tokenSource,
      partsCount: tokenParts.length,
      tokenPrefix: token.substring(0, 30),
    });
    return res.status(403).json({ error: 'Invalid token format - not a JWT' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.warn('[AUTH] Step 4: Token verification FAILED', {
        error: err.message,
        errorName: err.name,
        path: req.path,
        tokenSource,
        tokenPrefix: token.substring(0, 30),
      })
      return res.status(403).json({ error: 'Invalid or expired token' })
    }

    const user = decoded as any
    // Normalize user object - ensure both userId and id are available
    const userId = user.userId || user.id || user.sub
    req.user = {
      ...user,
      userId,
      id: userId, // Add id alias for routes that use req.user.id
    }
    // Also set userId directly on req for backward compatibility
    ;(req as any).userId = userId

    logger.info('[AUTH] Step 5: SUCCESS - Token verified', {
      userId,
      email: user.email,
      role: user.role,
      path: req.path,
      tokenSource
    })
    next()
  })
}

export const generateToken = (userId: string, role: string, email?: string) => {
  return jwt.sign({ userId, role, email }, JWT_SECRET, { expiresIn: '24h' })
}

// ============================================================================
// ENHANCED SECURITY FEATURES
// ============================================================================

/**
 * Enhanced auth with better error messages and logging
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[AUTH] Missing or invalid Authorization header', { ip: req.ip, path: req.path });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email?: string;
      role: string;
    };

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'user' | 'admin' | 'poweruser'
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', message: 'Please login again' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('[AUTH] Authentication error', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: Array<'user' | 'admin' | 'poweruser'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('[AUTH] Insufficient permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Legacy auth fallback (x-user-id header) - DEVELOPMENT ONLY!
 */
export const legacyAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Try JWT first
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return requireAuth(req, res, next);
  }

  // Fallback to x-user-id (UNSAFE!)
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (process.env.NODE_ENV === 'production') {
    logger.error('[AUTH] x-user-id used in production!');
    return res.status(401).json({ error: 'Legacy auth not allowed' });
  }

  logger.warn('[AUTH] Using legacy x-user-id (UNSAFE)', { userId });

  req.user = {
    userId,
    role: userId.includes('admin') ? 'admin' : 'user'
  };

  next();
}

/**
 * Admin IP whitelist check
 */
export function requireAdminIP(req: Request, res: Response, next: NextFunction) {
  const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

  if (whitelist.length === 0) {
    return next(); // No whitelist = allow all (dev mode)
  }

  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

  if (!whitelist.includes(clientIP)) {
    logger.warn('[AUTH] Admin access denied from IP', { ip: clientIP });
    return res.status(403).json({ error: 'Access denied from your IP' });
  }

  next();
}
