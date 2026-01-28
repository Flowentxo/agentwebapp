/**
 * useWebAuthn Hook
 * Handles WebAuthn/Passkey operations with SimpleWebAuthn browser library
 */

'use client';

import { useState, useCallback } from 'react';
import {
  startRegistration as startBrowserRegistration,
  startAuthentication as startBrowserAuthentication,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

// =====================================================
// Types
// =====================================================

export interface PasskeyInfo {
  id: string;
  name: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface UseWebAuthnReturn {
  // State
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;

  // Registration
  registerPasskey: (name?: string) => Promise<PasskeyInfo | null>;

  // Authentication
  authenticateWithPasskey: () => Promise<boolean>;

  // Management
  getPasskeys: () => Promise<PasskeyInfo[]>;
  renamePasskey: (id: string, newName: string) => Promise<boolean>;
  deletePasskey: (id: string) => Promise<boolean>;

  // Utilities
  clearError: () => void;
  checkAutofillSupport: () => Promise<boolean>;
}

// =====================================================
// API Helpers
// =====================================================

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  console.log('[WebAuthn:API] >>> REQUEST:', {
    url,
    method: options?.method || 'GET',
    hasBody: !!options?.body,
  });

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Ensure cookies are sent
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log('[WebAuthn:API] <<< RESPONSE:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    const json = await response.json();
    console.log('[WebAuthn:API] <<< JSON:', {
      ok: json.ok,
      hasData: !!json.data,
      error: json.error,
    });

    if (!response.ok || !json.ok) {
      console.error('[WebAuthn:API] Request failed:', {
        httpStatus: response.status,
        jsonOk: json.ok,
        errorCode: json.error?.code,
        errorMessage: json.error?.message,
      });
      return {
        ok: false,
        error: json.error?.message || `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    return {
      ok: true,
      data: json.data,
      status: response.status,
    };
  } catch (err) {
    console.error('[WebAuthn:API] Network/Fetch Error:', {
      url,
      errorName: err instanceof Error ? err.name : 'Unknown',
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

// =====================================================
// Hook
// =====================================================

export function useWebAuthn(): UseWebAuthnReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && browserSupportsWebAuthn();

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check autofill support
  const checkAutofillSupport = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    return browserSupportsWebAuthnAutofill();
  }, []);

  // =====================================================
  // Registration Flow
  // =====================================================

  const registerPasskey = useCallback(
    async (name: string = 'Passkey'): Promise<PasskeyInfo | null> => {
      if (!isSupported) {
        setError('WebAuthn wird von diesem Browser nicht unterstützt');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Get registration options from server
        const startResult = await fetchApi<{
          options: PublicKeyCredentialCreationOptionsJSON;
          challengeId: string;
        }>('/api/auth/webauthn/register/start', { method: 'POST' });

        if (!startResult.ok || !startResult.data) {
          throw new Error(startResult.error || 'Failed to start registration');
        }

        const { options, challengeId } = startResult.data;

        // Step 2: Create credential in browser
        let credential;
        try {
          credential = await startBrowserRegistration(options);
        } catch (err: unknown) {
          // User cancelled or other browser error
          if (err instanceof Error) {
            if (err.name === 'NotAllowedError') {
              throw new Error('Registrierung abgebrochen');
            }
            if (err.name === 'InvalidStateError') {
              throw new Error('Dieser Passkey ist bereits registriert');
            }
            throw new Error(`Browser-Fehler: ${err.message}`);
          }
          throw err;
        }

        // Step 3: Verify with server
        const finishResult = await fetchApi<PasskeyInfo>(
          '/api/auth/webauthn/register/finish',
          {
            method: 'POST',
            body: JSON.stringify({
              challengeId,
              response: credential,
              name,
            }),
          }
        );

        if (!finishResult.ok || !finishResult.data) {
          throw new Error(finishResult.error || 'Failed to complete registration');
        }

        return finishResult.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        console.error('[WebAuthn] Registration error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported]
  );

  // =====================================================
  // Authentication Flow
  // =====================================================

  const authenticateWithPasskey = useCallback(async (): Promise<boolean> => {
    console.log('[WebAuthn:Auth] ========== PASSKEY LOGIN STARTED ==========');
    console.log('[WebAuthn:Auth] Browser support check:', {
      isSupported,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    });

    if (!isSupported) {
      console.error('[WebAuthn:Auth] FAILED: Browser does not support WebAuthn');
      setError('WebAuthn wird von diesem Browser nicht unterstützt');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get authentication options from server
      console.log('[WebAuthn:Auth] Step 1: Fetching authentication options from server...');
      const startResult = await fetchApi<{
        options: PublicKeyCredentialRequestOptionsJSON;
        challengeId: string;
      }>('/api/auth/webauthn/login/start', { method: 'POST' });

      if (!startResult.ok || !startResult.data) {
        console.error('[WebAuthn:Auth] Step 1 FAILED:', {
          ok: startResult.ok,
          hasData: !!startResult.data,
          error: startResult.error,
          status: startResult.status,
        });
        throw new Error(startResult.error || 'Failed to start authentication');
      }

      const { options, challengeId } = startResult.data;
      console.log('[WebAuthn:Auth] Step 1 SUCCESS: Got challenge options', {
        challengeId,
        rpId: options.rpId,
        timeout: options.timeout,
        allowCredentialsCount: options.allowCredentials?.length || 0,
        userVerification: options.userVerification,
      });

      // Validate RPID matches current origin
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
      console.log('[WebAuthn:Auth] RPID Validation:', {
        serverRpId: options.rpId,
        currentOrigin,
        currentHostname,
        rpIdMatchesHostname: options.rpId === currentHostname,
        rpIdEndsWithHostname: currentHostname.endsWith(options.rpId || ''),
      });

      // Step 2: Get credential from browser
      console.log('[WebAuthn:Auth] Step 2: Requesting credential from browser...');
      let credential;
      try {
        credential = await startBrowserAuthentication(options);
        console.log('[WebAuthn:Auth] Step 2 SUCCESS: Browser returned credential', {
          credentialId: credential.id,
          type: credential.type,
          hasAuthenticatorData: !!credential.response.authenticatorData,
          hasClientDataJSON: !!credential.response.clientDataJSON,
          hasSignature: !!credential.response.signature,
        });
      } catch (err: unknown) {
        console.error('[WebAuthn:Auth] Step 2 FAILED - Browser error:', {
          errorName: err instanceof Error ? err.name : 'Unknown',
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
        });

        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            console.error('[WebAuthn:Auth] NotAllowedError: User cancelled or permission denied');
            throw new Error('Anmeldung abgebrochen');
          }
          if (err.name === 'SecurityError') {
            console.error('[WebAuthn:Auth] SecurityError: RPID mismatch or insecure context');
            throw new Error('Sicherheitsfehler. Bitte versuchen Sie es erneut.');
          }
          if (err.name === 'InvalidStateError') {
            console.error('[WebAuthn:Auth] InvalidStateError: No matching credentials found');
            throw new Error('Kein passender Passkey gefunden');
          }
          if (err.name === 'AbortError') {
            console.error('[WebAuthn:Auth] AbortError: Operation was aborted');
            throw new Error('Vorgang abgebrochen');
          }
          throw new Error(`Browser-Fehler: ${err.name} - ${err.message}`);
        }
        throw err;
      }

      // Step 3: Verify with server
      console.log('[WebAuthn:Auth] Step 3: Verifying credential with server...');
      const finishResult = await fetchApi<{
        user: {
          id: string;
          email: string;
          displayName: string;
          roles: string[];
          emailVerified: boolean;
        };
        session: {
          id: string;
          expiresAt: string;
        };
      }>('/api/auth/webauthn/login/finish', {
        method: 'POST',
        body: JSON.stringify({
          challengeId,
          response: credential,
        }),
      });

      if (!finishResult.ok) {
        console.error('[WebAuthn:Auth] Step 3 FAILED:', {
          ok: finishResult.ok,
          error: finishResult.error,
          status: finishResult.status,
        });
        throw new Error(finishResult.error || 'Authentication failed');
      }

      console.log('[WebAuthn:Auth] Step 3 SUCCESS: User authenticated', {
        userId: finishResult.data?.user?.id,
        email: finishResult.data?.user?.email,
        sessionExpiresAt: finishResult.data?.session?.expiresAt,
      });
      console.log('[WebAuthn:Auth] ========== PASSKEY LOGIN COMPLETE ==========');

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      console.error('[WebAuthn:Auth] ========== PASSKEY LOGIN FAILED ==========');
      console.error('[WebAuthn:Auth] Final error:', {
        errorName: err instanceof Error ? err.name : 'Unknown',
        errorMessage: message,
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // =====================================================
  // Management Functions
  // =====================================================

  const getPasskeys = useCallback(async (): Promise<PasskeyInfo[]> => {
    try {
      const result = await fetchApi<{ passkeys: PasskeyInfo[]; count: number }>(
        '/api/auth/webauthn/passkeys'
      );

      if (!result.ok || !result.data) {
        console.error('[WebAuthn] Failed to get passkeys:', result.error);
        return [];
      }

      return result.data.passkeys;
    } catch (err) {
      console.error('[WebAuthn] Get passkeys error:', err);
      return [];
    }
  }, []);

  const renamePasskey = useCallback(
    async (id: string, newName: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchApi('/api/auth/webauthn/passkeys', {
          method: 'PATCH',
          body: JSON.stringify({ passkeyId: id, name: newName }),
        });

        if (!result.ok) {
          throw new Error(result.error || 'Failed to rename passkey');
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Rename failed';
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deletePasskey = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchApi('/api/auth/webauthn/passkeys', {
        method: 'DELETE',
        body: JSON.stringify({ passkeyId: id }),
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to delete passkey');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isLoading,
    error,
    registerPasskey,
    authenticateWithPasskey,
    getPasskeys,
    renamePasskey,
    deletePasskey,
    clearError,
    checkAutofillSupport,
  };
}

export default useWebAuthn;
