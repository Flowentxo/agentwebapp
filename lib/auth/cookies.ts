/**
 * SINTRA Auth System - Cookie Management
 * Secure httpOnly cookie handling for session tokens
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

// =====================================================
// Configuration
// =====================================================
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'sintra.sid';
// IMPORTANT: Don't set domain for localhost - browsers handle it automatically
// Setting domain='localhost' can cause cookies to not be sent properly
const COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;
const IS_PROD = process.env.NODE_ENV === 'production';

export interface CookieOptions {
  maxAge?: number; // in seconds
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
}

// =====================================================
// Set Session Cookie
// =====================================================

/**
 * Set a secure session cookie
 * @param token - Session token (plain text, will be sent in cookie)
 * @param maxAge - Cookie lifetime in seconds
 */
export async function setSessionCookie(token: string, maxAge?: number): Promise<void> {
  const cookieStore = await cookies();

  const options: CookieOptions = {
    httpOnly: true,              // Prevent JavaScript access
    secure: IS_PROD,             // HTTPS only in production
    sameSite: 'lax',             // CSRF protection
    path: '/',                   // Available site-wide
    maxAge: maxAge || 7 * 24 * 60 * 60, // Default: 7 days
    // Only set domain in production (not for localhost)
    ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
  };

  cookieStore.set(COOKIE_NAME, token, options);
}

// =====================================================
// Clear Session Cookie
// =====================================================

/**
 * Clear the session cookie (logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
    ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
  });
}

// =====================================================
// Get Session Token from Request
// =====================================================

/**
 * Extract session token from cookies (Server Components)
 * @returns Session token or null if not found
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Extract session token from NextRequest (Middleware)
 * @param request - Next.js request object
 * @returns Session token or null if not found
 */
export function getSessionTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

// =====================================================
// CSRF Cookie Management
// =====================================================

const CSRF_COOKIE_NAME = 'sintra.csrf';

/**
 * Set CSRF token cookie
 * @param token - CSRF token
 */
export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,  // Must be readable by JavaScript for double-submit
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
  });
}

/**
 * Get CSRF token from cookies
 * @returns CSRF token or null if not found
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Get CSRF token from NextRequest
 * @param request - Next.js request object
 * @returns CSRF token or null if not found
 */
export function getCsrfTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Clear CSRF cookie
 */
export async function clearCsrfCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
  });
}

// =====================================================
// Exports
// =====================================================
export const cookieConfig = {
  sessionCookieName: COOKIE_NAME,
  csrfCookieName: CSRF_COOKIE_NAME,
  domain: COOKIE_DOMAIN,
  isProd: IS_PROD,
};
