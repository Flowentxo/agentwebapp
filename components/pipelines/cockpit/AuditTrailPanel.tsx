'use client';

/**
 * AuditTrailPanel Component
 *
 * Displays a chronological log of all state changes during pipeline execution.
 * Includes manual vs. autopilot decisions, timestamps, and export functionality.
 *
 * Vicy-Style: Deep Black (#050505) + Subtle timeline design
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  User,
  Bot,
  Play,
  CheckCircle,
  XCircle,
  Pause,
  Clock,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCcw,
  SkipForward,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type AuditEventType =
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'step_skipped'
  | 'step_retried'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'autopilot_decision'
  | 'force_stopped'
  | 'config_changed';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  actor: 'user' | 'system' | 'autopilot';
  actorName?: string;
  nodeId?: string;
  nodeName?: string;
  description: string;
  details?: Record<string, unknown>;
  metadata?: {
    duration?: number;
    score?: number;
    confidenceScore?: number;
    decisionReason?: string;
  };
}

interface AuditTrailPanelProps {
  events: AuditEvent[];
  isLoading?: boolean;
  executionId?: string;
  onExport?: (format: 'json' | 'csv') => void;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getEventConfig(type: AuditEventType) {
  const configs: Record<
    AuditEventType,
    { icon: React.ElementType; color: string; bgColor: string; label: string }
  > = {
    execution_started: {
      icon: Play,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      label: 'Gestartet',
    },
    execution_completed: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      label: 'Abgeschlossen',
    },
    execution_failed: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Fehlgeschlagen',
    },
    step_started: {
      icon: Zap,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      label: 'Schritt gestartet',
    },
    step_completed: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      label: 'Schritt abgeschlossen',
    },
    step_failed: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Schritt fehlgeschlagen',
    },
    step_skipped: {
      icon: SkipForward,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      label: 'Übersprungen',
    },
    step_retried: {
      icon: RefreshCcw,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: 'Wiederholt',
    },
    approval_requested: {
      icon: Pause,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      label: 'Genehmigung angefordert',
    },
    approval_granted: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      label: 'Genehmigt',
    },
    approval_denied: {
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Abgelehnt',
    },
    autopilot_decision: {
      icon: Bot,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      label: 'Autopilot',
    },
    force_stopped: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      label: 'Notfall-Stop',
    },
    config_changed: {
      icon: Shield,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      label: 'Konfiguration geändert',
    },
  };

  return configs[type] || configs.step_started;
}

function getActorIcon(actor: AuditEvent['actor']) {
  switch (actor) {
    case 'user':
      return User;
    case 'autopilot':
      return Bot;
    default:
      return Zap;
  }
}

// ============================================
// EVENT ITEM COMPONENT
// ============================================

interface EventItemProps {
  event: AuditEvent;
  isFirst: boolean;
  isLast: boolean;
}

function EventItem({ event, isFirst, isLast }: EventItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = getEventConfig(event.type);
  const Icon = config.icon;
  const ActorIcon = getActorIcon(event.actor);

  const hasDetails = event.details && Object.keys(event.details).length > 0;

  return (
    <div className="relative">
      {/* Timeline Connector */}
      {!isLast && (
        <div className="absolute left-4 top-10 w-0.5 h-[calc(100%-16px)] bg-white/[0.04]" />
      )}

      {/* Event Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-start gap-3 p-3 rounded-xl transition-colors',
          'hover:bg-white/[0.02]',
          hasDetails && 'cursor-pointer'
        )}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            config.bgColor
          )}
        >
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>
            {event.nodeName && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/40 truncate max-w-32">
                  {event.nodeName}
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-white/70">{event.description}</p>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-white/30 flex items-center gap-1">
              <Clock size={10} />
              {formatTimestamp(event.timestamp)}
            </span>
            <span className="text-xs text-white/30 flex items-center gap-1">
              <ActorIcon size={10} />
              {event.actorName || event.actor}
            </span>
            {event.metadata?.duration && (
              <span className="text-xs text-white/30">
                {event.metadata.duration}ms
              </span>
            )}
            {event.metadata?.score !== undefined && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  event.metadata.score >= 70
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : event.metadata.score >= 40
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
                )}
              >
                Score: {event.metadata.score}
              </span>
            )}
          </div>
        </div>

        {/* Expand Toggle */}
        {hasDetails && (
          <button className="p-1 text-white/20 hover:text-white/40">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </motion.div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-11"
          >
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mt-1 mb-2">
              <pre className="text-xs text-white/50 overflow-x-auto">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AuditTrailPanel({
  events,
  isLoading = false,
  executionId,
  onExport,
  className,
}: AuditTrailPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AuditEventType | 'all'>('all');
  const [filterActor, setFilterActor] = useState<AuditEvent['actor'] | 'all'>('all');

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = event.description.toLowerCase().includes(query);
        const matchesNode = event.nodeName?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesNode) return false;
      }

      // Type filter
      if (filterType !== 'all' && event.type !== filterType) return false;

      // Actor filter
      if (filterActor !== 'all' && event.actor !== filterActor) return false;

      return true;
    });
  }, [events, searchQuery, filterType, filterActor]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, AuditEvent[]> = {};

    filteredEvents.forEach((event) => {
      const date = formatDate(event.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });

    return groups;
  }, [filteredEvents]);

  // Stats
  const stats = useMemo(() => {
    const userDecisions = events.filter((e) => e.actor === 'user').length;
    const autopilotDecisions = events.filter((e) => e.actor === 'autopilot').length;
    const errors = events.filter((e) =>
      ['execution_failed', 'step_failed'].includes(e.type)
    ).length;

    return { userDecisions, autopilotDecisions, errors };
  }, [events]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-white/40" />
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
              Audit Trail
            </span>
            {executionId && (
              <span className="text-[10px] text-white/20 font-mono">
                {executionId.slice(0, 8)}
              </span>
            )}
          </div>

          {/* Export Buttons */}
          {onExport && events.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onExport('json')}
                className="p-1.5 rounded-lg hover:bg-white/[0.04] text-white/30 hover:text-white/50 transition-colors"
                title="Export als JSON"
              >
                <FileJson size={14} />
              </button>
              <button
                onClick={() => onExport('csv')}
                className="p-1.5 rounded-lg hover:bg-white/[0.04] text-white/30 hover:text-white/50 transition-colors"
                title="Export als CSV"
              >
                <FileSpreadsheet size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-white">{events.length}</p>
            <p className="text-[10px] text-white/30">Events</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-violet-400">
              {stats.autopilotDecisions}
            </p>
            <p className="text-[10px] text-white/30">Autopilot</p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] text-center">
            <p className="text-lg font-semibold text-blue-400">{stats.userDecisions}</p>
            <p className="text-[10px] text-white/30">Manuell</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Events durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2 rounded-lg',
              'bg-white/[0.02] border border-white/[0.06]',
              'text-sm text-white placeholder:text-white/30',
              'focus:outline-none focus:border-violet-500/30'
            )}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-2">
          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value as any)}
            className={cn(
              'flex-1 px-2 py-1.5 rounded-lg text-xs',
              'bg-white/[0.02] border border-white/[0.06]',
              'text-white/60 focus:outline-none focus:border-violet-500/30'
            )}
          >
            <option value="all">Alle Akteure</option>
            <option value="user">Benutzer</option>
            <option value="autopilot">Autopilot</option>
            <option value="system">System</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className={cn(
              'flex-1 px-2 py-1.5 rounded-lg text-xs',
              'bg-white/[0.02] border border-white/[0.06]',
              'text-white/60 focus:outline-none focus:border-violet-500/30'
            )}
          >
            <option value="all">Alle Typen</option>
            <option value="approval_granted">Genehmigungen</option>
            <option value="autopilot_decision">Autopilot</option>
            <option value="step_failed">Fehler</option>
            <option value="step_retried">Retries</option>
          </select>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-white/40">Lade Events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-3">
              <History className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-sm text-white/40">
              {searchQuery || filterType !== 'all' || filterActor !== 'all'
                ? 'Keine Events gefunden'
                : 'Noch keine Events'}
            </p>
            {events.length === 0 && (
              <p className="text-xs text-white/20 mt-1">
                Starten Sie eine Pipeline, um den Audit Trail zu sehen
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/30 font-medium">{date}</span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="text-[10px] text-white/20">
                    {dateEvents.length} Events
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dateEvents.map((event, index) => (
                    <EventItem
                      key={event.id}
                      event={event}
                      isFirst={index === 0}
                      isLast={index === dateEvents.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditTrailPanel;
