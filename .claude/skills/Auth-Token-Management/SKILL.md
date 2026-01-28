# SKILL: Auth Token Management & Socket/API Client Synchronization

## Problem Statement
Token visibility issue where Socket-Provider and Inbox-Service cannot find the auth token even though the user is logged in at `http://localhost:3000/inbox`.

## Mission: LINK AUTH TO SOCKET & API CLIENT

### 1. Token-Zentralisierung (`lib/auth/get-token.ts`)
Create a helper function `getValidToken()` that reliably extracts the token from:
1. `localStorage` (check keys: 'sintra-token', 'accessToken', 'token')
2. `Cookies` (HttpOnly cookie fallback)
3. `AuthContext` state (React context)

```typescript
// lib/auth/get-token.ts
export function getValidToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Try localStorage keys in order of preference
  const localStorageKeys = ['sintra-token', 'accessToken', 'token'];
  for (const key of localStorageKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      console.log(`[AUTH] Token found in localStorage: ${key}`);
      return token;
    }
  }

  // 2. Check cookies (non-HttpOnly only)
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1];
  if (cookieToken) {
    console.log('[AUTH] Token found in cookies');
    return cookieToken;
  }

  console.log('[AUTH] No token found in localStorage or cookies');
  return null;
}
```

### 2. Socket-Provider Fix (`lib/socket/inbox-socket-provider.tsx`)
- Import `getValidToken`
- Instead of aborting on missing token, listen for auth state changes
- Rebuild socket connection when login occurs

```typescript
// Key changes needed:
import { getValidToken } from '@/lib/auth/get-token';

// Listen for auth:login event to trigger reconnection
useEffect(() => {
  const handleAuthLogin = () => {
    const token = getValidToken();
    if (token && !socket) {
      // Trigger reconnection with new token
      reconnect();
    }
  };

  window.addEventListener('auth:login', handleAuthLogin);
  return () => window.removeEventListener('auth:login', handleAuthLogin);
}, [socket]);
```

### 3. API-Client Fix (`lib/api/client.ts`)
- Ensure request interceptor uses `getValidToken()` for ALL requests to port 4000
- Add logging: `[API_AUTH] Attaching token to request: YES/NO`

```typescript
apiClient.interceptors.request.use((config) => {
  const token = getValidToken();
  const hasToken = !!token;
  console.log(`[API_AUTH] Attaching token to request: ${hasToken ? 'YES' : 'NO'}`);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 4. Auth-Context Sync
When user logs in, dispatch a custom event so Socket and API clients immediately notice the new token:

```typescript
// In AuthContext login success handler:
localStorage.setItem('accessToken', token);
window.dispatchEvent(new CustomEvent('auth:login', {
  detail: { token, timestamp: Date.now() }
}));
```

## Files to Modify
1. `lib/auth/get-token.ts` - NEW FILE: Centralized token retrieval
2. `lib/socket/inbox-socket-provider.tsx` - Use getValidToken, listen for auth events
3. `lib/api/client.ts` - Use getValidToken in interceptor
4. `lib/api/inbox-service.ts` - Use getValidToken in interceptor
5. Auth context/login handler - Dispatch 'auth:login' event

## Testing Checklist
- [ ] Login at localhost:3000/login
- [ ] Navigate to localhost:3000/inbox
- [ ] Verify Socket connection status shows "Connected" (green Wifi icon)
- [ ] Verify API calls include Authorization header
- [ ] Console shows `[API_AUTH] Attaching token to request: YES`
- [ ] Console shows `[AUTH] Token found in localStorage: accessToken`

## Token Key Priority
1. `accessToken` (primary - set by login)
2. `sintra-token` (legacy)
3. `token` (fallback)
