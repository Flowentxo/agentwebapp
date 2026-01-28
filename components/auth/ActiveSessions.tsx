'use client';

/**
 * Active Sessions Component
 * Displays all active sessions for the current user with device info and revoke functionality
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Gamepad2,
  Watch,
  Bot,
  Globe,
  Clock,
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
  LogOut,
  CheckCircle,
} from 'lucide-react';

// Types matching the API response
interface SessionItem {
  id: string;
  deviceDescription: string;
  deviceIcon: string;
  deviceType: string;
  browser: string | null;
  os: string | null;
  ip: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  isBot: boolean;
}

interface SessionsData {
  sessions: SessionItem[];
  currentSessionId: string | null;
}

// Device icon mapping
const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  monitor: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
  tv: Tv,
  'gamepad-2': Gamepad2,
  watch: Watch,
};

function getDeviceIconComponent(iconName: string) {
  return deviceIcons[iconName] || Monitor;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Minute${diffMin !== 1 ? 'n' : ''}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format date for tooltip
function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState<string | null>(null);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to load sessions');
      }

      setSessions(data.data.sessions);
      setCurrentSessionId(data.data.currentSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Revoke session
  const handleRevoke = async (sessionId: string, isCurrent: boolean) => {
    if (revokingId) return; // Prevent double-click

    // Confirm for current session
    if (isCurrent) {
      const confirmed = window.confirm(
        'Dies ist Ihre aktuelle Sitzung. Wenn Sie fortfahren, werden Sie abgemeldet. Fortfahren?'
      );
      if (!confirmed) return;
    }

    setRevokingId(sessionId);
    setRevokeSuccess(null);

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to revoke session');
      }

      // If current session was revoked, redirect to login
      if (isCurrent) {
        window.location.href = '/login';
        return;
      }

      // Remove from list and show success
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setRevokeSuccess(sessionId);
      setTimeout(() => setRevokeSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-card/5 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <span className="ml-3 text-muted-foreground">Lade Sitzungen...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchSessions}
          className="mt-4 flex items-center gap-2 text-sm text-amber-400 hover:underline"
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Aktive Sitzungen</h3>
            <p className="text-sm text-muted-foreground">
              {sessions.length} aktive Sitzung{sessions.length !== 1 ? 'en' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={fetchSessions}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-card/5 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Error banner (when sessions exist but refresh failed) */}
      {error && sessions.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const DeviceIcon = getDeviceIconComponent(session.deviceIcon);
          const isRevoking = revokingId === session.id;

          return (
            <div
              key={session.id}
              className={`
                relative rounded-xl border p-4 transition-all
                ${session.isCurrent
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-white/10 bg-card/5 hover:border-white/20'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Device Icon */}
                <div
                  className={`
                    flex h-12 w-12 items-center justify-center rounded-lg
                    ${session.isCurrent ? 'bg-amber-500/20' : 'bg-card/10'}
                  `}
                >
                  {session.isBot ? (
                    <Bot className="h-6 w-6 text-red-400" />
                  ) : (
                    <DeviceIcon className={`h-6 w-6 ${session.isCurrent ? 'text-amber-400' : 'text-muted-foreground'}`} />
                  )}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-white truncate">
                      {session.deviceDescription}
                    </h4>
                    {session.isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                        <CheckCircle className="h-3 w-3" />
                        Dieses Gerät
                      </span>
                    )}
                    {session.isBot && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                        <Bot className="h-3 w-3" />
                        Bot
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {session.ip && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        <span>{session.ip}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5" title={formatFullDate(session.lastActiveAt)}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>Aktiv {formatRelativeTime(session.lastActiveAt)}</span>
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    Erstellt: {formatFullDate(session.createdAt)}
                  </div>
                </div>

                {/* Revoke Button */}
                <button
                  onClick={() => handleRevoke(session.id, session.isCurrent)}
                  disabled={isRevoking}
                  className={`
                    flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
                    ${session.isCurrent
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-card/5 text-muted-foreground hover:bg-card/10 hover:text-white'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isRevoking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {session.isCurrent ? 'Abmelden' : 'Beenden'}
                  </span>
                </button>
              </div>

              {/* Success indicator */}
              {revokeSuccess === session.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/20">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span>Sitzung beendet</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-card/5 p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h4 className="mt-4 text-lg font-medium text-white">Keine aktiven Sitzungen</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Es wurden keine aktiven Sitzungen gefunden.
          </p>
        </div>
      )}

      {/* Security tip */}
      <div className="flex items-start gap-3 rounded-lg bg-slate-800/50 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-muted-foreground">
          <strong className="text-slate-300">Sicherheitstipp:</strong> Wenn Sie eine Sitzung nicht erkennen,
          beenden Sie sie sofort und ändern Sie Ihr Passwort.
        </div>
      </div>
    </div>
  );
}

export default ActiveSessions;
