'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface StatusCounts {
  healthy: number;
  degraded: number;
  error: number;
}

interface StatusSummaryProps {
  counts: StatusCounts;
  activeFilters?: Array<'healthy' | 'degraded' | 'error'>;
  onToggleFilter: (status: 'healthy' | 'degraded' | 'error') => void;
}

export function StatusSummary({ counts, activeFilters = [], onToggleFilter }: StatusSummaryProps) {
  const totalAgents = counts.healthy + counts.degraded + counts.error;
  const hasProblems = counts.degraded > 0 || counts.error > 0;

  // Zero UI: If everything is optimal, show minimal badge
  if (!hasProblems) {
    return (
      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20 shadow-sm animate-pulse-once">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-text">All agents healthy</p>
          <p className="text-xs text-text-muted">{totalAgents} agent{totalAgents !== 1 ? 's' : ''} operational</p>
        </div>
      </div>
    );
  }

  // Show problem badges prominently when issues exist
  const problemItems = [
    {
      status: 'error' as const,
      label: 'Critical',
      count: counts.error,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      ringColor: 'ring-red-500/20',
    },
    {
      status: 'degraded' as const,
      label: 'Degraded',
      count: counts.degraded,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      ringColor: 'ring-amber-500/20',
    },
  ].filter(item => item.count > 0);

  // Show healthy count as subtle secondary badge
  const healthyItem = {
    status: 'healthy' as const,
    label: 'Healthy',
    count: counts.healthy,
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    ringColor: 'ring-green-500/20',
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Problem badges - Prominent */}
      {problemItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeFilters.includes(item.status);

        return (
          <button
            key={item.status}
            onClick={() => onToggleFilter(item.status)}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 motion-safe:duration-200 animate-fade-in-up ${
              isActive
                ? `${item.borderColor} ${item.bgColor} ${item.color} shadow-lg ${item.ringColor} ring-2 scale-105`
                : `${item.borderColor} ${item.bgColor} ${item.color} hover:scale-105 hover:shadow-lg`
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
            aria-pressed={isActive}
            aria-label={`Filter: ${item.label}, ${item.count} agent${item.count !== 1 ? 's' : ''}`}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bgColor} border ${item.borderColor}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium opacity-80">{item.label}</span>
              <span className="text-lg font-bold leading-none">{item.count}</span>
            </div>
          </button>
        );
      })}

      {/* Healthy badge - Subtle, secondary */}
      {counts.healthy > 0 && (
        <button
          onClick={() => onToggleFilter('healthy')}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20 motion-safe:duration-200 animate-fade-in-up ${
            activeFilters.includes('healthy')
              ? `${healthyItem.borderColor} ${healthyItem.bgColor} ${healthyItem.color}`
              : 'border-white/10 bg-card/5 text-text-muted hover:border-green-500/20 hover:bg-green-500/5'
          }`}
          style={{ animationDelay: `${problemItems.length * 0.1}s` }}
          aria-pressed={activeFilters.includes('healthy')}
          aria-label={`Filter: Healthy, ${counts.healthy} agent${counts.healthy !== 1 ? 's' : ''}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{counts.healthy} healthy</span>
        </button>
      )}
    </div>
  );
}
