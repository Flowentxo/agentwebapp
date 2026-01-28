/**
 * Security Tab - Sidebar Design System
 * Fully integrated with real MFA APIs and CSRF protection
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { Shield, Lock, Key, Smartphone, Eye, EyeOff, ChevronDown, ChevronUp, Copy, Download, Check, Clock, AlertCircle } from 'lucide-react';
import { SUDO_TIMEOUT_OPTIONS, type SudoTimeoutValue } from '@/lib/auth/sudo';
import { getCsrfToken } from '@/lib/profile/client-utils';
import { toast } from 'sonner';

interface SecurityTabProps {
  profile: ProfileResponse;
  onRefresh: () => Promise<void>;
  autoStartMfaSetup?: boolean;
  onMfaSetupStarted?: () => void;
}

export default function SecurityTab({ profile, onRefresh, autoStartMfaSetup, onMfaSetupStarted }: SecurityTabProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaStep, setMfaStep] = useState<'qr' | 'verify' | 'codes'>('qr');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Sudo Timeout State
  const [sudoTimeout, setSudoTimeout] = useState<SudoTimeoutValue>(profile.sudoSessionTimeout ?? 15);
  const [sudoTimeoutSaving, setSudoTimeoutSaving] = useState(false);
  const [sudoTimeoutMessage, setSudoTimeoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track if we've already started MFA setup from navigation
  const hasAutoStarted = useRef(false);

  // Auto-start MFA setup when navigated from Overview tab
  useEffect(() => {
    if (autoStartMfaSetup && !profile.mfaEnabled && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      handleMfaSetup();
      if (onMfaSetupStarted) {
        onMfaSetupStarted();
      }
    }
  }, [autoStartMfaSetup, profile.mfaEnabled]);

  const calculateStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (field === 'newPassword') setPasswordStrength(calculateStrength(value));
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwörter stimmen nicht überein' });
      return;
    }
    if (passwordStrength < 50) {
      setPasswordMessage({ type: 'error', text: 'Passwort ist zu schwach' });
      return;
    }

    setPasswordSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error?.message || 'Fehler beim Ändern');
      }

      setPasswordMessage({ type: 'success', text: 'Passwort geändert' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Fehler beim Ändern' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleMfaSetup = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/profile/mfa/setup', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Zu viele Anfragen. Bitte warten Sie einen Moment.');
          setMfaError('Zu viele Anfragen. Bitte versuchen Sie es später erneut.');
          return;
        }
        throw new Error(data.error?.message || 'Setup fehlgeschlagen');
      }

      if (data.ok && data.data) {
        setMfaQrCode(data.data.qrDataUrl || '');
        setMfaSecret(data.data.secret || '');
        setShowMfaSetup(true);
        setMfaStep('qr');
        setMfaCode('');
        toast.info('Scannen Sie den QR-Code mit Ihrer Authenticator-App');
      } else {
        const errorMsg = data.error?.message || 'Setup fehlgeschlagen';
        setMfaError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'MFA-Setup fehlgeschlagen';
      setMfaError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) {
      toast.warning('Bitte geben Sie einen 6-stelligen Code ein');
      return;
    }

    setMfaLoading(true);
    setMfaError(null);

    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/profile/mfa/enable', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ code: mfaCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Zu viele Versuche. Bitte warten Sie 5 Minuten.');
          setMfaError('Zu viele Versuche. Bitte warten Sie 5 Minuten.');
          setMfaCode('');
          return;
        }
        if (res.status === 400) {
          const errorMsg = data.error?.message || 'Ungültiger Code';
          setMfaError(errorMsg);
          toast.error(errorMsg);
          setMfaCode('');
          return;
        }
        throw new Error(data.error?.message || 'Verifizierung fehlgeschlagen');
      }

      if (data.ok && data.data) {
        setMfaRecoveryCodes(data.data.recoveryCodes || []);
        setMfaStep('codes');
        toast.success('2FA erfolgreich aktiviert!');
        await onRefresh();
      } else {
        const errorMsg = data.error?.message || 'Code ungültig';
        setMfaError(errorMsg);
        toast.error(errorMsg);
        setMfaCode('');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Verifizierung fehlgeschlagen';
      setMfaError(errorMsg);
      toast.error(errorMsg);
      setMfaCode('');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    if (!confirm('2FA wirklich deaktivieren? Dadurch wird Ihr Konto weniger sicher.')) return;

    setMfaLoading(true);
    setMfaError(null);

    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/profile/mfa/disable', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Deaktivierung fehlgeschlagen');
      }

      toast.success('2FA wurde deaktiviert');
      await onRefresh();
      setShowMfaSetup(false);
    } catch (err: any) {
      const errorMsg = err.message || '2FA konnte nicht deaktiviert werden';
      setMfaError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setMfaLoading(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code kopiert');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const downloadCodes = () => {
    try {
      const content = `SINTRA Recovery Codes
======================
Erstellt: ${new Date().toLocaleString('de-DE')}

Diese Codes können nur einmal verwendet werden.
Bewahren Sie sie sicher auf!

${mfaRecoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

WICHTIG: Jeder Code kann nur einmal verwendet werden.
`;
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sintra-recovery-codes-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success('Recovery-Codes heruntergeladen');
    } catch {
      toast.error('Download fehlgeschlagen');
    }
  };

  // Handle sudo timeout change
  const handleSudoTimeoutChange = async (value: SudoTimeoutValue) => {
    setSudoTimeoutSaving(true);
    setSudoTimeoutMessage(null);
    try {
      const res = await fetch('/api/auth/sudo/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ timeout: value }),
      });
      const data = await res.json();
      if (data.ok) {
        setSudoTimeout(value);
        setSudoTimeoutMessage({ type: 'success', text: 'Einstellung gespeichert' });
        setTimeout(() => setSudoTimeoutMessage(null), 3000);
      } else {
        setSudoTimeoutMessage({ type: 'error', text: data.error?.message || 'Fehler beim Speichern' });
      }
    } catch {
      setSudoTimeoutMessage({ type: 'error', text: 'Fehler beim Speichern' });
    } finally {
      setSudoTimeoutSaving(false);
    }
  };

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-muted">
              <Shield className={`w-4 h-4 ${profile.mfaEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-lg ${profile.mfaEnabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
              {profile.mfaEnabled ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">2FA</p>
          <p className="text-sm text-foreground font-medium">{profile.mfaEnabled ? 'Aktiviert' : 'Deaktiviert'}</p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-muted">
              <Key className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Passwort</p>
          <p className="text-sm text-foreground font-medium">Geschützt</p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-muted">
              <Lock className={`w-4 h-4 ${profile.emailVerified ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">E-Mail</p>
          <p className="text-sm text-foreground font-medium">{profile.emailVerified ? 'Verifiziert' : 'Nicht verifiziert'}</p>
        </div>
      </div>

      {/* Password Section */}
      <div className="p-6 rounded-xl bg-card border-2 border-border">
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Passwort ändern</p>
              <p className="text-xs text-muted-foreground">Aktualisieren Sie Ihr Passwort</p>
            </div>
          </div>
          {showPasswordForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showPasswordForm && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Aktuelles Passwort</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-input border-2 border-border focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  className="flex-1 bg-transparent text-foreground text-sm outline-none"
                />
                <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-muted-foreground hover:text-foreground">
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Neues Passwort</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-input border-2 border-border focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className="flex-1 bg-transparent text-foreground text-sm outline-none"
                />
                <button onClick={() => setShowNewPassword(!showNewPassword)} className="text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordData.newPassword && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${passwordStrength < 50 ? 'bg-red-500' : passwordStrength < 75 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Passwort bestätigen</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-input border-2 border-border text-foreground text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {passwordMessage && (
              <div className={`p-3 rounded-xl text-sm ${passwordMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
                {passwordMessage.text}
              </div>
            )}

            <button
              onClick={handlePasswordSubmit}
              disabled={passwordSaving}
              className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-40 transition-colors"
            >
              {passwordSaving ? 'Speichern...' : 'Passwort ändern'}
            </button>
          </div>
        )}
      </div>

      {/* 2FA Section */}
      <div className="p-6 rounded-xl bg-card border-2 border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Zwei-Faktor-Authentifizierung</p>
              <p className="text-xs text-muted-foreground">Zusätzliche Sicherheit mit TOTP</p>
            </div>
          </div>
          {profile.mfaEnabled ? (
            <button
              onClick={handleMfaDisable}
              disabled={mfaLoading}
              className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              Deaktivieren
            </button>
          ) : (
            <button
              onClick={handleMfaSetup}
              disabled={mfaLoading}
              className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Aktivieren
            </button>
          )}
        </div>

        {/* Error Message */}
        {mfaError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border-2 border-red-500/30">
            <p className="text-sm text-red-500">{mfaError}</p>
          </div>
        )}

        {showMfaSetup && (
          <div className="mt-6 p-5 rounded-xl bg-muted/50 border-2 border-border">
            {mfaStep === 'qr' && (
              <div className="space-y-5">
                {/* Header */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Authenticator einrichten</h3>
                  <p className="text-sm text-muted-foreground">Scannen Sie den QR-Code mit Google Authenticator, Authy oder einer anderen TOTP-App</p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-card rounded-xl shadow-lg border-2 border-border">
                    {mfaQrCode ? (
                      <img src={mfaQrCode} alt="QR Code für 2FA" className="w-48 h-48" />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-muted">
                        <span className="text-muted-foreground text-sm">Lädt...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Entry Toggle */}
                <div className="text-center">
                  <button
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showManualEntry ? 'QR-Code anzeigen' : 'Code manuell eingeben?'}
                  </button>
                </div>

                {/* Manual Secret */}
                {showManualEntry && mfaSecret && (
                  <div className="p-4 rounded-xl bg-card border-2 border-border">
                    <p className="text-xs text-muted-foreground mb-2">Manueller Schlüssel:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono text-primary break-all">{mfaSecret}</code>
                      <button
                        onClick={() => copyCode(mfaSecret)}
                        className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {copiedCode === mfaSecret ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <button
                  onClick={() => setMfaStep('verify')}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Weiter zur Verifizierung
                </button>
              </div>
            )}

            {mfaStep === 'verify' && (
              <div className="space-y-5">
                {/* Header */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Code verifizieren</h3>
                  <p className="text-sm text-muted-foreground">Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein</p>
                </div>

                {/* Code Input */}
                <div>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => {
                      setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setMfaError(null);
                    }}
                    className="w-full px-4 py-4 rounded-xl bg-input border-2 border-border text-foreground text-center text-3xl font-mono tracking-[0.5em] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                {/* Error */}
                {mfaError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-center">
                    <p className="text-sm text-red-500">{mfaError}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMfaStep('qr');
                      setMfaError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium border-2 border-border hover:bg-muted/80 transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={handleMfaVerify}
                    disabled={mfaCode.length !== 6 || mfaLoading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {mfaLoading ? 'Verifiziere...' : 'Aktivieren'}
                  </button>
                </div>
              </div>
            )}

            {mfaStep === 'codes' && (
              <div className="space-y-5">
                {/* Success Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">2FA aktiviert!</h3>
                  <p className="text-sm text-muted-foreground">Speichern Sie Ihre Wiederherstellungs-Codes sicher</p>
                </div>

                {/* Warning */}
                <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-500">Wichtig!</p>
                      <p className="text-xs text-amber-500/80 mt-1">Diese Codes können nur einmal verwendet werden. Bewahren Sie sie an einem sicheren Ort auf.</p>
                    </div>
                  </div>
                </div>

                {/* Recovery Codes Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {mfaRecoveryCodes.map((code, i) => (
                    <button
                      key={i}
                      onClick={() => copyCode(code)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-card border-2 border-border text-sm font-mono text-foreground hover:border-primary/30 hover:bg-muted transition-colors"
                    >
                      <span>{code}</span>
                      {copiedCode === code ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={downloadCodes}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium border-2 border-border hover:bg-muted/80 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Herunterladen
                  </button>
                  <button
                    onClick={() => {
                      setShowMfaSetup(false);
                      setMfaStep('qr');
                      setMfaCode('');
                      setMfaError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Fertig
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sudo Mode / Re-Authentication Timeout Section */}
      <div className="p-6 rounded-xl bg-card border-2 border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-muted">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sicherheits-Timeout</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wie lange sensible Aktionen ohne erneute Passwort-Eingabe durchgeführt werden können
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUDO_TIMEOUT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSudoTimeoutChange(option.value)}
                disabled={sudoTimeoutSaving}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  sudoTimeout === option.value
                    ? 'bg-primary/10 text-primary border-2 border-primary/30'
                    : 'bg-card text-muted-foreground border-2 border-border hover:border-primary/30 hover:text-foreground'
                } ${sudoTimeoutSaving ? 'opacity-50 cursor-wait' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border-2 border-border">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              {sudoTimeout === 0
                ? 'Bei jeder sensiblen Aktion (z.B. Passkey löschen) wird Ihr Passwort erneut abgefragt.'
                : `Nach der Anmeldung können Sie ${sudoTimeout} Minuten lang sensible Aktionen ohne erneute Passwort-Eingabe durchführen.`}
            </p>
          </div>

          {/* Success/Error Message */}
          {sudoTimeoutMessage && (
            <div className={`p-3 rounded-xl text-sm ${
              sudoTimeoutMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/30'
                : 'bg-red-500/10 text-red-500 border-2 border-red-500/30'
            }`}>
              {sudoTimeoutMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Security Hint */}
      {!profile.mfaEnabled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm text-foreground font-medium">Sicherheitsempfehlung</p>
              <p className="text-xs text-muted-foreground">Aktivieren Sie 2FA für zusätzliche Sicherheit</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
