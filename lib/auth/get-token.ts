/**
 * Centralized Token Retrieval Service
 * Handles token storage, expiration checks, and proactive refresh
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Refresh state to prevent concurrent refresh attempts
let refreshInProgress: Promise<string | null> | null = null;
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN_MS = 5000; // 5 seconds between refresh attempts

/**
 * Decode JWT payload without verification (client-side only)
 */
function decodeJWTPayload(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired or near-expiry
 * Returns true if token expires within `bufferSeconds` (default 60s)
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload?.exp) return true;
  const expiresAt = payload.exp * 1000;
  const bufferMs = bufferSeconds * 1000;
  return Date.now() >= (expiresAt - bufferMs);
}

/**
 * Get a raw token from storage (no expiration check)
 */
function getRawToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check localStorage for 'accessToken' (PRIMARY)
  const token = localStorage.getItem('accessToken');
  if (token && token !== 'undefined' && token !== 'null' && token.length > 10) {
    return token;
  }

  // 2. Check cookies for 'accessToken' (FALLBACK)
  try {
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];
    if (cookieToken && cookieToken !== 'undefined' && cookieToken.length > 10) {
      return cookieToken;
    }
  } catch {
    // Cookie parsing failed
  }

  return null;
}

/**
 * Get auth token from localStorage or cookies
 * Returns null if token is expired (with 60s buffer)
 */
export function getValidToken(): string | null {
  const token = getRawToken();
  if (!token) return null;

  // Check expiration - return null if expired or near-expiry
  if (isTokenExpired(token)) {
    return null;
  }

  return token;
}

/**
 * Get token even if expired (for refresh flow - we need the raw token to know credentials exist)
 */
export function getStoredToken(): string | null {
  return getRawToken();
}

/**
 * Force logout: clear all tokens + session cookies, notify listeners, redirect to /login
 */
export function forceLogout(): void {
  if (typeof window === 'undefined') return;
  clearTokens();
  // Clear session cookies so middleware won't consider user authenticated
  // (middleware checks cookie existence, not validity)
  document.cookie = 'sintra.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  notifyAuthLogout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/**
 * Silently refresh the access token using the refresh token cookie
 */
async function silentRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Include cookies (refreshToken)
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      // 401/403 = refresh token is invalid/expired → force logout
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        forceLogout();
      }
      return null;
    }

    const data = await response.json();
    if (data?.ok && data?.accessToken) {
      storeToken(data.accessToken);
      notifyAuthLogin(data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ensure a valid (non-expired) token is available
 * If token is expired or near-expiry, attempts a silent refresh
 * Use this in async contexts (API interceptors, socket connections)
 */
export async function ensureValidToken(): Promise<string | null> {
  // First check if we have a valid token
  const token = getValidToken();
  if (token) return token;

  // Token is expired or missing - check if we have a stored token at all
  const rawToken = getRawToken();
  if (!rawToken) return null; // No credentials at all

  // Rate-limit refresh attempts
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
    return null;
  }

  // Deduplicate concurrent refresh calls
  if (refreshInProgress) {
    return refreshInProgress;
  }

  lastRefreshAttempt = now;
  refreshInProgress = silentRefresh().finally(() => {
    refreshInProgress = null;
  });

  return refreshInProgress;
}

/**
 * Get token with verbose logging for debugging
 */
export function getValidTokenWithLogging(): string | null {
  if (typeof window === 'undefined') {
    console.log('[AUTH] SSR - no token available');
    return null;
  }

  const token = localStorage.getItem('accessToken');
  console.log('[AUTH] localStorage.accessToken:', token ? `FOUND (${token.substring(0, 8)}...)` : 'MISSING');

  if (token && token !== 'undefined' && token !== 'null' && token.length > 10) {
    const expired = isTokenExpired(token);
    console.log('[AUTH] Token expired:', expired);
    if (expired) return null;
    return token;
  }

  try {
    const cookies = document.cookie.split('; ');
    const accessCookie = cookies.find(c => c.startsWith('accessToken='));
    console.log('[AUTH] cookie.accessToken:', accessCookie ? 'FOUND' : 'MISSING');

    if (accessCookie) {
      const cookieToken = accessCookie.split('=')[1];
      if (cookieToken && cookieToken !== 'undefined' && cookieToken.length > 10) {
        if (isTokenExpired(cookieToken)) return null;
        return cookieToken;
      }
    }
  } catch {
    console.log('[AUTH] Cookie parsing failed');
  }

  console.log('[AUTH] NO VALID TOKEN FOUND');
  return null;
}

/**
 * Check if user has stored credentials (even if expired)
 */
export function hasStoredCredentials(): boolean {
  if (typeof window === 'undefined') return false;
  return getRawToken() !== null;
}

/**
 * Store token in localStorage
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', token);
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token'); // Legacy cleanup
  localStorage.removeItem('sintra-token'); // Legacy cleanup
}

/**
 * Dispatch auth:login event for Socket/API clients to reconnect
 */
export function notifyAuthLogin(token: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth:login', {
    detail: { token, timestamp: Date.now() }
  }));
  // Also dispatch generic auth-state-change event
  window.dispatchEvent(new Event('auth-state-change'));
}

/**
 * Dispatch auth:logout event for Socket/API clients to disconnect
 */
export function notifyAuthLogout(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth:logout', {
    detail: { timestamp: Date.now() }
  }));
  window.dispatchEvent(new Event('auth-state-change'));
}
