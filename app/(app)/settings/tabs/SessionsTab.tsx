/**
 * Sessions Tab - Enterprise White Design
 * Displays all active sessions with device info and revoke functionality
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Gamepad2,
  Watch,
  Bot,
  MapPin,
  Clock,
  Shield,
  AlertCircle,
  Globe,
  CheckCircle2,
  LogOut,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface SessionsTabProps {
  userId: string;
}

// API Response types
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

export default function SessionsTab({ userId }: SessionsTabProps) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Fetch sessions from API
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
        throw new Error(data.error?.message || 'Fehler beim Laden der Sitzungen');
      }

      setSessions(data.data.sessions);
      setCurrentSessionId(data.data.currentSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Sitzungen');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setShowRevokeModal(true);
  };

  const confirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setRevoking(true);

    try {
      if (sessionToRevoke === 'all-others') {
        // Revoke all other sessions
        const otherSessions = sessions.filter((s) => !s.isCurrent);
        for (const session of otherSessions) {
          await fetch('/api/auth/sessions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sessionId: session.id }),
          });
        }
        setSessions(sessions.filter((s) => s.isCurrent));
        toast.success('Alle anderen Sitzungen beendet');
      } else {
        const response = await fetch('/api/auth/sessions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId: sessionToRevoke }),
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error?.message || 'Fehler beim Beenden der Sitzung');
        }

        // Check if current session was revoked
        const revokedSession = sessions.find((s) => s.id === sessionToRevoke);
        if (revokedSession?.isCurrent) {
          window.location.href = '/login';
          return;
        }

        setSessions(sessions.filter((s) => s.id !== sessionToRevoke));
        toast.success('Sitzung beendet');
      }

      setShowRevokeModal(false);
      setSessionToRevoke(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Beenden der Sitzung');
      toast.error('Sitzung konnte nicht beendet werden');
    } finally {
      setRevoking(false);
    }
  };

  const activeSessions = sessions.filter((s) => !s.isCurrent).length;

  // Loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div className="w-full px-6 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--vicy-accent)]" />
        <span className="ml-3 text-[var(--vicy-text-secondary)]">Lade Sitzungen...</span>
      </div>
    );
  }

  // Error state (when no sessions loaded)
  if (error && sessions.length === 0) {
    return (
      <div className="w-full px-6 py-6">
        <div className="p-6 rounded-xl bg-red-500/10 border-2 border-red-500/30">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchSessions}
            className="mt-4 flex items-center gap-2 text-sm text-[var(--vicy-accent)] hover:underline"
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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Sessions */}
        <div className="p-4 rounded-xl bg-[var(--vicy-surface)] border-2 border-[var(--vicy-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--vicy-accent-glow)]">
              <Monitor className="w-4 h-4 text-[var(--vicy-accent)]" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--vicy-accent-glow)] text-[var(--vicy-accent)]">
              Aktiv
            </span>
          </div>
          <p className="text-xs text-[var(--vicy-text-secondary)] mb-1">Aktive Sitzungen</p>
          <p className="text-sm font-medium text-[var(--vicy-text-primary)]">{sessions.length} Gesamt</p>
        </div>

        {/* Last Activity */}
        <div className="p-4 rounded-xl bg-[var(--vicy-surface)] border-2 border-[var(--vicy-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <CheckCircle2 className="w-4 h-4 text-[var(--vicy-text-secondary)]" />
          </div>
          <p className="text-xs text-[var(--vicy-text-secondary)] mb-1">Letzte Aktivität</p>
          <p className="text-sm font-medium text-[var(--vicy-text-primary)]">
            {sessions.length > 0 ? formatRelativeTime(sessions[0].lastActiveAt) : '-'}
          </p>
        </div>

        {/* Device Count */}
        <div className="p-4 rounded-xl bg-[var(--vicy-surface)] border-2 border-[var(--vicy-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[var(--vicy-glass-bg)]">
              <Shield className="w-4 h-4 text-[var(--vicy-text-secondary)]" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              Sicher
            </span>
          </div>
          <p className="text-xs text-[var(--vicy-text-secondary)] mb-1">Geräte</p>
          <p className="text-sm font-medium text-[var(--vicy-text-primary)]">{sessions.length} Verbunden</p>
        </div>
      </div>

      {/* Error banner (when sessions exist but refresh failed) */}
      {error && sessions.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border-2 border-red-500/30 px-4 py-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Sessions List */}
      <div className="p-6 rounded-xl bg-[var(--vicy-surface)] border-2 border-[var(--vicy-border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-[var(--vicy-text-secondary)] uppercase tracking-wide">
            Aktive Sitzungen
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSessions}
              disabled={isLoading}
              className="text-xs text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </button>
            {activeSessions > 0 && (
              <button
                onClick={() => {
                  setSessionToRevoke('all-others');
                  setShowRevokeModal(true);
                }}
                className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Alle anderen beenden
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIconComponent(session.deviceIcon);

            return (
              <div
                key={session.id}
                className={`p-4 rounded-xl border-2 transition-colors ${
                  session.isCurrent
                    ? 'bg-emerald-500/10/50 border-emerald-500/30'
                    : 'bg-[var(--vicy-surface)] border-[var(--vicy-border)] hover:border-[var(--vicy-accent)]/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Device Icon */}
                  <div className={`p-2 rounded-lg ${session.isCurrent ? 'bg-emerald-500/20' : 'bg-[var(--vicy-glass-bg)]'}`}>
                    {session.isBot ? (
                      <Bot className="w-5 h-5 text-red-600" />
                    ) : (
                      <DeviceIcon className={`w-5 h-5 ${session.isCurrent ? 'text-emerald-500' : 'text-[var(--vicy-text-secondary)]'}`} />
                    )}
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-[var(--vicy-text-primary)]">
                        {session.deviceDescription}
                      </p>
                      {session.isCurrent && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 flex items-center gap-1 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Dieses Gerät
                        </span>
                      )}
                      {session.isBot && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-500/10 text-red-600 flex items-center gap-1 border border-red-500/30">
                          <Bot className="w-3 h-3" />
                          Bot
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--vicy-text-secondary)]">
                      {session.ip && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span className="font-mono">{session.ip}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Aktiv {formatRelativeTime(session.lastActiveAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revoke Button */}
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 border-2 ${
                      session.isCurrent
                        ? 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-[var(--vicy-glass-bg)] text-[var(--vicy-text-secondary)] border-[var(--vicy-border)] hover:bg-[var(--vicy-surface-hover)] hover:text-[var(--vicy-text-primary)]'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {session.isCurrent ? 'Abmelden' : 'Beenden'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {sessions.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--vicy-glass-bg)] flex items-center justify-center">
              <Monitor className="w-6 h-6 text-[var(--vicy-text-secondary)]" />
            </div>
            <p className="text-sm text-[var(--vicy-text-secondary)]">Keine aktiven Sitzungen</p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      {activeSessions > 1 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-700 mb-1">
                Mehrere aktive Sitzungen
              </h4>
              <p className="text-xs text-amber-600 mb-2">
                Sie haben {activeSessions} andere aktive Sitzung{activeSessions > 1 ? 'en' : ''}.
                Wenn Sie eine dieser Sitzungen nicht erkennen, beenden Sie sie sofort und ändern Sie Ihr Passwort.
              </p>
              <button
                onClick={() => {
                  setSessionToRevoke('all-others');
                  setShowRevokeModal(true);
                }}
                className="text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors"
              >
                Alle anderen Sitzungen beenden →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vicy-bg)] backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--vicy-surface)] border-2 border-[var(--vicy-border)] shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[var(--vicy-text-primary)] mb-1">
                  {sessionToRevoke === 'all-others'
                    ? 'Alle anderen Sitzungen beenden?'
                    : sessions.find((s) => s.id === sessionToRevoke)?.isCurrent
                    ? 'Aktuelle Sitzung beenden?'
                    : 'Sitzung beenden?'}
                </h3>
                <p className="text-xs text-[var(--vicy-text-secondary)]">
                  {sessionToRevoke === 'all-others'
                    ? 'Alle anderen Geräte werden abgemeldet.'
                    : sessions.find((s) => s.id === sessionToRevoke)?.isCurrent
                    ? 'Sie werden abgemeldet und zur Login-Seite weitergeleitet.'
                    : 'Dieses Gerät wird abgemeldet.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setSessionToRevoke(null);
                }}
                className="p-1 rounded-xl hover:bg-[var(--vicy-surface-hover)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--vicy-text-secondary)]" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setSessionToRevoke(null);
                }}
                disabled={revoking}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--vicy-glass-bg)] text-[var(--vicy-text-primary)] text-sm font-medium border-2 border-[var(--vicy-border)] hover:bg-[var(--vicy-glass-bg)] disabled:opacity-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmRevokeSession}
                disabled={revoking}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {revoking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Beende...
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    Beenden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
