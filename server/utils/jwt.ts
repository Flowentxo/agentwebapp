/**
 * JWT Utilities - Enhanced with Access + Refresh Tokens
 * Handle JWT token generation and verification for persistent authentication
 */

import jwt from 'jsonwebtoken'

// Environment variables with secure defaults
// EXPORTED: Used by socket.ts and auth middleware for consistent JWT verification
export const JWT_SECRET: string = process.env.JWT_SECRET || '3pPhKpcuAuPPWU1YoUDrRfYt42DyLzApfQgvbawOcdHChrTUn87EYyZLcBFyltp0sVkAuk39vWar0TN2lSxlHw'
const ACCESS_TOKEN_EXPIRES_IN: string = process.env.ACCESS_TOKEN_EXP || '15m'  // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXP || '7d' // 7 days

export interface JWTPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
  type?: 'access' | 'refresh' // Token type
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Generate Access Token (short-lived for API requests)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as jwt.SignOptions
  )
}

/**
 * Generate Refresh Token (long-lived for token renewal)
 * Note: The actual refresh token is a random string stored in DB
 * This JWT is just for the cookie (optional layer)
 */
export function generateRefreshTokenJWT(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
  )
}

/**
 * Generate both access and refresh tokens (legacy support)
 */
export function generateToken(payload: Omit<JWTPayload, 'type'>): string {
  // For backward compatibility, generate access token
  return generateAccessToken(payload)
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'type'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshTokenJWT(payload)
  }
}

/**
 * Verify JWT token (works for both access and refresh)
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    return payload
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired')
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token')
    }
    throw new Error('Token verification failed')
  }
}

/**
 * Verify access token specifically
 */
export function verifyAccessToken(token: string): JWTPayload {
  const payload = verifyToken(token)
  if (payload.type && payload.type !== 'access') {
    throw new Error('Invalid token type')
  }
  return payload
}

/**
 * Verify refresh token JWT (in addition to DB lookup)
 */
export function verifyRefreshTokenJWT(token: string): JWTPayload {
  const payload = verifyToken(token)
  if (payload.type && payload.type !== 'refresh') {
    throw new Error('Invalid token type')
  }
  return payload
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000)
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const expiration = getTokenExpiration(token)
    if (!expiration) return true
    return new Date() > expiration
  } catch (error) {
    return true
  }
}

/**
 * Get refresh token expiration date (7 days from now)
 */
export function getRefreshTokenExpirationDate(): Date {
  const days = parseInt(REFRESH_TOKEN_EXPIRES_IN.replace('d', '')) || 7
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + days)
  return expiration
}
