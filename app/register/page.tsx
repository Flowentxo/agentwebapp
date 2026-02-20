/**
 * Flowent AI Register Page - Split Layout (unified with Login)
 * Left: Branding Hero | Right: Register Form
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { registerSchema } from '@/lib/auth/registerSchema';

type FormData = {
  displayName: string;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type ValidationErrors = {
  displayName?: string;
  companyName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

type PasswordCriteria = {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>({
    displayName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = 'Registrieren · Flowent AI';
  }, []);

  // Calculate password strength and criteria
  useEffect(() => {
    const pwd = form.password;
    const criteria: PasswordCriteria = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    setPasswordCriteria(criteria);
    setPasswordStrength(Object.values(criteria).filter(Boolean).length);
  }, [form.password]);

  // Shake animation on error
  useEffect(() => {
    if (apiError || Object.keys(errors).length > 0) {
      setShakeError(true);
      const timer = setTimeout(() => setShakeError(false), 600);
      return () => clearTimeout(timer);
    }
  }, [apiError, errors]);

  function validateForm(): boolean {
    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: ValidationErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ValidationErrors;
        if (field) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!acceptedTerms) {
      setApiError('Bitte bestätigen Sie Ihren gewerblichen Status.');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({
        ok: false,
        error: { code: 'AUTH_INTERNAL', message: 'Netzwerkfehler' },
      }));

      if (!json.ok) {
        setApiError(json.error?.message || 'Registrierung fehlgeschlagen');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch {
      setApiError('Netzwerkfehler – bitte später erneut versuchen.');
      setLoading(false);
    }
  }

  const getStrengthColor = (level: number) => {
    if (level > passwordStrength) return 'bg-[rgba(255,255,255,0.05)]';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-orange-500';
    if (passwordStrength === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (form.password.length === 0) return '';
    if (passwordStrength <= 1) return 'Schwach';
    if (passwordStrength === 2) return 'Mittel';
    if (passwordStrength === 3) return 'Gut';
    return 'Ausgezeichnet';
  };

  const getStrengthTextColor = () => {
    if (passwordStrength <= 1) return 'text-red-400';
    if (passwordStrength === 2) return 'text-orange-400';
    if (passwordStrength === 3) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-[#030712]">
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
        {/* Violet ambient gradient */}
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

        {/* Node-Graph Decoration */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ opacity: 0.1 }}>
          <div className="absolute w-2 h-2 rounded-full bg-violet-400 node-pulse" style={{ top: '18%', left: '12%' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 node-pulse node-pulse-delay-1" style={{ top: '28%', left: '30%' }} />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-violet-400 node-pulse node-pulse-delay-2" style={{ top: '15%', left: '55%' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 node-pulse" style={{ top: '72%', left: '65%' }} />
          <div className="absolute w-2 h-2 rounded-full bg-violet-400 node-pulse node-pulse-delay-1" style={{ top: '82%', left: '42%' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 node-pulse node-pulse-delay-2" style={{ top: '65%', left: '82%' }} />
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
                Flowent AI
              </span>
            </div>
            <p className="text-base lg:text-lg text-white/35 font-light">
              KI-Agenten für das moderne Unternehmen
            </p>
          </div>

          {/* Feature Highlights - Desktop only */}
          <div className="hidden lg:block mt-10 space-y-5">
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
            <div className="border-t border-white/10 pt-6">
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
      {/* RIGHT: Register Form                                             */}
      {/* ================================================================ */}
      <div
        className="relative lg:w-[50%] min-h-[60vh] lg:min-h-screen flex flex-col items-center justify-center py-4 border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.08)] noise-overlay"
        style={{
          backgroundColor: '#09090b',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        <div className={`w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl px-7 py-5 transition-all duration-500 glass-border ${success ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          <div className={`transition-transform duration-300 ${shakeError ? 'animate-shake' : ''}`}>

            {/* Header */}
            <div className="mb-4">
              <h1 className="text-xl font-semibold text-white tracking-[-0.02em] mb-1">
                Konto erstellen
              </h1>
              <p className="text-[#71717A] text-xs">
                Registriere dich, um loszulegen
              </p>
            </div>

            {/* Error Message */}
            {apiError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-down">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-red-300 text-sm">{apiError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium text-[#71717A] mb-0.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  autoComplete="name"
                  placeholder="Max Mustermann"
                  className={`w-full h-10 px-4 rounded-xl bg-black/20 border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                    errors.displayName
                      ? 'border-red-500/50 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                      : focusedField === 'name'
                      ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                      : 'border-white/10 hover:border-white/15'
                  }`}
                />
                {errors.displayName && (
                  <p className="mt-1.5 text-xs text-red-400 animate-slide-down">{errors.displayName}</p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[11px] font-medium text-[#71717A] mb-0.5">
                  Firmenname / Organisation
                </label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  onFocus={() => setFocusedField('companyName')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  autoComplete="organization"
                  placeholder="z.B. Acme Corp"
                  className={`w-full h-10 px-4 rounded-xl bg-black/20 border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                    errors.companyName
                      ? 'border-red-500/50 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                      : focusedField === 'companyName'
                      ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                      : 'border-white/10 hover:border-white/15'
                  }`}
                />
                {errors.companyName && (
                  <p className="mt-1.5 text-xs text-red-400 animate-slide-down">{errors.companyName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-medium text-[#71717A] mb-0.5">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  autoComplete="email"
                  placeholder="name@example.com"
                  className={`w-full h-10 px-4 rounded-xl bg-black/20 border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                    errors.email
                      ? 'border-red-500/50 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                      : focusedField === 'email'
                      ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                      : 'border-white/10 hover:border-white/15'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400 animate-slide-down">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-medium text-[#71717A] mb-0.5">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    disabled={loading}
                    autoComplete="new-password"
                    placeholder="Passwort erstellen"
                    className={`w-full h-10 px-4 pr-10 rounded-xl bg-black/20 border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                      errors.password
                        ? 'border-red-500/50 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                        : focusedField === 'password'
                        ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                        : 'border-white/10 hover:border-white/15'
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

                {/* Password Strength Indicator */}
                {form.password && (
                  <div className="mt-2 space-y-1.5 animate-slide-down">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${getStrengthColor(level)}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${getStrengthTextColor()}`}>
                        {getStrengthText()}
                      </span>
                      <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">
                        {passwordStrength}/4 Kriterien
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { key: 'length', label: 'Mind. 8 Zeichen', met: passwordCriteria.length },
                        { key: 'uppercase', label: 'Großbuchstabe', met: passwordCriteria.uppercase },
                        { key: 'number', label: 'Eine Zahl', met: passwordCriteria.number },
                        { key: 'special', label: 'Sonderzeichen', met: passwordCriteria.special },
                      ].map((c) => (
                        <div
                          key={c.key}
                          className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${
                            c.met ? 'text-green-400' : 'text-[#3F3F46]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                            c.met ? 'bg-green-500/20' : 'bg-black/20'
                          }`}>
                            {c.met ? (
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.1)]" />
                            )}
                          </div>
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400 animate-slide-down">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-medium text-[#71717A] mb-0.5">
                  Passwort bestätigen
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    disabled={loading}
                    autoComplete="new-password"
                    placeholder="Passwort wiederholen"
                    className={`w-full h-10 px-4 pr-20 rounded-xl bg-black/20 border text-white text-sm transition-all duration-200 outline-none placeholder:text-[#3F3F46] ${
                      errors.confirmPassword
                        ? 'border-red-500/50 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                        : form.confirmPassword && form.password === form.confirmPassword
                        ? 'border-green-500/50 shadow-[0_0_0_4px_rgba(34,197,94,0.1)]'
                        : focusedField === 'confirmPassword'
                        ? 'border-purple-500/50 ring-1 ring-purple-500/20'
                        : 'border-white/10 hover:border-white/15'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Match indicator */}
                    {form.confirmPassword && form.password && (
                      <div className="animate-scale-in">
                        {form.password === form.confirmPassword ? (
                          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    )}
                    {/* Toggle visibility */}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[#3F3F46] hover:text-[#71717A] transition-colors"
                    >
                      {showConfirmPassword ? (
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
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400 animate-slide-down">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-[18px] h-[18px] rounded-md bg-black/20 border border-[rgba(255,255,255,0.1)] peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all duration-200 flex items-center justify-center group-hover:border-[rgba(255,255,255,0.2)]">
                      <svg className={`w-3 h-3 text-white transition-all duration-200 ${acceptedTerms ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-[#71717A] text-[11px] group-hover:text-white/60 transition-colors select-none leading-snug">
                    Ich best&auml;tige die Nutzung f&uuml;r meine berufliche oder selbstst&auml;ndige T&auml;tigkeit gem. &sect;&nbsp;14 BGB und akzeptiere die{' '}
                    <a href="/agb" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">AGB</a>,
                    den{' '}
                    <a href="/avv" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">AVV</a>{' '}
                    sowie die{' '}
                    <a href="/datenschutz" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Datenschutzerkl&auml;rung</a>.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-1 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Konto erstellen...</span>
                  </>
                ) : (
                  <>
                    <span>Konto erstellen</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider & Social */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-zinc-900/60 text-[#525252] text-xs font-medium uppercase tracking-wider">
                  oder registrieren mit
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/api/auth/oauth/google';
                }}
                className="h-9 rounded-xl bg-black/20 border border-white/[0.06] text-white/70 text-sm font-medium hover:bg-black/30 hover:border-white/15 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98]"
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
                  window.location.href = '/api/auth/oauth/github';
                }}
                className="h-9 rounded-xl bg-black/20 border border-white/[0.06] text-white/70 text-sm font-medium hover:bg-black/30 hover:border-white/15 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Login Link */}
            <p className="mt-4 text-center text-xs text-[#71717A]">
              Bereits registriert?{' '}
              <a href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                Jetzt anmelden
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-3 pb-3 text-center text-[10px] text-zinc-600">
          &copy; 2026 Flowent AI. Alle Rechte vorbehalten.
        </p>
      </div>

      {/* CSS Animations — identical to login */}
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
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
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
