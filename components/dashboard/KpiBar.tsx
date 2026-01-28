'use client';

import { lazy, Suspense } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

// Lazy load charts for performance
const MiniSparkline = lazy(() =>
  import('./MiniSparkline').then((mod) => ({ default: mod.MiniSparkline }))
);

interface KpiMetrics {
  requests: number;
  successPct: number;
  avgTimeSec: number;
  errorPct: number;
}

interface KpiSeries {
  requests: Array<[number, number]>;
  success: Array<[number, number]>;
  avgTime: Array<[number, number]>;
  errors: Array<[number, number]>;
}

interface KpiBarProps {
  metrics: KpiMetrics;
  series: KpiSeries;
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

function formatPercent(pct: number): string {
  return `${pct.toFixed(1).replace('.', ',')} %`;
}

function formatSeconds(sec: number): string {
  return `${sec.toFixed(1).replace('.', ',')} s`;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  series: Array<[number, number]>;
  color: string;
  ariaLabel: string;
}

function KpiCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  series,
  color,
  ariaLabel,
}: KpiCardProps) {
  const trendIcon =
    trend === 'up' ? (
      <TrendingUp className="h-3.5 w-3.5" />
    ) : trend === 'down' ? (
      <TrendingDown className="h-3.5 w-3.5" />
    ) : null;

  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
      ? 'text-error'
      : 'text-text-muted';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="panel p-4 motion-safe:duration-200 motion-reduce:transition-none hover:border-white/20"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
          <div>
            <p className="text-xs text-text-muted">{label}</p>
            <p className="mono text-2xl font-semibold text-text">{value}</p>
          </div>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {trendIcon}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Mini Sparkline */}
      <Suspense fallback={<div className="h-12 w-full animate-pulse rounded bg-card/5" />}>
        <MiniSparkline data={series} color={color} />
      </Suspense>
    </div>
  );
}

export function KpiBar({ metrics, series }: KpiBarProps) {
  // Calculate trends (simplified - compare last value to first)
  const requestsTrend = series.requests.length > 1
    ? series.requests[series.requests.length - 1][1] > series.requests[0][1]
      ? 'up'
      : 'down'
    : 'neutral';

  const successTrend = series.success.length > 1
    ? series.success[series.success.length - 1][1] > series.success[0][1]
      ? 'up'
      : 'down'
    : 'neutral';

  const avgTimeTrend = series.avgTime.length > 1
    ? series.avgTime[series.avgTime.length - 1][1] < series.avgTime[0][1]
      ? 'up'
      : 'down'
    : 'neutral';

  const errorsTrend = series.errors.length > 1
    ? series.errors[series.errors.length - 1][1] < series.errors[0][1]
      ? 'up'
      : 'down'
    : 'neutral';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Anfragen (24h)"
        value={formatNumber(metrics.requests)}
        icon={<Activity className="h-5 w-5 text-primary" />}
        trend={requestsTrend}
        trendValue="+4%"
        series={series.requests}
        color="bg-primary/10"
        ariaLabel={`Anfragen letzte 24 Stunden ${formatNumber(metrics.requests)}`}
      />

      <KpiCard
        label="Erfolgsrate (24h)"
        value={formatPercent(metrics.successPct)}
        icon={<CheckCircle2 className="h-5 w-5 text-success" />}
        trend={successTrend}
        trendValue="+2%"
        series={series.success}
        color="bg-success/10"
        ariaLabel={`Erfolgsrate letzte 24 Stunden ${formatPercent(metrics.successPct)}`}
      />

      <KpiCard
        label="Ø Zeit (24h)"
        value={formatSeconds(metrics.avgTimeSec)}
        icon={<Clock className="h-5 w-5 text-warning" />}
        trend={avgTimeTrend}
        trendValue="-5%"
        series={series.avgTime}
        color="bg-warning/10"
        ariaLabel={`Durchschnittliche Zeit letzte 24 Stunden ${formatSeconds(metrics.avgTimeSec)}`}
      />

      <KpiCard
        label="Fehlerquote (24h)"
        value={formatPercent(metrics.errorPct)}
        icon={<AlertCircle className="h-5 w-5 text-error" />}
        trend={errorsTrend}
        trendValue="-1%"
        series={series.errors}
        color="bg-error/10"
        ariaLabel={`Fehlerquote letzte 24 Stunden ${formatPercent(metrics.errorPct)}`}
      />
    </div>
  );
}
