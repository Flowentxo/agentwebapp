'use client';

/**
 * Gmail Connection Status Badge
 * Shows connection status in the chat header (Emmie-only)
 * Click opens popover with token health details
 */

import { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenHealth {
  isConnected: boolean;
  isValid: boolean;
  expiresAt?: string;
  expiresIn?: number;
  needsRefresh: boolean;
  lastRefreshed?: string;
  refreshAttempts: number;
  lastError?: string;
}

interface GmailStatus {
  connected: boolean;
  email?: string;
  health?: TokenHealth;
}

interface GmailStatusBadgeProps {
  className?: string;
}

export function GmailStatusBadge({ className }: GmailStatusBadgeProps) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch Gmail connection status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/inbox/gmail/status', {
          headers: { 'x-user-id': 'demo-user' },
        });
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        } else {
          setStatus({ connected: false });
        }
      } catch {
        setStatus({ connected: false });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    // Re-check every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    if (showPopover) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopover]);

  if (isLoading) return null;

  const connected = status?.connected ?? false;
  const health = status?.health;

  return (
    <div className={cn('relative', className)} ref={popoverRef}>
      {/* Badge Button */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
          connected
            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
            : 'text-red-400 bg-red-500/10 hover:bg-red-500/15'
        )}
      >
        <div className={cn(
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-400' : 'bg-red-400'
        )} />
        <Mail className="w-3 h-3" />
        <span className="hidden sm:inline">
          {connected ? 'Gmail' : 'Nicht verbunden'}
        </span>
      </button>

      {/* Popover */}
      {showPopover && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-[#111] border border-white/[0.08] rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Status Header */}
          <div className={cn(
            'flex items-center gap-3 px-4 py-3',
            connected ? 'bg-emerald-500/5' : 'bg-red-500/5'
          )}>
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              connected ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {connected ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {connected ? 'Gmail verbunden' : 'Nicht verbunden'}
              </p>
              {status?.email && (
                <p className="text-[11px] text-white/40">{status.email}</p>
              )}
            </div>
          </div>

          {/* Health Details */}
          {connected && health && (
            <div className="px-4 py-3 space-y-2 border-t border-white/[0.06]">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Token Status</span>
                <span className={health.isValid ? 'text-emerald-400' : 'text-amber-400'}>
                  {health.isValid ? 'Gueltig' : 'Erneuerung noetig'}
                </span>
              </div>
              {health.expiresIn && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/40">Laeuft ab in</span>
                  <span className="text-white/60">
                    {Math.floor(health.expiresIn / 60)} Min
                  </span>
                </div>
              )}
              {health.lastRefreshed && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/40">Letzte Aktualisierung</span>
                  <span className="text-white/60">
                    {new Date(health.lastRefreshed).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {health.lastError && (
                <div className="mt-2 px-2 py-1.5 bg-red-500/10 rounded-lg">
                  <p className="text-[10px] text-red-400">{health.lastError}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-2.5 border-t border-white/[0.06]">
            {connected ? (
              <button
                onClick={() => setShowPopover(false)}
                className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Verbindung erneuern</span>
              </button>
            ) : (
              <a
                href="/api/integrations/gmail/connect"
                className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Gmail verbinden</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
