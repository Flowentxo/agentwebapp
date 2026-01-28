'use client';

import { lazy, Suspense } from 'react';
import { Activity, Zap, Coins } from 'lucide-react';

// Lazy load the donut chart
const HealthDonut = lazy(() =>
  import('./HealthDonut').then((mod) => ({ default: mod.HealthDonut }))
);

interface HealthCapacityProps {
  health: {
    ok: number;
    degraded: number;
    error: number;
  };
  rateLimit: {
    used: number;
    limit: number;
  };
  tokens: {
    today: number;
    week: number;
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace('.', ',')} Mio.`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace('.', ',')} Tsd.`;
  }
  return num.toString();
}

export function HealthCapacity({ health, rateLimit, tokens }: HealthCapacityProps) {
  const total = health.ok + health.degraded + health.error;
  const rateLimitPct = (rateLimit.used / rateLimit.limit) * 100;
  const tokenWeekPct = (tokens.today / tokens.week) * 100;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Health Distribution */}
      <div className="panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Gesamtzustand</h3>
            <p className="text-xs text-text-muted">Verteilung nach Status</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <Suspense
            fallback={
              <div className="h-32 w-32 animate-pulse rounded-full bg-card/5" />
            }
          >
            <HealthDonut health={health} />
          </Suspense>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm text-text">OK</span>
              </div>
              <span className="mono text-sm font-semibold text-text">
                {health.ok} ({total > 0 ? ((health.ok / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-sm text-text">Eingeschränkt</span>
              </div>
              <span className="mono text-sm font-semibold text-text">
                {health.degraded} (
                {total > 0 ? ((health.degraded / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-error" />
                <span className="text-sm text-text">Fehler</span>
              </div>
              <span className="mono text-sm font-semibold text-text">
                {health.error} ({total > 0 ? ((health.error / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Metrics */}
      <div className="panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-warning/10 p-2">
            <Zap className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Kapazität</h3>
            <p className="text-xs text-text-muted">Rate-Limit & Token-Budget</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Rate Limit */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text">Rate-Limit (heute)</span>
              <span className="mono text-sm font-semibold text-text">
                {formatNumber(rateLimit.used)} / {formatNumber(rateLimit.limit)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-card/5">
              <div
                className={`h-full rounded-full transition-all ${
                  rateLimitPct >= 90
                    ? 'bg-error'
                    : rateLimitPct >= 70
                    ? 'bg-warning'
                    : 'bg-success'
                }`}
                style={{ width: `${Math.min(rateLimitPct, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {rateLimitPct.toFixed(1).replace('.', ',')}% genutzt
            </p>
          </div>

          {/* Token Budget */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text">Token-Budget</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-card/5 p-3">
                <p className="text-xs text-text-muted">Heute</p>
                <p className="mono text-lg font-semibold text-text">
                  {formatNumber(tokens.today)}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-card/5 p-3">
                <p className="text-xs text-text-muted">7 Tage</p>
                <p className="mono text-lg font-semibold text-text">
                  {formatNumber(tokens.week)}
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs text-text-muted">
              {tokenWeekPct.toFixed(1).replace('.', ',')}% des Wochenbudgets heute genutzt
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
