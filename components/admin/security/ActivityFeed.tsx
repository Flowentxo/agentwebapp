/**
 * Activity Feed Component
 * Displays suspicious activity events with actions
 */

'use client';

import { AlertTriangle, AlertCircle, Info, CheckCircle, Lock, Eye, X, ChevronRight } from 'lucide-react';
import type { SuspiciousActivityEvent } from '@/lib/mock-data/security';
import { formatRelativeTime } from '@/lib/mock-data/security';

interface ActivityFeedProps {
  events: SuspiciousActivityEvent[];
  onBlock: (eventId: string) => void;
  onReview: (eventId: string) => void;
  onDismiss: (eventId: string) => void;
  onViewDetails: (event: SuspiciousActivityEvent) => void;
}

export default function ActivityFeed({
  events,
  onBlock,
  onReview,
  onDismiss,
  onViewDetails,
}: ActivityFeedProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 ring-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 ring-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/10 ring-green-500/20';
      default:
        return 'text-white/40 bg-card/5 ring-white/10';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
            Aktiv
          </span>
        );
      case 'reviewed':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            Überprüft
          </span>
        );
      case 'dismissed':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-muted/500/10 text-muted-foreground ring-1 ring-gray-500/20">
            Verworfen
          </span>
        );
      case 'blocked':
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
            Blockiert
          </span>
        );
      default:
        return null;
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      brute_force: 'Brute-Force',
      failed_login: 'Login fehlgeschlagen',
      rate_limit: 'Rate-Limit',
      admin_access: 'Admin-Zugriff',
      unusual_location: 'Ungewöhnliche Location',
      sql_injection: 'SQL-Injection',
      xss_attempt: 'XSS-Versuch',
    };
    return labels[eventType] || eventType;
  };

  if (events.length === 0) {
    return (
      <div className="panel p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-card/[0.03] ring-1 ring-white/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-white/40" />
        </div>
        <p className="text-white/60 text-sm font-medium">Keine verdächtigen Aktivitäten</p>
        <p className="text-white/40 text-xs mt-1">Alle Systeme laufen normal</p>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm uppercase tracking-wide text-white/50 font-semibold">
          Suspicious Activity Feed
        </h3>
        <span className="text-xs text-white/40">{events.length} Events</span>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl bg-card/[0.02] border border-white/10 hover:border-white/20 transition-all p-4"
          >
            <div className="flex items-start gap-4">
              {/* Severity Icon */}
              <div className={`p-2 rounded-lg ring-1 ${getSeverityColor(event.severity)} mt-1 flex-shrink-0`}>
                {getSeverityIcon(event.severity)}
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">
                        {getEventTypeLabel(event.eventType)}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">{event.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(event.status)}
                  </div>
                </div>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/50 mb-3">
                  <span className="flex items-center gap-1">
                    <span className="font-mono">{event.ipAddress}</span>
                  </span>
                  {event.location && (
                    <span>
                      {event.location.city}, {event.location.country}
                    </span>
                  )}
                  {event.userEmail && (
                    <span className="text-blue-400">{event.userEmail}</span>
                  )}
                  <span>{formatRelativeTime(event.timestamp)}</span>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2">
                  {event.status === 'active' && (
                    <>
                      <button
                        onClick={() => onBlock(event.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all ring-1 ring-red-500/30 hover:ring-red-500/50 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Block
                      </button>
                      <button
                        onClick={() => onReview(event.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-all ring-1 ring-blue-500/30 hover:ring-blue-500/50 flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </button>
                      <button
                        onClick={() => onDismiss(event.id)}
                        className="px-3 py-1.5 rounded-lg bg-card/5 hover:bg-card/10 text-white/60 hover:text-white text-xs font-medium transition-all ring-1 ring-white/10 hover:ring-white/20 flex items-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onViewDetails(event)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-card/5 hover:bg-card/10 text-white/60 hover:text-white text-xs font-medium transition-all ring-1 ring-white/10 hover:ring-white/20 flex items-center gap-1.5"
                  >
                    Details
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Reviewed Info */}
                {event.status === 'reviewed' && event.reviewedBy && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/50">
                      Überprüft von <span className="text-blue-400">{event.reviewedBy}</span> •{' '}
                      {event.reviewedAt && formatRelativeTime(event.reviewedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
