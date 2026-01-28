'use client';

import { useState } from 'react';
import { Rocket, AlertTriangle, TrendingUp, Zap, FileQuestion } from 'lucide-react';
import { PanelHeader } from '@/components/common/PanelHeader';
import { formatRelativeTime } from '@/lib/format/number';

export type ActivityItem = {
  id: string;
  at: string; // ISO timestamp
  type: 'deploy' | 'error' | 'spike' | 'rate_limit';
  title: string;
  subtitle?: string;
  agentId?: string;
  severity?: 'low' | 'medium' | 'high';
};

interface ActivityListProps {
  items: ActivityItem[];
  isLoading?: boolean;
}

type ActivityFilter = 'all' | 'error' | 'rate_limit' | 'deploy' | 'spike';

const filterLabels: Record<ActivityFilter, string> = {
  all: 'Alle',
  error: 'Fehler',
  rate_limit: 'Rate-Limit',
  deploy: 'Deploy',
  spike: 'Spike',
};

function getActivityIcon(type: ActivityItem['type']) {
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

function getActivityColor(type: ActivityItem['type'], severity?: ActivityItem['severity']) {
  if (type === 'error') {
    if (severity === 'high') return 'text-error bg-error/10 border-error/20';
    if (severity === 'medium') return 'text-warning bg-warning/10 border-warning/20';
    return 'text-warning bg-warning/10 border-warning/20';
  }
  if (type === 'rate_limit') return 'text-warning bg-warning/10 border-warning/20';
  if (type === 'spike') return 'text-primary bg-primary/10 border-primary/20';
  return 'text-success bg-success/10 border-success/20';
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-card/[0.02] p-3" style={{ minHeight: '48px' }}>
          <div className="skeleton h-8 w-8 flex-shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
          <div className="skeleton h-6 w-20 flex-shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-white/5 bg-card/[0.01] p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-card/5">
        <FileQuestion className="h-6 w-6 text-text-muted" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-text">Keine Aktivitäten gefunden</p>
        <p className="mt-1 text-xs text-text-muted">
          Es sind keine Ereignisse für diesen Filter vorhanden.
        </p>
      </div>
    </div>
  );
}

export function ActivityList({ items, isLoading = false }: ActivityListProps) {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  return (
    <div className="panel p-0 overflow-hidden">
      <PanelHeader
        title="Aktivität & Incidents"
        subtitle="Letzte 24 Stunden"
        info="Zeigt alle wichtigen Ereignisse, Deployments und Fehler der letzten 24 Stunden"
      />

      <div className="px-5 py-4">
        {/* Filter Chips */}
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Aktivitätsfilter">
          {(Object.keys(filterLabels) as ActivityFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`h-6 rounded-full border px-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] motion-safe:duration-200 motion-reduce:transition-none ${
                activeFilter === filter
                  ? 'border-[rgb(var(--accent))]/50 bg-[rgb(var(--accent))]/20 text-text shadow-[0_0_8px_rgba(var(--accent),0.2)]'
                  : 'border-white/10 bg-card/5 text-text-muted hover:border-white/20 hover:bg-card/10'
              }`}
              aria-pressed={activeFilter === filter}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>

        {/* Feed */}
        {isLoading ? (
          <ActivitySkeleton />
        ) : (
          <div role="feed" aria-label="Aktivitäts-Feed" className="space-y-2">
            {filteredItems.length === 0 ? (
              <EmptyState />
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-card/[0.02] p-3 transition-all hover:border-white/10 hover:bg-card/5 motion-safe:duration-200 motion-reduce:transition-none"
                  style={{ height: '48px' }}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${getActivityColor(
                      item.type,
                      item.severity
                    )}`}
                  >
                    {getActivityIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">{item.title}</p>
                    {item.subtitle && (
                      <p className="mt-0.5 text-xs text-text-muted">{item.subtitle}</p>
                    )}
                  </div>

                  <time
                    dateTime={item.at}
                    className="flex-shrink-0 rounded-full border border-white/10 bg-card/5 px-2.5 py-1 text-xs font-medium text-text-muted"
                  >
                    {formatRelativeTime(item.at)}
                  </time>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
