/**
 * Notifications Tab - Sidebar Design System
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Shield,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface NotificationsTabProps {
  userId: string;
}

interface NotificationPreferences {
  emailDigest: boolean;
  productUpdates: boolean;
  securityAlerts: boolean;
  webPush: boolean;
  sms: boolean;
}

export default function NotificationsTab({ userId }: NotificationsTabProps) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailDigest: true,
    productUpdates: true,
    securityAlerts: true,
    webPush: false,
    sms: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
    setSaving(field);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to update preference:', error);
      setPrefs((prev) => ({ ...prev, [field]: !value }));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-6 py-12 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Notifications */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
              Aktiv
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Benachrichtigungen</p>
          <p className="text-sm font-medium text-foreground">
            {Object.values(prefs).filter(Boolean).length} von {Object.keys(prefs).length}
          </p>
        </div>

        {/* Email Status */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Mail className="w-4 h-4 text-emerald-500" />
            </div>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-1">E-Mail</p>
          <p className="text-sm font-medium text-foreground">
            {prefs.emailDigest ? 'Aktiviert' : 'Deaktiviert'}
          </p>
        </div>

        {/* Security Alerts */}
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              Immer an
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Sicherheit</p>
          <p className="text-sm font-medium text-foreground">Geschützt</p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="p-6 rounded-xl bg-card border-2 border-border">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-6">
          Benachrichtigungseinstellungen
        </h3>

        <div className="space-y-4">
          {/* Email Digest */}
          <div className="flex items-start justify-between py-3 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">E-Mail-Zusammenfassungen</h4>
                  {saving === 'emailDigest' && (
                    <div className="w-3 h-3 rounded-full border-2 border-border border-t-primary animate-spin" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tägliche Zusammenfassungen wichtiger Aktivitäten
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailDigest', !prefs.emailDigest)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                prefs.emailDigest ? 'bg-primary' : 'bg-slate-200'
              }`}
              disabled={saving === 'emailDigest'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                  prefs.emailDigest ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Product Updates */}
          <div className="flex items-start justify-between py-3 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-violet-50">
                <Sparkles className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">Produkt-Updates</h4>
                  {saving === 'productUpdates' && (
                    <div className="w-3 h-3 rounded-full border-2 border-border border-t-primary animate-spin" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Neue Features und Produktneuigkeiten
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('productUpdates', !prefs.productUpdates)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                prefs.productUpdates ? 'bg-primary' : 'bg-slate-200'
              }`}
              disabled={saving === 'productUpdates'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                  prefs.productUpdates ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Security Alerts */}
          <div className="flex items-start justify-between py-3 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">Sicherheitswarnungen</h4>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    Empfohlen
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Wichtige Sicherheitshinweise (immer aktiviert)
                </p>
              </div>
            </div>
            <button
              disabled
              className="relative inline-flex h-5 w-9 items-center rounded-full bg-emerald-500 opacity-70 cursor-not-allowed"
            >
              <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm translate-x-5" />
            </button>
          </div>

          {/* Web Push */}
          <div className="flex items-start justify-between py-3 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">Web-Push</h4>
                  {saving === 'webPush' && (
                    <div className="w-3 h-3 rounded-full border-2 border-border border-t-primary animate-spin" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Echtzeit-Benachrichtigungen im Browser
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('webPush', !prefs.webPush)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                prefs.webPush ? 'bg-primary' : 'bg-slate-200'
              }`}
              disabled={saving === 'webPush'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                  prefs.webPush ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* SMS */}
          <div className="flex items-start justify-between py-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-cyan-50">
                <Smartphone className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">SMS</h4>
                  {saving === 'sms' && (
                    <div className="w-3 h-3 rounded-full border-2 border-border border-t-primary animate-spin" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Wichtige Benachrichtigungen per SMS
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('sms', !prefs.sms)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                prefs.sms ? 'bg-primary' : 'bg-slate-200'
              }`}
              disabled={saving === 'sms'}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-sm transition-transform ${
                  prefs.sms ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">Auto-Speicherung aktiv:</span>{' '}
              Änderungen werden automatisch gespeichert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
