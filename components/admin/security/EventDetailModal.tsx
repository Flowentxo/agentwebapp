/**
 * Event Detail Modal Component
 * Displays detailed information about a suspicious activity event
 */

'use client';

import { X, MapPin, Globe, Monitor, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { SuspiciousActivityEvent } from '@/lib/mock-data/security';
import { formatRelativeTime } from '@/lib/mock-data/security';

interface EventDetailModalProps {
  event: SuspiciousActivityEvent | null;
  onClose: () => void;
}

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);

  if (!event) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto panel animate-in zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-surface-1/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Event Details</h2>
            <p className="text-xs text-white/50 mt-0.5">Event ID: {event.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Event Overview */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className={`text-xs px-3 py-1.5 rounded-full ring-1 font-semibold ${getSeverityColor(event.severity)}`}>
                {event.severity.toUpperCase()}
              </span>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1">{event.description}</h3>
                <p className="text-xs text-white/50">
                  {formatRelativeTime(event.timestamp)} •{' '}
                  {event.timestamp.toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* User Information */}
          {event.userEmail && (
            <div className="rounded-xl bg-card/[0.02] border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm uppercase tracking-wide text-white/50 font-semibold">
                  User Profile
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/50 mb-1">Email</p>
                  <p className="text-sm text-blue-400 font-medium">{event.userEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">User ID</p>
                  <p className="text-sm text-white font-mono">{event.userId}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Account Age</p>
                  <p className="text-sm text-white">24 Tage</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Role</p>
                  <p className="text-sm text-white">User</p>
                </div>
              </div>
            </div>
          )}

          {/* IP & Location Information */}
          <div className="rounded-xl bg-card/[0.02] border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-violet-400" />
              <h4 className="text-sm uppercase tracking-wide text-white/50 font-semibold">
                Network Information
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/50 mb-1">IP Address</p>
                <p className="text-sm text-white font-mono">{event.ipAddress}</p>
              </div>
              {event.location && (
                <>
                  <div>
                    <p className="text-xs text-white/50 mb-1">Location</p>
                    <p className="text-sm text-white">
                      {event.location.city}, {event.location.country}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-1">ISP</p>
                    <p className="text-sm text-white">Deutsche Telekom AG</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-1">Blacklist Status</p>
                    <p className="text-sm text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      Clean
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Metadata */}
          {event.metadata && (
            <div className="rounded-xl bg-card/[0.02] border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-orange-400" />
                  <h4 className="text-sm uppercase tracking-wide text-white/50 font-semibold">
                    Request Metadata
                  </h4>
                </div>
                <button
                  onClick={() => setJsonExpanded(!jsonExpanded)}
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {jsonExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Expand JSON
                    </>
                  )}
                </button>
              </div>
              {jsonExpanded ? (
                <pre className="text-xs text-white/70 bg-black/20 rounded-lg p-4 overflow-x-auto">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/50 mb-1">User Agent</p>
                    <p className="text-xs text-white/70 font-mono break-all">
                      {event.metadata.userAgent}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/50 mb-1">Request Path</p>
                      <p className="text-sm text-white font-mono">{event.metadata.requestPath}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 mb-1">Method</p>
                      <p className="text-sm text-white font-mono">{event.metadata.requestMethod}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Related Events Timeline */}
          <div className="rounded-xl bg-card/[0.02] border border-white/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-yellow-400" />
              <h4 className="text-sm uppercase tracking-wide text-white/50 font-semibold">
                Related Events (Last 24h)
              </h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-white">Failed login attempt</p>
                  <p className="text-xs text-white/50 mt-0.5">vor 5 Minuten • {event.ipAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-white">Rate limit exceeded</p>
                  <p className="text-xs text-white/50 mt-0.5">vor 12 Minuten • {event.ipAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-white">Successful login</p>
                  <p className="text-xs text-white/50 mt-0.5">vor 2 Stunden • {event.ipAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Log */}
          {event.reviewedBy && (
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm uppercase tracking-wide text-blue-400/70 font-semibold">
                  Review Information
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-blue-400/60 mb-1">Reviewed By</p>
                  <p className="text-blue-300">{event.reviewedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400/60 mb-1">Reviewed At</p>
                  <p className="text-blue-300">
                    {event.reviewedAt && formatRelativeTime(event.reviewedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-1/95 backdrop-blur-sm border-t border-white/10 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-card/5 hover:bg-card/10 text-white font-medium transition-all ring-1 ring-white/10 hover:ring-white/20"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
