/**
 * SINTRA Auth System - CSRF Protection
 * Double-submit cookie pattern for CSRF prevention
 */

import { generateCsrfToken, timingSafeEqual } from './crypto';
import { setCsrfCookie, getCsrfToken, getCsrfTokenFromRequest } from './cookies';
import type { NextRequest } from 'next/server';

// =====================================================
// CSRF Token Generation
// =====================================================

/**
 * Generate and set a CSRF token cookie
 * @returns CSRF token (for embedding in forms/headers)
 */
export async function issueCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  await setCsrfCookie(token);
  return token;
}

/**
 * Get existing CSRF token or generate a new one
 * @returns CSRF token
 */
export async function getCsrfTokenOrGenerate(): Promise<string> {
  let token = await getCsrfToken();

  if (!token) {
    token = await issueCsrfToken();
  }

  return token;
}

// =====================================================
// CSRF Token Validation
// =====================================================

/**
 * Validate CSRF token from request (Server Components)
 * Checks both cookie and header/form field
 * @param submittedToken - Token from form field or x-csrf-token header
 * @returns True if valid
 */
export async function validateCsrfToken(submittedToken: string | null): Promise<boolean> {
  if (!submittedToken) {
    return false;
  }

  const cookieToken = await getCsrfToken();

  if (!cookieToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(submittedToken, cookieToken);
}

/**
 * Validate CSRF token from NextRequest (Middleware/Route Handlers)
 * @param request - Next.js request object
 * @returns True if valid
 */
export function validateCsrfTokenFromRequest(request: NextRequest): boolean {
  // Get token from header or form data
  const headerToken = request.headers.get('x-csrf-token');

  // For now, we'll use header token (form data requires parsing body)
  if (!headerToken) {
    return false;
  }

  const cookieToken = getCsrfTokenFromRequest(request);

  if (!cookieToken) {
    return false;
  }

  return timingSafeEqual(headerToken, cookieToken);
}

// =====================================================
// CSRF Protection Middleware Helper
// =====================================================

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Require valid CSRF token (for use in API routes)
 * @param request - Next.js request object
 * @returns Validation result
 */
export async function requireCsrfToken(request: Request): Promise<CsrfValidationResult> {
  // Get token from header
  const submittedToken = request.headers.get('x-csrf-token');

  if (!submittedToken) {
    return {
      valid: false,
      error: 'CSRF token missing',
    };
  }

  const isValid = await validateCsrfToken(submittedToken);

  if (!isValid) {
    return {
      valid: false,
      error: 'CSRF token invalid',
    };
  }

  return { valid: true };
}

// =====================================================
// CSRF Exempt Methods
// =====================================================

const CSRF_SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Check if request method is CSRF-safe
 * @param method - HTTP method
 * @returns True if method is safe (GET, HEAD, OPTIONS)
 */
export function isCsrfSafeMethod(method: string): boolean {
  return CSRF_SAFE_METHODS.includes(method.toUpperCase());
}

// =====================================================
// Exports
// =====================================================

export const csrf = {
  issue: issueCsrfToken,
  getOrGenerate: getCsrfTokenOrGenerate,
  validate: validateCsrfToken,
  validateFromRequest: validateCsrfTokenFromRequest,
  require: requireCsrfToken,
  isSafeMethod: isCsrfSafeMethod,
};
