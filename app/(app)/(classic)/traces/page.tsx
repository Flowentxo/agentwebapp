'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  DollarSign,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';

interface TraceEvent {
  spanId: string;
  eventType: string;
  timestamp: string;
  message?: string;
  role?: string;
  model?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;
  latencyMs?: number;
  costUsd?: number;
  error?: {
    message: string;
  };
  metadata?: Record<string, any>;
}

interface ConversationTrace {
  traceId: string;
  agentId: string;
  userId: string;
  sessionId: string;
  events: TraceEvent[];
  startedAt: string;
  endedAt?: string;
  totalTokens: number;
  totalCost: number;
  totalLatencyMs: number;
  status: string;
}

export default function TracesPage() {
  const [traces, setTraces] = useState<ConversationTrace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'error'>('all');

  useEffect(() => {
    loadTraces();
  }, []);

  const loadTraces = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/traces?limit=50');
      const result = await response.json();

      if (result.success) {
        setTraces(result.data);
      }
    } catch (error) {
      console.error('Failed to load traces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTraces = traces.filter((trace) => {
    if (filter === 'all') return true;
    return trace.status === filter;
  });

  const toggleTrace = (traceId: string) => {
    setExpandedTrace(expandedTrace === traceId ? null : traceId);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Agent Traces
            </h1>
            <p className="text-muted-foreground">
              Debug and monitor your agent conversations in real-time
            </p>
          </div>

          <button
            onClick={loadTraces}
            className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'completed', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
              <span className="ml-2 text-xs opacity-70">
                ({traces.filter((t) => f === 'all' || t.status === f).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Traces List */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading traces...</p>
          </div>
        ) : filteredTraces.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No traces yet</h3>
            <p className="text-muted-foreground mb-6">
              Start chatting with agents to see traces here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTraces.map((trace) => (
              <TraceCard
                key={trace.traceId}
                trace={trace}
                isExpanded={expandedTrace === trace.traceId}
                onToggle={() => toggleTrace(trace.traceId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Trace Card Component
function TraceCard({
  trace,
  isExpanded,
  onToggle,
}: {
  trace: ConversationTrace;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColor =
    trace.status === 'completed'
      ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
      : trace.status === 'error'
      ? 'text-red-600 bg-red-500/20 dark:bg-red-900/30 dark:text-red-400'
      : 'text-blue-600 bg-blue-500/20 dark:bg-blue-900/30 dark:text-blue-400';

  const startTime = new Date(trace.startedAt);
  const duration = trace.endedAt
    ? new Date(trace.endedAt).getTime() - startTime.getTime()
    : trace.totalLatencyMs;

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Summary */}
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {trace.status === 'completed' && <CheckCircle className="inline h-4 w-4 mr-1" />}
              {trace.status === 'error' && <AlertCircle className="inline h-4 w-4 mr-1" />}
              {trace.status}
            </div>
            <span className="text-sm text-muted-foreground">
              {trace.events.length} events
            </span>
          </div>

          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Metric
            icon={MessageSquare}
            label="Messages"
            value={trace.events.filter((e) => e.eventType !== 'system_event').length.toString()}
          />
          <Metric
            icon={Zap}
            label="Tokens"
            value={trace.totalTokens.toLocaleString()}
          />
          <Metric
            icon={DollarSign}
            label="Cost"
            value={`$${trace.totalCost.toFixed(6)}`}
          />
          <Metric
            icon={Clock}
            label="Duration"
            value={`${duration}ms`}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Trace ID: {trace.traceId}</span>
          <span>•</span>
          <span>Agent: {trace.agentId}</span>
          <span>•</span>
          <span>{startTime.toLocaleString()}</span>
        </div>
      </button>

      {/* Details */}
      {isExpanded && (
        <div className="border-t bg-muted/20">
          <div className="p-6 space-y-4">
            {trace.events.map((event, index) => (
              <EventCard key={event.spanId} event={event} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Component
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, index }: { event: TraceEvent; index: number }) {
  const eventColors: Record<string, string> = {
    user_message: 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
    agent_response: 'border-green-500 bg-green-50 dark:bg-green-500/20',
    error: 'border-red-500 bg-red-500/10 dark:bg-red-500/20',
    system_event: 'border-gray-500 bg-muted/50 dark:bg-muted/30',
  };

  const eventIcons: Record<string, any> = {
    user_message: MessageSquare,
    agent_response: Activity,
    error: AlertCircle,
    system_event: Clock,
  };

  const Icon = eventIcons[event.eventType] || Activity;
  const color = eventColors[event.eventType] || eventColors.system_event;

  return (
    <div className={`border-l-4 ${color} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium capitalize">
            {event.eventType.replace('_', ' ')}
          </span>
          {event.role && (
            <span className="text-xs px-2 py-1 bg-muted rounded-full">
              {event.role}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {event.message && (
        <p className="text-sm mb-3 whitespace-pre-wrap break-words">
          {event.message.length > 200
            ? event.message.substring(0, 200) + '...'
            : event.message}
        </p>
      )}

      {event.error && (
        <div className="bg-red-500/20 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded p-3 mb-3">
          <p className="text-sm text-red-700 dark:text-red-300 font-mono">
            {event.error.message}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        {event.model && (
          <span className="text-muted-foreground">Model: {event.model}</span>
        )}
        {event.tokensTotal !== undefined && (
          <span className="text-muted-foreground">
            Tokens: {event.tokensTotal} ({event.tokensPrompt}→{event.tokensCompletion})
          </span>
        )}
        {event.latencyMs !== undefined && (
          <span className="text-muted-foreground">
            Latency: {event.latencyMs}ms
          </span>
        )}
        {event.costUsd !== undefined && (
          <span className="text-muted-foreground">
            Cost: ${event.costUsd.toFixed(6)}
          </span>
        )}
      </div>
    </div>
  );
}
