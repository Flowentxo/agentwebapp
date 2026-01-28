'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface CalendarConnectProps {
  onConnect?: () => void;
}

export function CalendarConnect({ onConnect }: CalendarConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationEmail, setIntegrationEmail] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // TODO: Check if user has calendar integration
      const response = await fetch('/api/calendar/status', {
        headers: {
          'x-user-id': 'demo-user', // TODO: Get from auth context
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setIntegrationEmail(data.email);
      }
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Use the frontend OAuth initiation flow (PKCE)
      const response = await fetch('/api/oauth/google/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service: 'calendar' }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth flow');
      }

      const data = await response.json();

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to connect calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? You will no longer receive meeting briefings.')) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const response = await fetch('/api/calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIsConnected(false);
      setIntegrationEmail(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnected) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1 tracking-tight">
                Calendar Connected
              </h3>
              <p className="text-sm text-emerald-100/80 mb-2">
                {integrationEmail}
              </p>
              <p className="text-[11px] text-emerald-400/60 uppercase tracking-widest font-bold">
                Brain AI is monitoring your calendar
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={isConnecting}
            className="text-xs font-bold text-white/40 hover:text-white uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-xl">
          <Calendar className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white mb-2 tracking-tight">
            Predictive Context Engine
          </h3>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            Connect your calendar and Brain AI will automatically prepare briefings
            for your meetings — complete with context, talking points, and insights.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-6 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Connect Google Calendar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
