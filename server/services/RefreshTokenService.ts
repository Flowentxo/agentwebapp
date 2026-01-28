/**
 * Refresh Token Service - SINGLETON PATTERN
 * Manages refresh token lifecycle for persistent authentication
 */

import crypto from 'crypto'
import { RefreshToken, RefreshTokenCreateInput, RefreshTokenResponse, sanitizeRefreshToken } from '../models/RefreshToken'
import { logger } from '../utils/logger'

export class RefreshTokenService {
  private static instance: RefreshTokenService | null = null
  private tokens: Map<string, RefreshToken> = new Map()

  private constructor() {
    logger.info('🔐 RefreshTokenService singleton instance created')
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RefreshTokenService {
    if (!RefreshTokenService.instance) {
      RefreshTokenService.instance = new RefreshTokenService()
    }
    return RefreshTokenService.instance
  }

  /**
   * Create a new refresh token
   */
  async createRefreshToken(input: RefreshTokenCreateInput): Promise<{ token: string; tokenRecord: RefreshTokenResponse }> {
    try {
      // Generate a secure random token
      const token = crypto.randomBytes(64).toString('hex')

      // Hash the token before storage (never store plain tokens)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Create token record
      const tokenId = `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const refreshToken: RefreshToken = {
        id: tokenId,
        userId: input.userId,
        tokenHash,
        expiresAt: input.expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        revoked: false,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      }

      this.tokens.set(tokenId, refreshToken)

      // Clean up expired tokens for this user
      await this.cleanupExpiredTokens(input.userId)

      logger.info(`✅ Refresh token created for user: ${input.userId}`)
      logger.info(`   🆔 Token ID: ${tokenId}`)
      logger.info(`   ⏰ Expires: ${input.expiresAt.toISOString()}`)
      logger.info(`   📊 Total active tokens: ${this.tokens.size}`)

      return {
        token, // Return the plain token (only time it's visible)
        tokenRecord: sanitizeRefreshToken(refreshToken)
      }
    } catch (error: any) {
      logger.error(`❌ Failed to create refresh token: ${error.message}`)
      throw error
    }
  }

  /**
   * Verify and return refresh token record
   */
  async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
      // Hash the provided token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Find matching token
      const tokenRecord = Array.from(this.tokens.values()).find(
        t => t.tokenHash === tokenHash
      )

      if (!tokenRecord) {
        logger.warn('⚠️  Refresh token not found')
        return null
      }

      // Check if revoked
      if (tokenRecord.revoked) {
        logger.warn(`⚠️  Refresh token revoked: ${tokenRecord.id}`)
        return null
      }

      // Check if expired
      const now = new Date()
      const expiresAt = new Date(tokenRecord.expiresAt)
      if (now > expiresAt) {
        logger.warn(`⚠️  Refresh token expired: ${tokenRecord.id}`)
        // Auto-revoke expired token
        await this.revokeToken(tokenRecord.id)
        return null
      }

      logger.info(`✅ Refresh token verified: ${tokenRecord.id}`)
      return tokenRecord
    } catch (error: any) {
      logger.error(`❌ Token verification error: ${error.message}`)
      return null
    }
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    try {
      const token = this.tokens.get(tokenId)
      if (!token) {
        logger.warn(`⚠️  Token not found for revocation: ${tokenId}`)
        return false
      }

      token.revoked = true
      token.revokedAt = new Date().toISOString()
      this.tokens.set(tokenId, token)

      logger.info(`✅ Refresh token revoked: ${tokenId}`)
      return true
    } catch (error: any) {
      logger.error(`❌ Token revocation error: ${error.message}`)
      return false
    }
  }

  /**
   * Revoke all tokens for a user (on logout/password change)
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      let revokedCount = 0
      const userTokens = Array.from(this.tokens.values()).filter(t => t.userId === userId)

      for (const token of userTokens) {
        if (!token.revoked) {
          token.revoked = true
          token.revokedAt = new Date().toISOString()
          this.tokens.set(token.id, token)
          revokedCount++
        }
      }

      logger.info(`✅ Revoked ${revokedCount} tokens for user: ${userId}`)
      return revokedCount
    } catch (error: any) {
      logger.error(`❌ Bulk token revocation error: ${error.message}`)
      return 0
    }
  }

  /**
   * Clean up expired and revoked tokens
   */
  async cleanupExpiredTokens(userId?: string): Promise<number> {
    try {
      let deletedCount = 0
      const now = new Date()

      for (const [tokenId, token] of this.tokens.entries()) {
        // Skip if filtering by user and doesn't match
        if (userId && token.userId !== userId) {
          continue
        }

        // Delete if expired or revoked for more than 30 days
        const expiresAt = new Date(token.expiresAt)
        const shouldDelete =
          now > expiresAt ||
          (token.revoked && token.revokedAt && now.getTime() - new Date(token.revokedAt).getTime() > 30 * 24 * 60 * 60 * 1000)

        if (shouldDelete) {
          this.tokens.delete(tokenId)
          deletedCount++
        }
      }

      if (deletedCount > 0) {
        logger.info(`🧹 Cleaned up ${deletedCount} expired/revoked tokens`)
      }

      return deletedCount
    } catch (error: any) {
      logger.error(`❌ Token cleanup error: ${error.message}`)
      return 0
    }
  }

  /**
   * Get all active tokens for a user
   */
  getUserTokens(userId: string): RefreshTokenResponse[] {
    const userTokens = Array.from(this.tokens.values())
      .filter(t => t.userId === userId && !t.revoked)
      .map(sanitizeRefreshToken)

    return userTokens
  }

  /**
   * Get token statistics
   */
  getStats(): { total: number; active: number; revoked: number; expired: number } {
    const now = new Date()
    const allTokens = Array.from(this.tokens.values())

    return {
      total: allTokens.length,
      active: allTokens.filter(t => !t.revoked && new Date(t.expiresAt) > now).length,
      revoked: allTokens.filter(t => t.revoked).length,
      expired: allTokens.filter(t => !t.revoked && new Date(t.expiresAt) <= now).length
    }
  }
}

// Export singleton instance getter
export const getRefreshTokenService = () => RefreshTokenService.getInstance()
