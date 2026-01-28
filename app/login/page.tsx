/**
 * SINTRA Login Page - Apple Design Premium Edition
 * Ultra-polished authentication with micro-interactions
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { storeToken, notifyAuthLogin } from '@/lib/auth/get-token';

type AuthErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_UNVERIFIED_EMAIL'
  | 'AUTH_USER_INACTIVE'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_LOCKED'
  | 'AUTH_MFA_REQUIRED'
  | 'AUTH_MFA_INVALID'
  | 'AUTH_MFA_EXPIRED'
  | 'AUTH_PASSKEY_FAILED'
  | 'AUTH_PASSKEY_NOT_SUPPORTED'
  | 'AUTH_INTERNAL';

const messages: Record<AuthErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: 'Ungültige E-Mail oder Passwort.',
  AUTH_UNVERIFIED_EMAIL: 'Bitte bestätige zuerst deine E-Mail-Adresse.',
  AUTH_USER_INACTIVE: 'Dein Konto ist deaktiviert.',
  AUTH_RATE_LIMITED: 'Zu viele Versuche. Bitte warte kurz.',
  AUTH_LOCKED: 'Konto vorübergehend gesperrt.',
  AUTH_MFA_REQUIRED: 'Zwei-Faktor-Authentifizierung erforderlich.',
  AUTH_MFA_INVALID: 'Ungültiger Authentifizierungscode. Bitte versuche es erneut.',
  AUTH_MFA_EXPIRED: 'MFA-Session abgelaufen. Bitte melde dich erneut an.',
  AUTH_PASSKEY_FAILED: 'Passkey-Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
  AUTH_PASSKEY_NOT_SUPPORTED: 'Dein Browser unterstützt keine Passkeys.',
  AUTH_INTERNAL: 'Ein Fehler ist aufgetreten.',
};

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errCode, setErrCode] = useState<AuthErrorCode | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState<string>('/dashboard');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  // Fix hydration mismatch by only rendering client-specific UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // MFA State
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaSessionToken, setMfaSessionToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');

  // Passkey State
  const {
    isSupported: passkeySupported,
    isLoading: passkeyLoading,
    authenticateWithPasskey,
    error: passkeyError, // WebAuthn hook error for debugging
  } = useWebAuthn();

  // Handle Passkey Login
  async function onPasskeyLogin() {
    if (loading || passkeyLoading) return;

    if (!passkeySupported) {
      setErrCode('AUTH_PASSKEY_NOT_SUPPORTED');
      return;
    }

    setErrCode(null);
    const result = await authenticateWithPasskey();

    if (result) {
      setSuccess(true);
      setTimeout(() => {
        window.location.assign(next || '/dashboard');
      }, 800);
    } else {
      setErrCode('AUTH_PASSKEY_FAILED');
    }
  }

  // Focus MFA input when step changes
  useEffect(() => {
    if (mfaStep && mfaInputRef.current) {
      // Small delay to ensure the DOM has updated
      setTimeout(() => {
        mfaInputRef.current?.focus();
      }, 100);
    }
  }, [mfaStep]);

  useEffect(() => {
    document.title = 'Anmelden · SINTRA';
    try {
      const params = new URLSearchParams(window.location.search);
      const nextParam = params.get('next');
      if (nextParam && typeof nextParam === 'string') {
        setNext(nextParam);
      }
    } catch {
      // Use default
    }
  }, []);

  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setCountdown(retryAfter);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setRetryAfter(null);
            setErrCode(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [retryAfter]);

  // Shake animation on error
  useEffect(() => {
    if (errCode) {
      setShakeError(true);
      const timer = setTimeout(() => setShakeError(false), 600);
      return () => clearTimeout(timer);
    }
  }, [errCode]);

  async function onMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErrCode(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({
          pendingToken: mfaSessionToken,
          code: mfaCode,
        }),
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        setErrCode('AUTH_MFA_EXPIRED');
        setLoading(false);
        return;
      }

      const json = await res.json().catch(() => ({ ok: false, error: { code: 'AUTH_INTERNAL' } }));

      // RAW RESPONSE DEBUG
      console.log('[MFA_RAW_RESPONSE]', JSON.stringify(json, null, 2));

      if (json?.ok) {
        // =================================================================
        // MANUAL FORCE-LOGIC: BYPASS AUTH-CONTEXT COMPLETELY (MFA FLOW)
        // Store token DIRECTLY in localStorage with TRIPLE verification
        // =================================================================
        const accessToken = json.accessToken || json.data?.accessToken;
        console.log('>>> FRONTEND RECEIVING TOKEN (MFA):', {
          fromRoot: !!json.accessToken,
          fromData: !!json.data?.accessToken,
          tokenLength: accessToken?.length ?? 0,
          tokenPrefix: accessToken?.substring(0, 15) ?? 'NULL',
        });

        if (accessToken && accessToken.length > 10) {
          // STEP 1: Direct localStorage.setItem (no helper function)
          localStorage.setItem('accessToken', accessToken);
          console.log('>>> MFA STEP 1: localStorage.setItem("accessToken") DONE');

          // STEP 2: Legacy key for backwards compatibility
          localStorage.setItem('token', accessToken);
          console.log('>>> MFA STEP 2: localStorage.setItem("token") DONE');

          // STEP 3: IMMEDIATE VERIFICATION - read back from localStorage
          const verifyRead = localStorage.getItem('accessToken');
          console.log('>>> MFA STEP 3: VERIFICATION READ:', {
            success: verifyRead === accessToken,
            storedLength: verifyRead?.length ?? 0,
            storedPrefix: verifyRead?.substring(0, 15) ?? 'NULL',
          });

          if (verifyRead !== accessToken) {
            console.error('>>> MFA CRITICAL: Token storage FAILED! localStorage did not persist the value.');
            setErrCode('AUTH_INTERNAL');
            setLoading(false);
            return;
          }

          // STEP 4: Dispatch events for Socket/API clients
          storeToken(accessToken); // Also calls the helper (redundant but safe)
          notifyAuthLogin(accessToken);
          window.dispatchEvent(new Event('storage'));
          console.log('>>> MFA STEP 4: All events dispatched');

          // =================================================================
          // REDIRECT LOCK: DO NOT REDIRECT UNTIL TOKEN IS VERIFIED
          // =================================================================
          setSuccess(true);

          // STEP 5: Final verification before redirect
          const finalCheck = localStorage.getItem('accessToken');
          if (!finalCheck || finalCheck.length < 10) {
            console.error('>>> MFA REDIRECT BLOCKED: Token not in localStorage after storage!');
            setErrCode('AUTH_INTERNAL');
            setSuccess(false);
            setLoading(false);
            return;
          }

          console.log('>>> MFA REDIRECT APPROVED: Token verified in localStorage, redirecting...');
          setTimeout(() => {
            window.location.assign(json.data?.next || '/dashboard');
          }, 800);
        } else {
          console.error('>>> MFA CRITICAL: No accessToken in response!', JSON.stringify(json, null, 2));
          setErrCode('AUTH_INTERNAL');
          setLoading(false);
        }
      } else {
        const errorCode = json?.error?.code as AuthErrorCode;
        const errorMessage = json?.error?.message;

        if (errorCode === 'AUTH_INVALID_CREDENTIALS') {
          setErrCode('AUTH_MFA_INVALID');
        } else if (errorMessage?.includes('abgelaufen') || errorMessage?.includes('expired') || errorMessage?.includes('Session expired') || errorMessage?.includes('not found')) {
          setErrCode('AUTH_MFA_EXPIRED');
          setMfaStep(false);
          setMfaCode('');
          setMfaSessionToken('');
        } else {
          setErrCode(errorCode || 'AUTH_MFA_INVALID');
        }
        setLoading(false);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setErrCode('AUTH_INTERNAL');
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErrCode(null);
    setRetryAfter(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({ email, password, remember, next }),
      });

      clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({ ok: false, error: { code: 'AUTH_INTERNAL' } }));

      // RAW RESPONSE DEBUG
      console.log('[LOGIN_RAW_RESPONSE]', JSON.stringify(json, null, 2));

      if (json?.ok) {
        // Check if MFA is required (new pendingToken flow)
        if (json.data?.mfaRequired && json.data?.pendingToken) {
          setMfaSessionToken(json.data.pendingToken);
          setMfaEmail(email);
          setMfaStep(true);
          setErrCode(null);
          setLoading(false);
          return;
        }

        // =================================================================
        // MANUAL FORCE-LOGIC: BYPASS AUTH-CONTEXT COMPLETELY
        // Store token DIRECTLY in localStorage with TRIPLE verification
        // =================================================================
        const accessToken = json.accessToken || json.data?.accessToken;
        console.log('>>> FRONTEND RECEIVING TOKEN:', {
          fromRoot: !!json.accessToken,
          fromData: !!json.data?.accessToken,
          tokenLength: accessToken?.length ?? 0,
          tokenPrefix: accessToken?.substring(0, 15) ?? 'NULL',
        });

        if (accessToken && accessToken.length > 10) {
          // STEP 1: Direct localStorage.setItem (no helper function)
          localStorage.setItem('accessToken', accessToken);
          console.log('>>> STEP 1: localStorage.setItem("accessToken") DONE');

          // STEP 2: Legacy key for backwards compatibility
          localStorage.setItem('token', accessToken);
          console.log('>>> STEP 2: localStorage.setItem("token") DONE');

          // STEP 3: IMMEDIATE VERIFICATION - read back from localStorage
          const verifyRead = localStorage.getItem('accessToken');
          console.log('>>> STEP 3: VERIFICATION READ:', {
            success: verifyRead === accessToken,
            storedLength: verifyRead?.length ?? 0,
            storedPrefix: verifyRead?.substring(0, 15) ?? 'NULL',
          });

          if (verifyRead !== accessToken) {
            console.error('>>> CRITICAL: Token storage FAILED! localStorage did not persist the value.');
            setErrCode('AUTH_INTERNAL');
            setLoading(false);
            return;
          }

          // STEP 4: Dispatch events for Socket/API clients
          storeToken(accessToken); // Also calls the helper (redundant but safe)
          notifyAuthLogin(accessToken);
          window.dispatchEvent(new Event('storage'));
          console.log('>>> STEP 4: All events dispatched');

          // =================================================================
          // REDIRECT LOCK: DO NOT REDIRECT UNTIL TOKEN IS VERIFIED
          // =================================================================
          setSuccess(true);

          // STEP 5: Final verification before redirect
          const finalCheck = localStorage.getItem('accessToken');
          if (!finalCheck || finalCheck.length < 10) {
            console.error('>>> REDIRECT BLOCKED: Token not in localStorage after storage!');
            setErrCode('AUTH_INTERNAL');
            setSuccess(false);
            setLoading(false);
            return;
          }

          console.log('>>> REDIRECT APPROVED: Token verified in localStorage, redirecting...');
          setTimeout(() => {
            window.location.assign(json.data?.next || '/dashboard');
          }, 800);
        } else {
          console.error('>>> CRITICAL: No accessToken in response!', JSON.stringify(json, null, 2));
          setErrCode('AUTH_INTERNAL');
          setLoading(false);
        }
      } else {
        const code = (json?.error?.code || 'AUTH_INTERNAL') as AuthErrorCode;

        // Legacy MFA required handling (backwards compatibility)
        if (code === 'AUTH_MFA_REQUIRED' && json?.error?.details?.mfaSessionToken) {
          setMfaSessionToken(json.error.details.mfaSessionToken);
          setMfaEmail(json.error.details.email || email);
          setMfaStep(true);
          setErrCode(null);
          setLoading(false);
          return;
        }

        setErrCode(code);
        const ra = res.headers.get('Retry-After');
        if (ra) setRetryAfter(Number(ra));
        setLoading(false);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setErrCode('AUTH_INTERNAL');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0">
          {/* Primary gradient orbs */}
          <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px] animate-float-delayed" />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-[150px]" />

          {/* Secondary accent orbs */}
          <div className="absolute top-[60%] left-[30%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] animate-float-slow" />
          <div className="absolute top-[30%] right-[25%] w-[250px] h-[250px] bg-pink-500/10 rounded-full blur-[80px] animate-float-delayed" />
        </div>

        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Success overlay */}
      <div className={`fixed inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm z-50 transition-opacity duration-500 pointer-events-none ${success ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`transform transition-all duration-500 ${success ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-20 h-20 rounded-full bg-green-500/20 backdrop-blur-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className={`relative z-10 w-full max-w-[420px] mx-4 transition-all duration-500 ${success ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Glass Card */}
        <div className={`backdrop-blur-2xl bg-card/[0.03] border border-white/[0.08] rounded-[28px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 ${shakeError ? 'animate-shake' : ''}`}>

          {/* Logo */}
          <div className="flex justify-center mb-10">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[20px] blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-[28px] font-semibold text-white tracking-[-0.02em] mb-3">
              {mfaStep ? 'Zwei-Faktor-Authentifizierung' : 'Willkommen zurück'}
            </h1>
            <p className="text-white/40 text-[15px] font-light">
              {mfaStep
                ? `Code eingeben für ${mfaEmail}`
                : 'Melde dich an, um fortzufahren'}
            </p>
          </div>

          {/* Error Message */}
          {errCode && (
            <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm animate-slide-down">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-red-300 text-sm font-medium">{messages[errCode]}</p>
                  {countdown !== null && countdown > 0 && (
                    <p className="text-red-400/60 text-xs mt-1.5">
                      Erneut versuchen in {countdown}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MFA Form */}
          {mfaStep ? (
            <form onSubmit={onMfaSubmit} className="space-y-6">
              {/* MFA Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>

              {/* MFA Code Input - Simple centered input */}
              <div className="space-y-2">
                <label
                  htmlFor="mfa-code-input"
                  className="block text-center text-sm text-white/50"
                >
                  6-stelliger Code
                </label>
                <input
                  ref={mfaInputRef}
                  id="mfa-code-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setMfaCode(value);
                  }}
                  onFocus={() => setFocusedField('mfaCode')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className={`w-full h-[70px] px-4 rounded-2xl bg-card/[0.05] border border-solid text-white text-[32px] text-center tracking-[0.3em] font-mono leading-[70px] transition-all duration-300 outline-none placeholder:text-white/20 ${
                    focusedField === 'mfaCode'
                      ? 'border-blue-500/50 bg-card/[0.08] shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                      : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-card/[0.06]'
                  }`}
                />
              </div>

              <p className="text-white/40 text-sm text-center">
                Gib den Code aus deiner Authenticator-App ein
              </p>

              {/* Submit MFA Button */}
              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="relative w-full h-[56px] rounded-2xl font-semibold text-[15px] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-4 active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </div>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_40px_rgba(59,130,246,0.4)]" />

                <span className="relative text-white flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifiziere...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifizieren</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>

              {/* Back to login */}
              <button
                type="button"
                onClick={() => {
                  setMfaStep(false);
                  setMfaCode('');
                  setMfaSessionToken('');
                  setErrCode(null);
                }}
                className="w-full text-center text-white/40 text-sm hover:text-white/60 transition-colors mt-4"
              >
                Zurück zur Anmeldung
              </button>
            </form>
          ) : (
            /* Login Form */
            <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="relative group">
                <label
                  className={`absolute left-4 transition-all duration-300 ease-out pointer-events-none z-10 ${
                    focusedField === 'email' || email
                      ? 'top-2 text-[10px] text-blue-400 font-semibold uppercase tracking-[0.08em]'
                      : 'top-1/2 -translate-y-1/2 text-white/30 text-[15px] font-light'
                  }`}
                >
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="email"
                  className={`w-full h-[60px] px-4 pt-[22px] pb-[10px] rounded-2xl bg-card/[0.03] border border-solid text-white text-[15px] leading-[1.2] transition-all duration-300 outline-none ${
                    focusedField === 'email'
                      ? 'border-blue-500/50 bg-card/[0.05] shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                      : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-card/[0.04]'
                  }`}
                />
                {/* Email validation indicator */}
                {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-scale-in">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="relative group">
                <label
                  className={`absolute left-4 transition-all duration-300 ease-out pointer-events-none z-10 ${
                    focusedField === 'password' || password
                      ? 'top-2 text-[10px] text-blue-400 font-semibold uppercase tracking-[0.08em]'
                      : 'top-1/2 -translate-y-1/2 text-white/30 text-[15px] font-light'
                  }`}
                >
                  Passwort
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                  className={`w-full h-[60px] px-4 pt-[22px] pb-[10px] pr-12 rounded-2xl bg-card/[0.03] border border-solid text-white text-[15px] leading-[1.2] transition-all duration-300 outline-none ${
                    focusedField === 'password'
                      ? 'border-blue-500/50 bg-card/[0.05] shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                      : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-card/[0.04]'
                  }`}
                />
                {/* Toggle password visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-[22px] h-[22px] rounded-lg bg-card/[0.04] border border-white/[0.1] peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all duration-300 flex items-center justify-center group-hover:border-white/[0.2] peer-focus:ring-2 peer-focus:ring-blue-500/20">
                      <svg className={`w-3.5 h-3.5 text-white transition-all duration-300 ${remember ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-white/40 text-[13px] group-hover:text-white/60 transition-colors select-none">
                    Angemeldet bleiben
                  </span>
                </label>
                <a
                  href="/request-password-reset"
                  className="text-[13px] text-blue-400/80 hover:text-blue-300 transition-colors font-medium"
                >
                  Passwort vergessen?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (countdown !== null && countdown > 0)}
                className="relative w-full h-[56px] rounded-2xl font-semibold text-[15px] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-4 active:scale-[0.98]"
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_40px_rgba(59,130,246,0.4)]" />

                <span className="relative text-white flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Anmelden...</span>
                    </>
                  ) : countdown && countdown > 0 ? (
                    `Warten (${countdown}s)`
                  ) : (
                    <>
                      <span>Anmelden</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>
          )}

          {/* Divider - only show when not in MFA step */}
          {!mfaStep && (
            <>
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.06]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-5 bg-background/50 backdrop-blur-sm text-white/25 text-xs font-medium uppercase tracking-wider">
                oder fortfahren mit
              </span>
            </div>
          </div>

          {/* Passkey Login Button - only render after mount to avoid hydration mismatch */}
          {mounted && passkeySupported && (
            <button
              type="button"
              onClick={onPasskeyLogin}
              disabled={passkeyLoading}
              className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-white/90 text-[14px] font-medium hover:from-indigo-500/20 hover:to-purple-500/20 hover:border-indigo-500/30 transition-all duration-300 flex items-center justify-center gap-3 group active:scale-[0.98] disabled:opacity-50"
            >
              {passkeyLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Warte auf Passkey...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                  </svg>
                  <span>Mit Passkey anmelden</span>
                </>
              )}
            </button>
          )}

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = `/api/auth/oauth/google?next=${encodeURIComponent(next)}`;
              }}
              className="h-[52px] rounded-2xl bg-card/[0.03] border border-white/[0.06] text-white/70 text-[14px] font-medium hover:bg-card/[0.06] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = `/api/auth/oauth/github?next=${encodeURIComponent(next)}`;
              }}
              className="h-[52px] rounded-2xl bg-card/[0.03] border border-white/[0.06] text-white/70 text-[14px] font-medium hover:bg-card/[0.06] hover:border-white/[0.12] transition-all duration-300 flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          {/* Register Link */}
          <p className="mt-10 text-center text-[14px] text-white/35">
            Noch kein Konto?{' '}
            <a href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline underline-offset-2">
              Jetzt registrieren
            </a>
          </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[12px] text-white/15 font-light">
          &copy; 2025 SINTRA. Alle Rechte vorbehalten.
        </p>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.02); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.03); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.01); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
          animation-delay: -3s;
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
          animation-delay: -5s;
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </main>
  );
}
