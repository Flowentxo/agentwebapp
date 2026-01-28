/**
 * Rate Limiting Middleware
 * Prevents brute-force login attempts and API abuse
 */

import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if request should be allowed
   */
  check(identifier: string, maxAttempts: number, windowMs: number): { allowed: boolean; remainingAttempts: number; resetTime: number } {
    const now = Date.now()
    let entry = this.limits.get(identifier)

    // Create new entry if doesn't exist
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        blocked: false
      }
    }

    // Reset if window expired
    if (now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        blocked: false
      }
    }

    // Check if blocked
    if (entry.blocked && now < entry.resetTime) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    if (entry.count > maxAttempts) {
      entry.blocked = true
      this.limits.set(identifier, entry)

      logger.warn(`🚫 Rate limit exceeded for: ${identifier}`)
      logger.warn(`   Attempts: ${entry.count}/${maxAttempts}`)
      logger.warn(`   Reset in: ${Math.ceil((entry.resetTime - now) / 1000)}s`)

      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime
      }
    }

    // Update entry
    this.limits.set(identifier, entry)

    return {
      allowed: true,
      remainingAttempts: maxAttempts - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * Reset rate limit for identifier (e.g., after successful login)
   */
  reset(identifier: string): void {
    this.limits.delete(identifier)
    logger.info(`✅ Rate limit reset for: ${identifier}`)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [identifier, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(identifier)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned up ${cleaned} expired rate limit entries`)
    }
  }

  /**
   * Get statistics
   */
  getStats(): { total: number; blocked: number } {
    const entries = Array.from(this.limits.values())
    return {
      total: entries.length,
      blocked: entries.filter(e => e.blocked).length
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
  }
}

// Singleton rate limiter
const rateLimiter = new RateLimiter()

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(options: {
  maxAttempts?: number
  windowMs?: number
  keyGenerator?: (req: Request) => string
  skipSuccessfulRequests?: boolean
  message?: string
}) {
  const {
    maxAttempts = 5,
    windowMs = 60 * 1000, // 1 minute
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later'
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = keyGenerator(req)
      const result = rateLimiter.check(identifier, maxAttempts, windowMs)

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxAttempts.toString())
      res.setHeader('X-RateLimit-Remaining', result.remainingAttempts.toString())
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
        res.setHeader('Retry-After', retryAfter.toString())

        logger.warn(`🚫 Rate limit blocked request from: ${identifier}`)

        return res.status(429).json({
          error: message,
          retryAfter,
          resetTime: new Date(result.resetTime).toISOString()
        })
      }

      // Reset on successful response if configured
      if (skipSuccessfulRequests) {
        const originalSend = res.send
        res.send = function (data) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            rateLimiter.reset(identifier)
          }
          return originalSend.call(this, data)
        }
      }

      next()
    } catch (error: any) {
      logger.error(`❌ Rate limit middleware error: ${error.message}`)
      next() // Allow request on error
    }
  }
}

/**
 * Login-specific rate limiter (strict)
 */
export const loginRateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req: Request) => {
    // Combine IP and email for more accurate tracking
    const email = req.body?.email || 'unknown'
    return `login:${req.ip}:${email}`
  },
  skipSuccessfulRequests: true, // Reset on successful login
  message: '⚠️ Too many login attempts. Please try again in 15 minutes.'
})

/**
 * API rate limiter (general)
 */
export const apiRateLimiter = createRateLimiter({
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many API requests, please slow down'
})

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimiter = createRateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: '⚠️ Too many attempts for this sensitive operation. Please try again later.'
})

export { rateLimiter }
