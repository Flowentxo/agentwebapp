/**
 * Refresh Token Model
 * Stores refresh tokens for persistent authentication
 */

export interface RefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  createdAt: string
  revoked: boolean
  revokedAt?: string
  ipAddress?: string
  userAgent?: string
}

export interface RefreshTokenCreateInput {
  userId: string
  tokenHash: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface RefreshTokenResponse {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
  revoked: boolean
  ipAddress?: string
}

/**
 * Sanitize refresh token for API responses (remove sensitive data)
 */
export function sanitizeRefreshToken(token: RefreshToken): RefreshTokenResponse {
  return {
    id: token.id,
    userId: token.userId,
    expiresAt: token.expiresAt,
    createdAt: token.createdAt,
    revoked: token.revoked,
    ipAddress: token.ipAddress
  }
}
