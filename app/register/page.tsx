/**
 * SINTRA Register Page - Apple Design Premium Edition
 * Ultra-polished registration with advanced password visualization
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { registerSchema } from '@/lib/auth/registerSchema';

type FormData = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type ValidationErrors = {
  displayName?: string;
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
    document.title = 'Registrieren · SINTRA';
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

    const strength = Object.values(criteria).filter(Boolean).length;
    setPasswordStrength(strength);
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
        if (field) {
          fieldErrors[field] = err.message;
        }
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
      setApiError('Bitte akzeptiere die Nutzungsbedingungen');
      return;
    }

    if (!validateForm()) {
      return;
    }

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

      // Success - show animation then redirect
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);
    } catch {
      setApiError('Netzwerkfehler – bitte später erneut versuchen.');
      setLoading(false);
    }
  }

  const getStrengthColor = (level: number) => {
    if (level > passwordStrength) return 'bg-card/10';
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
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0">
          {/* Primary gradient orbs */}
          <div className="absolute top-[15%] right-[20%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-[15%] left-[15%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] animate-float-delayed" />
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-[150px]" />

          {/* Secondary accent orbs */}
          <div className="absolute top-[70%] right-[30%] w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[100px] animate-float-slow" />
          <div className="absolute top-[25%] left-[25%] w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[80px] animate-float-delayed" />
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
      <div className={`fixed inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm z-50 transition-opacity duration-500 pointer-events-none ${success ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className={`transform transition-all duration-500 ${success ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-20 h-20 rounded-full bg-green-500/20 backdrop-blur-xl flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className={`text-white/80 text-lg font-medium transition-all duration-500 delay-200 ${success ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Konto erstellt!
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className={`relative z-10 w-full max-w-[440px] mx-4 transition-all duration-500 ${success ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Glass Card */}
        <div className={`backdrop-blur-2xl bg-card/[0.03] border border-white/[0.08] rounded-[28px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 ${shakeError ? 'animate-shake' : ''}`}>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-[20px] blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative w-[72px] h-[72px] rounded-[20px] bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-semibold text-white tracking-[-0.02em] mb-3">
              Konto erstellen
            </h1>
            <p className="text-white/40 text-[15px] font-light">
              Starte deine Reise mit SINTRA
            </p>
          </div>

          {/* Error Message */}
          {apiError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm animate-slide-down">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-red-300 text-sm font-medium">{apiError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="relative group">
              <label
                className={`absolute left-4 transition-all duration-300 ease-out pointer-events-none z-10 ${
                  focusedField === 'name' || form.displayName
                    ? 'top-2.5 text-[10px] text-purple-400 font-semibold uppercase tracking-[0.08em]'
                    : 'top-1/2 -translate-y-1/2 text-white/30 text-[15px] font-light'
                }`}
              >
                Vollständiger Name
              </label>
              <input
                type="text"
                required
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className={`w-full h-[60px] px-4 pt-6 pb-2 rounded-2xl bg-card/[0.03] border text-white text-[15px] transition-all duration-300 outline-none ${
                  errors.displayName
                    ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                    : focusedField === 'name'
                    ? 'border-purple-500/50 bg-card/[0.05] shadow-[0_0_0_4px_rgba(168,85,247,0.1)]'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-card/[0.04]'
                }`}
              />
              {/* Name validation indicator */}
              {form.displayName.length >= 2 && !errors.displayName && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-scale-in">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {errors.displayName && (
                <p className="mt-2 text-xs text-red-400 pl-1 animate-slide-down">{errors.displayName}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="relative group">
              <label
                className={`absolute left-4 transition-all duration-300 ease-out pointer-events-none z-10 ${
                  focusedField === 'email' || form.email
                    ? 'top-2.5 text-[10px] text-purple-400 font-semibold uppercase tracking-[0.08em]'
                    : 'top-1/2 -translate-y-1/2 text-white/30 text-[15px] font-light'
                }`}
              >
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
                className={`w-full h-[60px] px-4 pt-6 pb-2 rounded-2xl bg-card/[0.03] border text-white text-[15px] transition-all duration-300 outline-none ${
                  errors.email
                    ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                    : focusedField === 'email'
                    ? 'border-purple-500/50 bg-card/[0.05] shadow-[0_0_0_4px_rgba(168,85,247,0.1)]'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-card/[0.04]'
                }`}
              />
              {/* Email validation indicator */}
              {form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && !errors.email && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-scale-in">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {errors.email && (
                <p className="mt-2 text-xs text-red-400 pl-1 animate-slide-down">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="relative group">
              <label
                className={`absolute left-4 transition-all duration-300 ease-out pointer-events-none z-10 ${
                  focusedField === 'password' || form.password
                    ? 'top-2.5 text-[10px] text-purple-400 font-semibold uppercase tracking-[0.08em]'
                    : 'top-1/2 -translate-y-1/2 text-white/30 text-[15px] font-light'
                }`}
              >
                Passwort erstellen
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className={`w-full h-[60px] px-4 pt-6 pb-2 pr-12 rounded-2xl bg-card/[0.03] border text-white text-[15px] transition-all duration-300 outline-none ${
                  errors.password
                    ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                    : focusedField === 'password'
                    ? 'border-purple-500/50 bg-card/[0.05] shadow-[0_0_0_4px_rgba(168,85,247,0.1)]'
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

              {/* Password Strength Indicator */}
              {form.password && (
                <div className="mt-3 space-y-3 animate-slide-down">
                  {/* Strength Bars */}
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${getStrengthColor(level)}`}
                      />
                    ))}
                  </div>

                  {/* Strength Text */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${getStrengthTextColor()}`}>
                      {getStrengthText()}
                    </span>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">
                      {passwordStrength}/4 Kriterien
                    </span>
                  </div>

                  {/* Password Criteria */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'length', label: 'Mind. 8 Zeichen', met: passwordCriteria.length },
                      { key: 'uppercase', label: 'Großbuchstabe', met: passwordCriteria.uppercase },
                      { key: 'number', label: 'Eine Zahl', met: passwordCriteria.number },
                      { key: 'special', label: 'Sonderzeichen', met: passwordCriteria.special },
                    ].map((criteria) => (
                      <div
                        key={criteria.key}
                        className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${
                          criteria.met ? 'text-green-400' : 'text-white/30'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                          criteria.met ? 'bg-green-500/20' : 'bg-card/5'
                        }`}>
                          {criteria.met ? (
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-card/20" />
                          )}
                        </div>
                        {criteria.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-2 text-xs text-red-400 pl-1 animate-slide-down">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="relative group">
              <label
                className={`absolute left-4 transition-all duration-300 ease-out pointer-events-none z-10 ${
                  focusedField === 'confirmPassword' || form.confirmPassword
                    ? 'top-2.5 text-[10px] text-purple-400 font-semibold uppercase tracking-[0.08em]'
                    : 'top-1/2 -translate-y-1/2 text-white/30 text-[15px] font-light'
                }`}
              >
                Passwort bestätigen
              </label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
                className={`w-full h-[60px] px-4 pt-6 pb-2 pr-24 rounded-2xl bg-card/[0.03] border text-white text-[15px] transition-all duration-300 outline-none ${
                  errors.confirmPassword
                    ? 'border-red-500/50 bg-red-500/5 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
                    : form.confirmPassword && form.password === form.confirmPassword
                    ? 'border-green-500/50 bg-green-500/5 shadow-[0_0_0_4px_rgba(34,197,94,0.1)]'
                    : focusedField === 'confirmPassword'
                    ? 'border-purple-500/50 bg-card/[0.05] shadow-[0_0_0_4px_rgba(168,85,247,0.1)]'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-card/[0.04]'
                }`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Match indicator */}
                {form.confirmPassword && form.password && (
                  <div className="animate-scale-in">
                    {form.password === form.confirmPassword ? (
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
                {/* Toggle visibility */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && (
                <p className="mt-2 text-xs text-red-400 pl-1 animate-slide-down">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3.5 cursor-pointer group pt-2">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-[22px] h-[22px] rounded-lg bg-card/[0.04] border border-white/[0.1] peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all duration-300 flex items-center justify-center group-hover:border-white/[0.2] peer-focus:ring-2 peer-focus:ring-purple-500/20">
                  <svg className={`w-3.5 h-3.5 text-white transition-all duration-300 ${acceptedTerms ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-white/40 text-[13px] leading-relaxed group-hover:text-white/60 transition-colors select-none">
                Ich akzeptiere die{' '}
                <a href="/terms" className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-2">
                  Nutzungsbedingungen
                </a>{' '}
                und{' '}
                <a href="/privacy" className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-2">
                  Datenschutzerklärung
                </a>
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="relative w-full h-[56px] rounded-2xl font-semibold text-[15px] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-4 active:scale-[0.98]"
            >
              {/* Button gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]" />

              <span className="relative text-white flex items-center justify-center gap-2.5">
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Konto erstellen...</span>
                  </>
                ) : (
                  <>
                    <span>Konto erstellen</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-[14px] text-white/35">
            Bereits registriert?{' '}
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors hover:underline underline-offset-2">
              Jetzt anmelden
            </a>
          </p>
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
