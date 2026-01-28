/**
 * Admin Security Monitoring Page
 * Real-time suspicious activity monitoring with policy management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Activity, Download, Lock } from 'lucide-react';
import KPICards from '@/components/admin/security/KPICards';
import ActivityFeed from '@/components/admin/security/ActivityFeed';
import PolicyTable from '@/components/admin/security/PolicyTable';
import FilterBar from '@/components/admin/security/FilterBar';
import EventDetailModal from '@/components/admin/security/EventDetailModal';
import type { SuspiciousActivityEvent, SecurityPolicy } from '@/lib/mock-data/security';
import { calculateKPIs } from '@/lib/mock-data/security';

export default function SuspiciousActivityPage() {
  // State Management
  const [events, setEvents] = useState<SuspiciousActivityEvent[]>([]);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SuspiciousActivityEvent | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockEventId, setBlockEventId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('24h');
  const [blockLoading, setBlockLoading] = useState(false);

  // Filter State
  const [timeRange, setTimeRange] = useState('24h');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time indicator
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        timeRange,
        severity,
        status,
        eventType,
        search: searchQuery,
      });

      const response = await fetch(`/api/admin/security/suspicious-activity?${params}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, severity, status, eventType, searchQuery]);

  // Fetch policies
  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/admin/security/policies');
      const data = await response.json();
      if (data.success) {
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
    fetchPolicies();
  }, [fetchEvents]);

  // Real-time updates (every 5 seconds)
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive, fetchEvents]);

  // Handle Actions
  const handleBlock = async (eventId: string) => {
    setBlockEventId(eventId);
    setShowBlockModal(true);
  };

  const confirmBlock = async () => {
    if (!blockEventId) return;

    setBlockLoading(true);
    try {
      const response = await fetch('/api/admin/security/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block',
          eventId: blockEventId,
          reason: blockReason,
          duration: blockDuration,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchEvents();
        setShowBlockModal(false);
        setBlockEventId(null);
        setBlockReason('');
        setBlockDuration('24h');
      }
    } catch (error) {
      console.error('Failed to block:', error);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReview = async (eventId: string) => {
    try {
      const response = await fetch('/api/admin/security/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          eventId,
        }),
      });

      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error('Failed to review:', error);
    }
  };

  const handleDismiss = async (eventId: string) => {
    try {
      const response = await fetch('/api/admin/security/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          eventId,
        }),
      });

      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  // Policy Actions
  const handlePolicyToggle = async (policyId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/security/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          policyId,
          enabled,
        }),
      });

      if (response.ok) {
        await fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to toggle policy:', error);
    }
  };

  const handlePolicyThresholdUpdate = async (policyId: string, threshold: number) => {
    try {
      const response = await fetch('/api/admin/security/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateThreshold',
          policyId,
          threshold,
        }),
      });

      if (response.ok) {
        await fetchPolicies();
      }
    } catch (error) {
      console.error('Failed to update threshold:', error);
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Timestamp', 'Severity', 'Type', 'User', 'IP', 'Location', 'Status'];
    const rows = events.map((e) => [
      e.timestamp.toISOString(),
      e.severity,
      e.eventType,
      e.userEmail || 'N/A',
      e.ipAddress,
      e.location ? `${e.location.city}, ${e.location.country}` : 'N/A',
      e.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suspicious-activity-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate KPIs
  const kpis = calculateKPIs(events);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
          <p className="text-white/60 text-sm">Lade Security-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 ring-1 ring-red-500/30">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Security Monitoring</h1>
              {/* Real-time Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
                <div className="relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <div className="absolute w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
                </div>
                <span className="text-xs font-semibold text-green-400">LIVE</span>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Überwachung verdächtiger Aktivitäten • Letzte Aktualisierung:{' '}
              {lastUpdate.toLocaleTimeString('de-DE')}
            </p>
          </div>

          {/* Live Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-white/60">Auto-Refresh</span>
              <button
                onClick={() => setIsLive(!isLive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isLive ? 'bg-green-500' : 'bg-card/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                    isLive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards
          activeAlerts={kpis.activeAlerts}
          blockedIPs={kpis.blockedIPs}
          failedLogins={kpis.failedLogins}
          policyViolations={kpis.policyViolations}
        />

        {/* Filter Bar */}
        <FilterBar
          timeRange={timeRange}
          severity={severity}
          status={status}
          eventType={eventType}
          searchQuery={searchQuery}
          onTimeRangeChange={setTimeRange}
          onSeverityChange={setSeverity}
          onStatusChange={setStatus}
          onEventTypeChange={setEventType}
          onSearchChange={setSearchQuery}
          onExport={handleExport}
          onRefresh={fetchEvents}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Activity Feed - 2 columns */}
          <div className="xl:col-span-2">
            <ActivityFeed
              events={events}
              onBlock={handleBlock}
              onReview={handleReview}
              onDismiss={handleDismiss}
              onViewDetails={setSelectedEvent}
            />
          </div>

          {/* Quick Stats Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="panel p-5">
              <h3 className="text-sm uppercase tracking-wide text-white/50 font-semibold mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all ring-1 ring-red-500/30 hover:ring-red-500/50 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Block All Critical IPs
                </button>
                <button className="w-full px-4 py-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-all ring-1 ring-blue-500/30 hover:ring-blue-500/50 flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" />
                  Generate Report
                </button>
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-3 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-sm font-medium transition-all ring-1 ring-violet-500/30 hover:ring-violet-500/50 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              </div>
            </div>

            {/* Recent Critical Alerts */}
            <div className="panel p-5">
              <h3 className="text-sm uppercase tracking-wide text-white/50 font-semibold mb-4">
                Recent Critical
              </h3>
              <div className="space-y-3">
                {events
                  .filter((e) => e.severity === 'critical' && e.status === 'active')
                  .slice(0, 3)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 cursor-pointer hover:bg-red-500/10 transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <p className="text-xs font-semibold text-red-400 mb-1">
                        {event.eventType.toUpperCase()}
                      </p>
                      <p className="text-xs text-white/70 line-clamp-2">{event.description}</p>
                      <p className="text-xs text-white/40 mt-1 font-mono">{event.ipAddress}</p>
                    </div>
                  ))}
                {events.filter((e) => e.severity === 'critical' && e.status === 'active').length ===
                  0 && (
                  <p className="text-xs text-white/40 text-center py-4">
                    Keine kritischen Alerts
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Policy Table */}
        <PolicyTable
          policies={policies}
          onToggle={handlePolicyToggle}
          onUpdateThreshold={handlePolicyThresholdUpdate}
        />

        {/* Event Detail Modal */}
        {selectedEvent && (
          <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}

        {/* Block Confirmation Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-md w-full panel p-6 animate-in zoom-in duration-200">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                  <Lock className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">IP/User blockieren?</h3>
                  <p className="text-sm text-white/60">
                    Dieser Vorgang blockiert die IP-Adresse und verhindert weitere Zugriffe.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/50 font-semibold mb-2">
                    Grund
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Beschreiben Sie den Grund für die Blockierung..."
                    className="w-full px-4 py-3 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/50 font-semibold mb-2">
                    Dauer
                  </label>
                  <select
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-card/[0.02] border border-white/10 text-white text-sm focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="1h">1 Stunde</option>
                    <option value="24h">24 Stunden</option>
                    <option value="7d">7 Tage</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockEventId(null);
                    setBlockReason('');
                    setBlockDuration('24h');
                  }}
                  disabled={blockLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-card/5 hover:bg-card/10 text-white font-medium transition-all ring-1 ring-white/10 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmBlock}
                  disabled={blockLoading || !blockReason}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium transition-all shadow-lg shadow-red-500/20 ring-1 ring-red-500/50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {blockLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Blockiere...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Blockieren
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
