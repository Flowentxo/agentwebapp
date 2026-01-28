/**
 * SudoModal - Re-authentication Modal for Sensitive Actions
 *
 * Displays when a sensitive action requires identity verification.
 * Supports both password and passkey (WebAuthn) verification.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Key, Fingerprint, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { useWebAuthn } from '@/hooks/useWebAuthn';

interface SudoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function SudoModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Identität bestätigen',
  description = 'Für diese Aktion müssen Sie Ihre Identität bestätigen.',
}: SudoModalProps) {
  const [mode, setMode] = useState<'password' | 'passkey'>('password');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const {
    isSupported: passkeySupported,
    isLoading: passkeyLoading,
  } = useWebAuthn();

  // Focus password input when modal opens
  useEffect(() => {
    if (isOpen && mode === 'password') {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setError(null);
      setSuccess(false);
      setMode('password');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  // Verify with password
  const handlePasswordVerify = useCallback(async () => {
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/sudo/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: 'password',
          password,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setError(data.error?.message || 'Verifizierung fehlgeschlagen');
        setPassword('');
        passwordInputRef.current?.focus();
      }
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }, [password, loading, onSuccess, onClose]);

  // Verify with passkey
  const handlePasskeyVerify = useCallback(async () => {
    if (loading || passkeyLoading) return;

    setLoading(true);
    setError(null);

    try {
      // Start authentication challenge
      const startRes = await fetch('/api/auth/webauthn/login/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const startData = await startRes.json();
      if (!startData.ok) {
        throw new Error(startData.error?.message || 'Passkey-Start fehlgeschlagen');
      }

      const { challengeId, options } = startData.data;

      // Use WebAuthn API
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const authResponse = await startAuthentication(options);

      // Verify with sudo endpoint
      const verifyRes = await fetch('/api/auth/sudo/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: 'passkey',
          challengeId,
          response: authResponse,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setError(verifyData.error?.message || 'Passkey-Verifizierung fehlgeschlagen');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey-Authentifizierung abgebrochen');
      } else {
        setError(err.message || 'Passkey-Verifizierung fehlgeschlagen');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, passkeyLoading, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          {/* Success State */}
          {success ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-4 animate-scale-in">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-emerald-500 font-medium">Identität bestätigt</p>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border-2 border-red-500/30 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* Mode Toggle */}
              {passkeySupported && (
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setMode('password')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      mode === 'password'
                        ? 'bg-muted text-foreground border-2 border-border shadow-sm'
                        : 'bg-card text-muted-foreground hover:text-foreground border-2 border-border hover:bg-muted/50'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    Passwort
                  </button>
                  <button
                    onClick={() => setMode('passkey')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      mode === 'passkey'
                        ? 'bg-muted text-foreground border-2 border-border shadow-sm'
                        : 'bg-card text-muted-foreground hover:text-foreground border-2 border-border hover:bg-muted/50'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    Passkey
                  </button>
                </div>
              )}

              {/* Password Mode */}
              {mode === 'password' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePasswordVerify();
                  }}
                >
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Passwort
                    </label>
                    <input
                      ref={passwordInputRef}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ihr Passwort eingeben"
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl bg-card border-2 border-border text-foreground text-sm placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !password.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifiziere...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Bestätigen
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Passkey Mode */}
              {mode === 'passkey' && (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/5 border-2 border-primary/20 flex items-center justify-center mb-4">
                      <Fingerprint className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Verwenden Sie Face ID, Touch ID oder Ihren Sicherheitsschlüssel zur Bestätigung
                    </p>
                  </div>
                  <button
                    onClick={handlePasskeyVerify}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Warte auf Passkey...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        Mit Passkey bestätigen
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/50 border-t-2 border-border">
          <p className="text-xs text-muted-foreground text-center">
            Diese Sicherheitsmaßnahme schützt Ihr Konto vor unberechtigtem Zugriff
          </p>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// =====================================================
// useSudo Hook - For easy integration with API calls
// =====================================================

interface UseSudoOptions {
  onSuccess?: () => void;
}

interface UseSudoReturn {
  /** Show the sudo modal */
  requireSudo: (callback: () => void) => void;
  /** SudoModal component to render */
  SudoModalComponent: React.ReactNode;
  /** Whether the modal is currently open */
  isOpen: boolean;
}

/**
 * Hook for handling sudo mode in components.
 *
 * Usage:
 * ```tsx
 * const { requireSudo, SudoModalComponent } = useSudo();
 *
 * const handleDelete = async () => {
 *   try {
 *     await deletePasskey(id);
 *   } catch (err) {
 *     if (err.code === 'SUDO_REQUIRED') {
 *       requireSudo(() => handleDelete());
 *       return;
 *     }
 *     throw err;
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     {SudoModalComponent}
 *   </>
 * );
 * ```
 */
export function useSudo(options?: UseSudoOptions): UseSudoReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const requireSudo = useCallback((callback: () => void) => {
    setPendingCallback(() => callback);
    setIsOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    options?.onSuccess?.();
    if (pendingCallback) {
      // Delay callback slightly to allow modal to close
      setTimeout(() => {
        pendingCallback();
        setPendingCallback(null);
      }, 100);
    }
  }, [pendingCallback, options]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setPendingCallback(null);
  }, []);

  const SudoModalComponent = (
    <SudoModal
      isOpen={isOpen}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );

  return {
    requireSudo,
    SudoModalComponent,
    isOpen,
  };
}
