/**
 * SINTRA Login Page - Power-Tool Split Layout
 * Left: Branding Hero | Right: Login Form
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
  const [next, setNext] = useState<string>('/v4');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);

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
    error: passkeyError,
  } = useWebAuthn();

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
        window.location.assign(next || '/v4');
      }, 800);
    } else {
      setErrCode('AUTH_PASSKEY_FAILED');
    }
  }

  useEffect(() => {
    if (mfaStep && mfaInputRef.current) {
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

      console.log('[MFA_RAW_RESPONSE]', JSON.stringify(json, null, 2));

      if (json?.ok) {
        const accessToken = json.accessToken || json.data?.accessToken;
        console.log('>>> FRONTEND RECEIVING TOKEN (MFA):', {
          fromRoot: !!json.accessToken,
          fromData: !!json.data?.accessToken,
          tokenLength: accessToken?.length ?? 0,
          tokenPrefix: accessToken?.substring(0, 15) ?? 'NULL',
        });

        if (accessToken && accessToken.length > 10) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('token', accessToken);

          const verifyRead = localStorage.getItem('accessToken');
          if (verifyRead !== accessToken) {
            console.error('>>> MFA CRITICAL: Token storage FAILED!');
            setErrCode('AUTH_INTERNAL');
            setLoading(false);
            return;
          }

          storeToken(accessToken);
          notifyAuthLogin(accessToken);
          window.dispatchEvent(new Event('storage'));

          setSuccess(true);

          const finalCheck = localStorage.getItem('accessToken');
          if (!finalCheck || finalCheck.length < 10) {
            console.error('>>> MFA REDIRECT BLOCKED: Token not in localStorage!');
            setErrCode('AUTH_INTERNAL');
            setSuccess(false);
            setLoading(false);
            return;
          }

          setTimeout(() => {
            window.location.assign(json.data?.next || '/v4');
          }, 800);
        } else {
          console.error('>>> MFA CRITICAL: No accessToken in response!');
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

      console.log('[LOGIN_RAW_RESPONSE]', JSON.stringify(json, null, 2));

      if (json?.ok) {
        if (json.data?.mfaRequired && json.data?.pendingToken) {
          setMfaSessionToken(json.data.pendingToken);
          setMfaEmail(email);
          setMfaStep(true);
          setErrCode(null);
          setLoading(false);
          return;
        }

        const accessToken = json.accessToken || json.data?.accessToken;
        console.log('>>> FRONTEND RECEIVING TOKEN:', {
          fromRoot: !!json.accessToken,
          fromData: !!json.data?.accessToken,
          tokenLength: accessToken?.length ?? 0,
          tokenPrefix: accessToken?.substring(0, 15) ?? 'NULL',
        });

        if (accessToken && accessToken.length > 10) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('token', accessToken);

          const verifyRead = localStorage.getItem('accessToken');
          if (verifyRead !== accessToken) {
            console.error('>>> CRITICAL: Token storage FAILED!');
            setErrCode('AUTH_INTERNAL');
            setLoading(false);
            return;
          }

          storeToken(accessToken);
          notifyAuthLogin(accessToken);
          window.dispatchEvent(new Event('storage'));

          setSuccess(true);

          const finalCheck = localStorage.getItem('accessToken');
          if (!finalCheck || finalCheck.length < 10) {
            console.error('>>> REDIRECT BLOCKED: Token not in localStorage!');
            setErrCode('AUTH_INTERNAL');
            setSuccess(false);
            setLoading(false);
            return;
          }

          setTimeout(() => {
            window.location.assign(json.data?.next || '/v4');
          }, 800);
        } else {
          console.error('>>> CRITICAL: No accessToken in response!');
          setErrCode('AUTH_INTERNAL');
          setLoading(false);
        }
      } else {
        const code = (json?.error?.code || 'AUTH_INTERNAL') as AuthErrorCode;

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
    <main className="min-h-screen flex flex-col lg:flex-row bg-[#0A0A0A]">
      {/* Success overlay */}
      <div className={`fixed inset-0 bg-violet-600/10 backdrop-blur-sm z-50 transition-opacity duration-500 pointer-events-none ${success ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`transform transition-all duration-500 ${success ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-16 h-16 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LEFT: Branding Hero                                              */}
      {/* ================================================================ */}
      <div className="relative lg:w-[50%] flex items-center justify-center py-10 lg:py-0 overflow-hidden">
        {/* Violet ambient gradient - dual source for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%)',
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] hidden lg:block"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Node-Graph Decoration - abstract AI network visualization */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ opacity: 0.1 }}>
          {/* Dots */}
          <div className="absolute w-2 h-2 rounded-full bg-violet-400 node-pulse" style={{ top: '18%', left: '12%' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 node-pulse node-pulse-delay-1" style={{ top: '28%', left: '30%' }} />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-violet-400 node-pulse node-pulse-delay-2" style={{ top: '15%', left: '55%' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 node-pulse" style={{ top: '72%', left: '65%' }} />
          <div className="absolute w-2 h-2 rounded-full bg-violet-400 node-pulse node-pulse-delay-1" style={{ top: '82%', left: '42%' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 node-pulse node-pulse-delay-2" style={{ top: '65%', left: '82%' }} />
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.5 }}>
            <line x1="12%" y1="18%" x2="30%" y2="28%" stroke="rgba(139,92,246,0.4)" strokeWidth="0.5" />
            <line x1="30%" y1="28%" x2="55%" y2="15%" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5" />
            <line x1="65%" y1="72%" x2="82%" y2="65%" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5" />
            <line x1="42%" y1="82%" x2="65%" y2="72%" stroke="rgba(139,92,246,0.4)" strokeWidth="0.5" />
            <line x1="55%" y1="15%" x2="65%" y2="72%" stroke="rgba(139,92,246,0.15)" strokeWidth="0.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-8 lg:px-16 max-w-[520px] w-full">
          {/* Logo + Name */}
          <div className="hero-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-2xl lg:text-3xl font-bold tracking-[0.12em] text-white/90">
                SINTRA
              </span>
            </div>
            <p className="text-base lg:text-lg text-white/35 font-light">
              AI-Powered Business Automation
            </p>
          </div>

          {/* Feature Highlights - Desktop only */}
          <div className="hidden lg:block mt-10 space-y-5">
            {/* Feature 1 */}
            <div className="hero-fade-in hero-delay-1 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white/60 font-medium">15 spezialisierte AI-Agenten</p>
                <p className="text-xs text-white/25 mt-0.5">Jeder Experte in seinem Fachgebiet</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="hero-fade-in hero-delay-2 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white/60 font-medium">Intelligente Workflow-Pipelines</p>
                <p className="text-xs text-white/25 mt-0.5">Automatisiere komplexe Geschäftsprozesse</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="hero-fade-in hero-delay-3 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white/60 font-medium">Enterprise-Grade Sicherheit</p>
                <p className="text-xs text-white/25 mt-0.5">MFA, Passkeys & Audit-Logging</p>
              </div>
            </div>
          </div>

          {/* Social Proof Metrics - Desktop only */}
          <div className="hidden lg:block mt-16 hero-fade-in hero-delay-3">
            <div className="border-t border-[rgba(255,255,255,0.06)] pt-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-lg font-bold text-white/70">15+</p>
                  <p className="text-[11px] text-white/25 uppercase tracking-wider mt-0.5">Agents</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white/70">10K+</p>
                  <p className="text-[11px] text-white/25 uppercase tracking-wider mt-0.5">Automations</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white/70">99.9%</p>
                  <p className="text-[11px] text-white/25 uppercase tracking-wider mt-0.5">Uptime</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RIGHT: Login Form                                                */}
      {/* ================================================================ */}
      <div
        className="relative lg:w-[50%] min-h-[60vh] lg:min-h-screen flex flex-col items-center justify-center bg-[#111111] border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.06)]"
        style={{
          boxShadow: '-20px 0 60px rgba(139,92,246,0.05)',
        }}
      >
        <div className={`w-full max-w-[400px] px-6 lg:px-0 py-10 lg:py-0 transition-all duration-500 ${success ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          <div className={`transition-transform duration-300 ${shakeError ? 'animate-shake' : ''}`}>

            {/* Header */}
            <div className="mb-10">
              <h1 className="text-2xl font-semibold text-white tracking-[-0.02em] mb-1.5">
                {mfaStep ? 'Zwei-Faktor-Authentifizierung' : 'Willkommen zurück'}
              </h1>
              <p className="text-[#71717A] text-sm">
                {mfaStep
                  ? `Code eingeben für ${mfaEmail}`
                  : 'Melde dich an, um fortzufahren'}
              </p>
            </div>

            {/* Error Message */}
            {errCode && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-down">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-300 text-sm">{messages[errCode]}</p>
                    {countdown !== null && countdown > 0 && (
                      <p className="text-red-400/60 text-xs mt-1">
                        Erneut versuchen in {countdown}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MFA Form */}
            {mfaStep ? (
              <form onSubmit={onMfaSubmit} className="space-y-5">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="mfa-code-input" className="block text-center text-xs font-medium text-[#71717A]">
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
                    className={`w-full h-16 px-4 rounded-xl bg-[rgba(255,255,255,0.03)] border text-white text-[28px] text-center tracking-[0.3em] font-mono transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                      focusedField === 'mfaCode'
                        ? 'border-violet-500/50 shadow-[0_0_0_4px_rgba(139,92,246,0.1)]'
                        : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                    }`}
                  />
                </div>

                <p className="text-[#71717A] text-xs text-center">
                  Gib den Code aus deiner Authenticator-App ein
                </p>

                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full h-12 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Verifiziere...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifizieren</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMfaStep(false);
                    setMfaCode('');
                    setMfaSessionToken('');
                    setErrCode(null);
                  }}
                  className="w-full text-center text-[#71717A] text-sm hover:text-white/60 transition-colors"
                >
                  Zurück zur Anmeldung
                </button>
              </form>
            ) : (
              <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-[#71717A] mb-1.5">
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
                    placeholder="name@example.com"
                    className={`w-full h-12 px-4 rounded-xl bg-[rgba(255,255,255,0.03)] border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                      focusedField === 'email'
                        ? 'border-violet-500/50 shadow-[0_0_0_4px_rgba(139,92,246,0.1)]'
                        : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                    }`}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-[#71717A] mb-1.5">
                    Passwort
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      autoComplete="current-password"
                      placeholder="Passwort eingeben"
                      className={`w-full h-12 px-4 pr-10 rounded-xl bg-[rgba(255,255,255,0.03)] border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                        focusedField === 'password'
                          ? 'border-violet-500/50 shadow-[0_0_0_4px_rgba(139,92,246,0.1)]'
                          : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3F3F46] hover:text-[#71717A] transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-[18px] h-[18px] rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] peer-checked:bg-[#8b5cf6] peer-checked:border-[#8b5cf6] transition-all duration-200 flex items-center justify-center group-hover:border-[rgba(255,255,255,0.2)]">
                        <svg className={`w-3 h-3 text-white transition-all duration-200 ${remember ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-[#71717A] text-xs group-hover:text-white/60 transition-colors select-none">
                      Angemeldet bleiben
                    </span>
                  </label>
                  <a
                    href="/request-password-reset"
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                  >
                    Passwort vergessen?
                  </a>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || (countdown !== null && countdown > 0)}
                  className="w-full h-12 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 mt-2 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider & Social */}
            {!mfaStep && (
              <>
                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[rgba(255,255,255,0.06)]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-[#111111] text-[#3F3F46] text-xs font-medium uppercase tracking-wider">
                      oder fortfahren mit
                    </span>
                  </div>
                </div>

                {mounted && passkeySupported && (
                  <button
                    type="button"
                    onClick={onPasskeyLogin}
                    disabled={passkeyLoading}
                    className="w-full h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-white/90 text-sm font-medium hover:bg-violet-500/15 hover:border-violet-500/30 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-40 mb-3"
                  >
                    {passkeyLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Warte auf Passkey...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                        </svg>
                        <span>Mit Passkey anmelden</span>
                      </>
                    )}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/api/auth/oauth/google?next=${encodeURIComponent(next)}`;
                    }}
                    className="h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white/70 text-sm font-medium hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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
                    className="h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white/70 text-sm font-medium hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>

                <p className="mt-8 text-center text-sm text-[#71717A]">
                  Noch kein Konto?{' '}
                  <a href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                    Jetzt registrieren
                  </a>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-[#3F3F46]">
          &copy; 2026 SINTRA. Alle Rechte vorbehalten.
        </p>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .hero-fade-in {
          animation: hero-fade-in 0.6s ease-out both;
        }
        .hero-delay-1 {
          animation-delay: 0.1s;
        }
        .hero-delay-2 {
          animation-delay: 0.2s;
        }
        .hero-delay-3 {
          animation-delay: 0.3s;
        }
        @keyframes node-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .node-pulse {
          animation: node-pulse 3s ease-in-out infinite;
        }
        .node-pulse-delay-1 {
          animation-delay: 1s;
        }
        .node-pulse-delay-2 {
          animation-delay: 2s;
        }
      `}</style>
    </main>
  );
}
