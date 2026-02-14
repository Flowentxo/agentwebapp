/**
 * Enhanced Authentication Routes with Refresh Tokens
 * Implements permanent login fix with access/refresh token pattern
 */

import { Router, Request, Response } from 'express'
import { getUserService } from '../services/UserService'
import { getRefreshTokenService } from '../services/RefreshTokenService'
import {
  generateAccessToken,
  getRefreshTokenExpirationDate,
  verifyToken,
  isTokenExpired
} from '../utils/jwt'
import { authenticate, requireAdmin } from '../middleware/authMiddleware'
import { loginRateLimiter, apiRateLimiter } from '../middleware/rateLimit'
import { logger } from '../utils/logger'

export const authEnhancedRouter = Router()
const userService = getUserService()
const refreshTokenService = getRefreshTokenService()

// Cookie configuration - Cross-origin compatible for development
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// For cross-origin requests between different ports (localhost:3000 → localhost:4000),
// we need sameSite: 'none' with secure: true in production.
// In development, we use 'lax' because same-origin (same host) requests work fine.
// NOTE: If frontend and backend are on different ports, the browser treats them as
// same-site but different-origin, so 'lax' should work for form submissions and
// top-level navigations. For fetch/XHR with credentials, we also include the token
// in localStorage and send it via Authorization header as a fallback.
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevent XSS attacks
  secure: IS_PRODUCTION, // HTTPS only in production
  sameSite: 'lax' as const, // 'lax' works for same-site (localhost), stricter than 'none'
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
}

/**
 * POST /auth/login
 * Enhanced login with access + refresh tokens
 */
authEnhancedRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  const startTime = Date.now()

  try {
    const { email, password } = req.body
    const ipAddress = req.ip
    const userAgent = req.headers['user-agent']

    logger.info('🔐 === ENHANCED LOGIN ATTEMPT ===')
    logger.info(`   📧 Email: ${email}`)
    logger.info(`   🌐 IP: ${ipAddress}`)
    logger.info(`   🖥️  User Agent: ${userAgent?.substring(0, 50)}...`)

    // Validation
    if (!email || !password) {
      logger.warn('❌ Login failed: Missing credentials')
      return res.status(400).json({
        ok: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Email and password required'
        }
      })
    }

    // Find user
    logger.info('🔍 Step 1/5: Looking up user...')
    const user = await userService.getUserByEmail(email)

    if (!user) {
      logger.warn(`❌ Login failed: User not found for ${email}`)
      return res.status(401).json({
        ok: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      })
    }

    logger.info('✅ Step 1/5 complete: User found')

    // Verify password
    logger.info('🔐 Step 2/5: Verifying password...')
    const isValid = await userService.verifyPassword(password, user.password)

    if (!isValid) {
      logger.warn(`❌ Login failed: Invalid password for ${email}`)
      return res.status(401).json({
        ok: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      })
    }

    logger.info('✅ Step 2/5 complete: Password verified')

    // Revoke old refresh tokens (logout other sessions)
    logger.info('🔄 Step 3/5: Revoking old refresh tokens...')
    const revokedCount = await refreshTokenService.revokeAllUserTokens(user.id)
    logger.info(`✅ Step 3/5 complete: ${revokedCount} old tokens revoked`)

    // Generate new access token
    logger.info('🎫 Step 4/5: Generating tokens...')
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Generate and store refresh token
    const { token: refreshToken } = await refreshTokenService.createRefreshToken({
      userId: user.id,
      tokenHash: '', // Will be hashed in service
      expiresAt: getRefreshTokenExpirationDate(),
      ipAddress,
      userAgent
    })

    logger.info('✅ Step 4/5 complete: Tokens generated')

    // Set cookies
    logger.info('🍪 Step 5/5: Setting authentication cookies...')

    // Access token cookie (15min, memory only on client)
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 minutes
    })

    // Refresh token cookie (7 days, secure)
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

    // Legacy token cookie (for backward compatibility)
    res.cookie('token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000
    })

    logger.info('✅ Step 5/5 complete: Cookies set')

    const { password: _, ...userWithoutPassword } = user
    const processingTime = Date.now() - startTime

    logger.info('🎉 === LOGIN SUCCESSFUL ===')
    logger.info(`   👤 User: ${email}`)
    logger.info(`   🆔 ID: ${user.id}`)
    logger.info(`   👔 Role: ${user.role}`)
    logger.info(`   ⏱️  Processing time: ${processingTime}ms`)

    res.json({
      ok: true,
      message: 'Login successful',
      accessToken, // Include token for localStorage storage (fallback for cross-origin)
      data: {
        user: userWithoutPassword,
        accessToken, // Also include in data for consistency
        next: '/v4',
        expiresIn: '15m'
      },
      user: userWithoutPassword, // Backward compatibility
      expiresIn: '15m' // Backward compatibility
    })
  } catch (error: any) {
    const processingTime = Date.now() - startTime

    logger.error('💥 === LOGIN EXCEPTION ===')
    logger.error(`   Error: ${error.message}`)
    logger.error(`   Stack: ${error.stack}`)
    logger.error(`   Processing time: ${processingTime}ms`)

    res.status(500).json({
      ok: false,
      error: {
        code: 'AUTH_INTERNAL',
        message: 'Login failed'
      }
    })
  }
})

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
authEnhancedRouter.post('/refresh', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    logger.info('🔄 Token refresh requested')

    if (!refreshToken) {
      logger.warn('❌ Refresh failed: No refresh token provided')
      return res.status(401).json({ error: 'Refresh token required' })
    }

    // Verify refresh token in database
    const tokenRecord = await refreshTokenService.verifyRefreshToken(refreshToken)

    if (!tokenRecord) {
      logger.warn('❌ Refresh failed: Invalid or expired refresh token')
      // Clear invalid cookies
      res.clearCookie('accessToken')
      res.clearCookie('refreshToken')
      res.clearCookie('token')
      return res.status(401).json({ error: '⚠️ Your session has expired, please log in again.' })
    }

    // Get user
    const user = userService.getUserById(tokenRecord.userId)

    if (!user) {
      logger.warn(`❌ Refresh failed: User not found for token ${tokenRecord.id}`)
      await refreshTokenService.revokeToken(tokenRecord.id)
      return res.status(401).json({ error: 'User not found' })
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Update access token cookie
    res.cookie('accessToken', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 minutes
    })

    // Update legacy token cookie
    res.cookie('token', newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000
    })

    logger.info(`✅ Token refreshed for user: ${user.email}`)

    res.json({
      ok: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken, // Include token for clients that store in localStorage
      expiresIn: '15m'
    })
  } catch (error: any) {
    logger.error(`❌ Token refresh error: ${error.message}`)
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

/**
 * POST /auth/logout
 * Enhanced logout with refresh token revocation
 */
authEnhancedRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId

    if (userId) {
      // Revoke all refresh tokens for user
      const revokedCount = await refreshTokenService.revokeAllUserTokens(userId)
      logger.info(`🚪 User logged out: ${userId} (${revokedCount} tokens revoked)`)
    }

    // Clear all auth cookies
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    res.clearCookie('token') // Legacy

    res.json({ message: 'Logout successful' })
  } catch (error: any) {
    logger.error(`❌ Logout error: ${error.message}`)
    res.status(500).json({ error: 'Logout failed' })
  }
})

/**
 * GET /auth/me
 * Get current user info (auto-refreshes token if needed)
 */
authEnhancedRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const user = userService.getUserById(req.user.userId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error: any) {
    logger.error(`❌ Get user error: ${error.message}`)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

/**
 * POST /auth/register
 * Register new user (admin only)
 */
authEnhancedRouter.post('/register', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' })
    }

    const newUser = await userService.createUser({
      email,
      password,
      name,
      role: role || 'user'
    })

    logger.info(`✅ New user registered: ${email} (${role})`)

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    })
  } catch (error: any) {
    logger.error(`❌ Registration error: ${error.message}`)
    res.status(400).json({ error: error.message || 'Registration failed' })
  }
})

/**
 * GET /auth/check
 * Check authentication status
 */
authEnhancedRouter.get('/check', async (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies?.accessToken || req.cookies?.token
    const refreshToken = req.cookies?.refreshToken

    // Check if access token is valid
    if (accessToken && !isTokenExpired(accessToken)) {
      try {
        const payload = verifyToken(accessToken)
        return res.json({
          authenticated: true,
          requiresRefresh: false,
          user: payload
        })
      } catch (error) {
        // Access token invalid, check refresh token
      }
    }

    // Check if refresh token is valid
    if (refreshToken) {
      const tokenRecord = await refreshTokenService.verifyRefreshToken(refreshToken)
      if (tokenRecord) {
        return res.json({
          authenticated: true,
          requiresRefresh: true // Client should call /auth/refresh
        })
      }
    }

    res.json({ authenticated: false })
  } catch (error: any) {
    logger.error(`❌ Auth check error: ${error.message}`)
    res.json({ authenticated: false })
  }
})

/**
 * GET /auth/check-session
 * Detailed session check with debugging info
 * Checks both cookies and Authorization header
 */
authEnhancedRouter.get('/check-session', async (req: Request, res: Response) => {
  try {
    // Get token from multiple sources
    const authHeader = req.headers.authorization
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const cookieAccessToken = req.cookies?.accessToken
    const cookieToken = req.cookies?.token
    const refreshToken = req.cookies?.refreshToken

    // Use the first available token
    const token = headerToken || cookieAccessToken || cookieToken

    // Debug info
    const debugInfo = {
      hasAuthHeader: !!authHeader,
      hasHeaderToken: !!headerToken,
      hasCookieAccessToken: !!cookieAccessToken,
      hasCookieToken: !!cookieToken,
      hasRefreshToken: !!refreshToken,
      cookieNames: Object.keys(req.cookies || {}),
      origin: req.headers.origin || 'none',
      timestamp: new Date().toISOString(),
    }

    if (!token) {
      return res.json({
        authenticated: false,
        message: 'No token found in Authorization header or cookies',
        debug: debugInfo,
      })
    }

    // Verify the token
    try {
      const payload = verifyToken(token)
      const isExpired = isTokenExpired(token)

      if (isExpired) {
        return res.json({
          authenticated: false,
          message: 'Token is expired',
          canRefresh: !!refreshToken,
          debug: debugInfo,
        })
      }

      return res.json({
        authenticated: true,
        user: {
          id: payload.userId || payload.id || payload.sub,
          email: payload.email,
          role: payload.role,
        },
        tokenSource: headerToken ? 'Authorization header' : 'Cookie',
        debug: debugInfo,
      })
    } catch (verifyError: any) {
      return res.json({
        authenticated: false,
        message: `Token verification failed: ${verifyError.message}`,
        canRefresh: !!refreshToken,
        debug: debugInfo,
      })
    }
  } catch (error: any) {
    logger.error(`❌ Check-session error: ${error.message}`)
    res.status(500).json({
      authenticated: false,
      error: error.message,
    })
  }
})

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
authEnhancedRouter.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const tokens = refreshTokenService.getUserTokens(req.user.userId)

    res.json({
      sessions: tokens,
      count: tokens.length
    })
  } catch (error: any) {
    logger.error(`❌ Get sessions error: ${error.message}`)
    res.status(500).json({ error: 'Failed to get sessions' })
  }
})

/**
 * DELETE /auth/sessions/:id
 * Revoke a specific session
 */
authEnhancedRouter.delete('/sessions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { id } = req.params
    const revoked = await refreshTokenService.revokeToken(id)

    if (!revoked) {
      return res.status(404).json({ error: 'Session not found' })
    }

    logger.info(`✅ Session revoked: ${id} by user ${req.user.userId}`)

    res.json({ message: 'Session revoked successfully' })
  } catch (error: any) {
    logger.error(`❌ Revoke session error: ${error.message}`)
    res.status(500).json({ error: 'Failed to revoke session' })
  }
})

/**
 * GET /auth/stats
 * Get authentication statistics (admin only)
 */
authEnhancedRouter.get('/stats', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const refreshTokenStats = refreshTokenService.getStats()

    res.json({
      refreshTokens: refreshTokenStats,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    logger.error(`❌ Get stats error: ${error.message}`)
    res.status(500).json({ error: 'Failed to get statistics' })
  }
})
