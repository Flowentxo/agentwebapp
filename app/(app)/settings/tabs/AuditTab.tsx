/**
 * Audit Tab - Enterprise White Design
 * Fetches audit log from /api/profile/audit
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Shield,
  User,
  Settings,
  Key,
  Clock,
  Globe,
  Monitor,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  Camera,
  Mail,
  Lock,
  Smartphone,
  Bell,
  Eye,
  Trash2,
  LogOut,
} from 'lucide-react';
import { getCsrfToken } from '@/lib/profile/client-utils';

interface AuditTabProps {
  userId: string;
}

// API Response type matching backend
interface AuditEntryApi {
  id: string;
  action: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// Display-friendly entry type
interface AuditEntry {
  id: string;
  action: string;
  category: 'profile' | 'security' | 'settings' | 'auth';
  timestamp: Date;
  ip: string;
  userAgent: string;
  details: Record<string, unknown>;
}

// Map API action names to display names and categories
const ACTION_MAP: Record<string, { displayName: string; category: 'profile' | 'security' | 'settings' | 'auth' }> = {
  profile_update: { displayName: 'Profil aktualisiert', category: 'profile' },
  avatar_updated: { displayName: 'Avatar geändert', category: 'profile' },
  email_change_requested: { displayName: 'E-Mail-Änderung angefordert', category: 'profile' },
  email_changed: { displayName: 'E-Mail geändert', category: 'profile' },
  password_changed: { displayName: 'Passwort geändert', category: 'security' },
  mfa_enabled: { displayName: '2FA aktiviert', category: 'security' },
  mfa_disabled: { displayName: '2FA deaktiviert', category: 'security' },
  mfa_setup: { displayName: '2FA eingerichtet', category: 'security' },
  mfa_recovery_used: { displayName: 'Recovery-Code verwendet', category: 'security' },
  session_revoked: { displayName: 'Sitzung beendet', category: 'auth' },
  privacy_updated: { displayName: 'Datenschutz aktualisiert', category: 'settings' },
  notifications_updated: { displayName: 'Benachrichtigungen geändert', category: 'settings' },
  account_deactivated: { displayName: 'Konto deaktiviert', category: 'security' },
  account_reactivated: { displayName: 'Konto reaktiviert', category: 'security' },
  data_export_requested: { displayName: 'Datenexport angefordert', category: 'settings' },
  account_deletion_requested: { displayName: 'Kontolöschung angefordert', category: 'security' },
  login: { displayName: 'Angemeldet', category: 'auth' },
  logout: { displayName: 'Abgemeldet', category: 'auth' },
  login_failed: { displayName: 'Fehlgeschlagene Anmeldung', category: 'auth' },
};

const ACTION_ICONS = {
  profile: User,
  security: Shield,
  settings: Settings,
  auth: Key,
};

// More specific icons for certain actions
const SPECIFIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  avatar_updated: Camera,
  email_change_requested: Mail,
  email_changed: Mail,
  password_changed: Lock,
  mfa_enabled: Smartphone,
  mfa_disabled: Smartphone,
  mfa_setup: Smartphone,
  notifications_updated: Bell,
  privacy_updated: Eye,
  account_deletion_requested: Trash2,
  session_revoked: LogOut,
};

export default function AuditTab({ userId }: AuditTabProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [limit] = useState(50);

  const transformApiEntry = (apiEntry: AuditEntryApi): AuditEntry => {
    const actionInfo = ACTION_MAP[apiEntry.action] || {
      displayName: apiEntry.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      category: 'settings' as const
    };

    return {
      id: apiEntry.id,
      action: actionInfo.displayName,
      category: actionInfo.category,
      timestamp: new Date(apiEntry.createdAt),
      ip: apiEntry.ip || 'Unbekannt',
      userAgent: apiEntry.userAgent || 'Unbekannt',
      details: apiEntry.details || {},
    };
  };

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch(`/api/profile/audit?limit=${limit}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Fehler beim Laden des Audit-Logs');
      }

      const transformedEntries = (data.data || []).map(transformApiEntry);
      setEntries(transformedEntries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden des Audit-Logs';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const parseUserAgent = (ua: string) => {
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    return 'Unknown';
  };

  const filteredEntries = filter === 'all' ? entries : entries.filter((e) => e.category === filter);

  const categoryCount = {
    profile: entries.filter((e) => e.category === 'profile').length,
    security: entries.filter((e) => e.category === 'security').length,
    settings: entries.filter((e) => e.category === 'settings').length,
    auth: entries.filter((e) => e.category === 'auth').length,
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredEntries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Audit-Log exportiert');
  };

  // Loading state
  if (loading && entries.length === 0) {
    return (
      <div className="w-full px-6 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Lade Audit-Log...</span>
      </div>
    );
  }

  // Error state (when no entries loaded)
  if (error && entries.length === 0) {
    return (
      <div className="w-full px-6 py-6">
        <div className="p-6 rounded-xl bg-red-500/10 border-2 border-red-500/30">
          <div className="flex items-center gap-3 text-red-500 mb-3">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Fehler beim Laden</span>
          </div>
          <p className="text-sm text-red-500/80 mb-4">{error}</p>
          <button
            onClick={loadAuditLog}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Error banner (when entries exist but refresh failed) */}
      {error && entries.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border-2 border-red-500/30 px-4 py-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {categoryCount.profile}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Profil</p>
          <p className="text-sm font-medium text-foreground">{categoryCount.profile} Ereignisse</p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
              {categoryCount.security}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Sicherheit</p>
          <p className="text-sm font-medium text-foreground">{categoryCount.security} Ereignisse</p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-violet-500/10">
              <Settings className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500">
              {categoryCount.settings}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Einstellungen</p>
          <p className="text-sm font-medium text-foreground">{categoryCount.settings} Ereignisse</p>
        </div>

        <div className="p-4 rounded-xl bg-card border-2 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Key className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
              {categoryCount.auth}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Auth</p>
          <p className="text-sm font-medium text-foreground">{categoryCount.auth} Ereignisse</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="p-6 rounded-2xl bg-card border-2 border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-input border-2 border-border text-foreground text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="all">Alle Kategorien</option>
              <option value="profile">Profil</option>
              <option value="security">Sicherheit</option>
              <option value="settings">Einstellungen</option>
              <option value="auth">Authentifizierung</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAuditLog}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-muted text-foreground border-2 border-border text-sm hover:bg-muted/80 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
            <button
              onClick={handleExport}
              disabled={filteredEntries.length === 0}
              className="px-3 py-1.5 rounded-xl bg-muted text-foreground border-2 border-border text-sm hover:bg-muted/80 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportieren
            </button>
          </div>
        </div>

        {/* Audit Log */}
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const Icon = ACTION_ICONS[entry.category];
            const isExpanded = expandedEntry === entry.id;

            // Color configurations for Enterprise White
            const colorConfig = {
              profile: {
                bg: 'bg-primary/10',
                text: 'text-primary',
                badge: 'bg-primary/10 text-primary',
              },
              security: {
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-500',
                badge: 'bg-emerald-500/10 text-emerald-500',
              },
              settings: {
                bg: 'bg-violet-50',
                text: 'text-violet-600',
                badge: 'bg-violet-50 text-violet-600',
              },
              auth: {
                bg: 'bg-amber-500/10',
                text: 'text-amber-600',
                badge: 'bg-amber-500/10 text-amber-600',
              },
            };

            const colors = colorConfig[entry.category];

            return (
              <div
                key={entry.id}
                className="rounded-xl bg-muted/50 border-2 border-border hover:border-primary/30 transition-colors overflow-hidden"
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${colors.bg}`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-foreground">{entry.action}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                            {entry.category}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {entry.ip}
                        </span>
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {parseUserAgent(entry.userAgent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t-2 border-border">
                    <div className="pt-3 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Details</p>
                        <pre className="text-xs text-foreground bg-input border-2 border-border rounded-xl p-2 overflow-x-auto">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">User Agent</p>
                        <p className="text-xs text-muted-foreground font-mono bg-input border-2 border-border rounded-xl p-2 break-all">
                          {entry.userAgent}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">IP-Adresse</p>
                          <p className="text-sm text-foreground font-mono">{entry.ip}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Zeitstempel</p>
                          <p className="text-sm text-foreground">
                            {entry.timestamp.toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredEntries.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Keine Ereignisse gefunden</p>
            </div>
          )}
        </div>

        {/* Pagination Info */}
        <div className="mt-4 pt-4 border-t-2 border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredEntries.length} Ereignisse angezeigt</span>
          <span>Letzte {limit} Einträge</span>
        </div>
      </div>
    </div>
  );
}
