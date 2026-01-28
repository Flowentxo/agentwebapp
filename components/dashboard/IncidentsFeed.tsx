'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Rocket,
  TrendingUp,
  Zap,
  ChevronDown,
} from 'lucide-react';

export type Incident = {
  id: string;
  at: string; // ISO timestamp
  type: 'deploy' | 'error' | 'spike' | 'rate_limit';
  agentId?: string;
  message: string;
  severity?: 'low' | 'medium' | 'high';
};

interface IncidentsFeedProps {
  items: Incident[];
}

function getIncidentIcon(type: Incident['type']) {
  switch (type) {
    case 'deploy':
      return <Rocket className="h-4 w-4" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4" />;
    case 'spike':
      return <TrendingUp className="h-4 w-4" />;
    case 'rate_limit':
      return <Zap className="h-4 w-4" />;
  }
}

function getIncidentColor(type: Incident['type'], severity?: Incident['severity']) {
  if (type === 'error') {
    if (severity === 'high') return 'bg-error/10 text-error border-error/20';
    if (severity === 'medium') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-warning/10 text-warning border-warning/20';
  }
  if (type === 'rate_limit') return 'bg-warning/10 text-warning border-warning/20';
  if (type === 'spike') return 'bg-primary/10 text-primary border-primary/20';
  return 'bg-success/10 text-success border-success/20';
}

function getIncidentLabel(type: Incident['type']) {
  switch (type) {
    case 'deploy':
      return 'Deployment';
    case 'error':
      return 'Fehler';
    case 'spike':
      return 'Traffic-Spike';
    case 'rate_limit':
      return 'Rate-Limit';
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentsFeed({ items }: IncidentsFeedProps) {
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new items arrive
  useEffect(() => {
    if (isAutoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [items, isAutoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    setIsAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
      setIsAutoScroll(true);
    }
  };

  return (
    <div className="panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Aktivität & Incidents</h3>
          <p className="text-xs text-text-muted">Letzte 24 Stunden</p>
        </div>

        {!isAutoScroll && (
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-card/10"
            aria-label="Zurück zu jetzt"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Zurück zu jetzt
          </button>
        )}
      </div>

      <div
        ref={feedRef}
        role="feed"
        aria-label="Aktivitäts-Feed"
        className="max-h-[400px] space-y-3 overflow-y-auto pr-2"
        onScroll={handleScroll}
      >
        {items.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-text-muted">Keine Aktivitäten</p>
          </div>
        ) : (
          items.map((incident) => (
            <article
              key={incident.id}
              className={`flex gap-3 rounded-lg border p-3 transition-colors hover:bg-card/5 ${getIncidentColor(
                incident.type,
                incident.severity
              )}`}
            >
              <div className="flex-shrink-0">{getIncidentIcon(incident.type)}</div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold">
                    {getIncidentLabel(incident.type)}
                    {incident.agentId && (
                      <span className="ml-1 text-text-muted">· {incident.agentId}</span>
                    )}
                  </span>
                  <time
                    dateTime={incident.at}
                    className="flex-shrink-0 text-xs text-text-muted"
                    aria-describedby={`incident-${incident.id}-desc`}
                  >
                    {formatTimestamp(incident.at)}
                  </time>
                </div>

                <p
                  id={`incident-${incident.id}-desc`}
                  className="text-sm text-text-muted"
                >
                  {incident.message}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
