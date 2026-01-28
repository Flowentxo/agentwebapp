/**
 * Centralized Token Retrieval Service
 * SIMPLIFIED: Only checks 'accessToken' key - no fallbacks, no complexity
 */

/**
 * Get auth token from localStorage or cookies
 * PRIORITY: localStorage first, then cookies
 */
export function getValidToken(): string | null {
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
 * Get token with verbose logging for debugging
 */
export function getValidTokenWithLogging(): string | null {
  if (typeof window === 'undefined') {
    console.log('[AUTH] SSR - no token available');
    return null;
  }

  // 1. Check localStorage
  const token = localStorage.getItem('accessToken');
  console.log('[AUTH] localStorage.accessToken:', token ? `FOUND (${token.substring(0, 8)}...)` : 'MISSING');

  if (token && token !== 'undefined' && token !== 'null' && token.length > 10) {
    return token;
  }

  // 2. Check cookies
  try {
    const cookies = document.cookie.split('; ');
    const accessCookie = cookies.find(c => c.startsWith('accessToken='));
    console.log('[AUTH] cookie.accessToken:', accessCookie ? 'FOUND' : 'MISSING');

    if (accessCookie) {
      const cookieToken = accessCookie.split('=')[1];
      if (cookieToken && cookieToken !== 'undefined' && cookieToken.length > 10) {
        return cookieToken;
      }
    }
  } catch {
    console.log('[AUTH] Cookie parsing failed');
  }

  console.log('[AUTH] NO TOKEN FOUND ANYWHERE');
  return null;
}

/**
 * Check if user has stored credentials
 */
export function hasStoredCredentials(): boolean {
  if (typeof window === 'undefined') return false;
  return getValidToken() !== null;
}

/**
 * Store token in localStorage
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', token);
  console.log('!!! TOKEN PHYSICALLY STORED !!!', token.substring(0, 8));
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
  console.log('[AUTH] Events dispatched: auth:login + auth-state-change');
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
