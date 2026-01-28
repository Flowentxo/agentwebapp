'use client';

import { Activity, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PanelHeader } from '@/components/common/PanelHeader';
import { formatThousandsDE, formatPercentDE, formatMsToSecOneDecimal, formatTrendDE } from '@/lib/format/number';

interface KpiMetrics {
  requests24h: number;
  successPct24h: number;
  avgTimeSec24h: number;
  errorPct24h: number;
  trends: {
    requests: number;
    success: number;
    avgTime: number;
    error: number;
  };
}

interface KpiRowClassicProps {
  metrics: KpiMetrics;
  isLoading?: boolean;
}

interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: string;
  info: string;
  ariaLabel: string;
  onClick?: () => void;
  isLoading?: boolean;
}

function KpiCardSkeleton() {
  return (
    <div className="panel p-0 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="skeleton h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          </div>
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton mt-3 h-3 w-24 rounded" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, trend, icon, color, info, ariaLabel, onClick, isLoading }: KpiCardProps) {
  if (isLoading) {
    return <KpiCardSkeleton />;
  }

  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend >= 0 ? 'text-[rgb(var(--accent))]' : 'text-[oklch(70%_0.2_25)]';

  return (
    <button
      role="group"
      aria-label={ariaLabel}
      onClick={onClick}
      className="panel p-0 text-left transition-all hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(var(--accent),0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] motion-safe:duration-200 motion-reduce:transition-none"
    >
      <PanelHeader title={label} info={info} />
      <div className="px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
              {icon}
            </div>
            <p className="mono text-3xl font-semibold tracking-tight text-text md:text-4xl">
              {value}
            </p>
          </div>
          <div
            className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
              trend >= 0
                ? 'border-[rgb(var(--accent))]/20 bg-[rgb(var(--accent))]/10'
                : 'border-[oklch(70%_0.2_25)]/20 bg-[oklch(70%_0.2_25)]/10'
            } ${trendColor}`}
          >
            <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="mono">{formatTrendDE(trend)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-text-muted">ggü. gestern</p>
      </div>
    </button>
  );
}

export function KpiRowClassic({ metrics, isLoading = false }: KpiRowClassicProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Anfragen"
        value={formatThousandsDE(metrics.requests24h)}
        trend={metrics.trends.requests}
        icon={<Activity className="h-4 w-4 text-primary" />}
        color="bg-primary/10"
        info="Gesamtanzahl aller API-Anfragen in den letzten 24 Stunden"
        ariaLabel={`Anfragen letzte 24 Stunden: ${formatThousandsDE(metrics.requests24h)}, Trend ${formatTrendDE(metrics.trends.requests)} gegenüber gestern`}
        onClick={() => router.push('/agents?sort=requests&period=24h')}
        isLoading={isLoading}
      />

      <KpiCard
        label="Erfolgsrate"
        value={formatPercentDE(metrics.successPct24h)}
        trend={metrics.trends.success}
        icon={<CheckCircle2 className="h-4 w-4 text-success" />}
        color="bg-success/10"
        info="Prozentsatz erfolgreicher Anfragen (HTTP 2xx) in den letzten 24 Stunden"
        ariaLabel={`Erfolgsrate letzte 24 Stunden: ${formatPercentDE(metrics.successPct24h)}, Trend ${formatTrendDE(metrics.trends.success)} gegenüber gestern`}
        onClick={() => router.push('/agents?sort=success&period=24h')}
        isLoading={isLoading}
      />

      <KpiCard
        label="Ø Zeit"
        value={formatMsToSecOneDecimal(metrics.avgTimeSec24h * 1000)}
        trend={metrics.trends.avgTime}
        icon={<Clock className="h-4 w-4 text-warning" />}
        color="bg-warning/10"
        info="Durchschnittliche Antwortzeit aller Agents in den letzten 24 Stunden"
        ariaLabel={`Durchschnittliche Antwortzeit letzte 24 Stunden: ${formatMsToSecOneDecimal(metrics.avgTimeSec24h * 1000)}, Trend ${formatTrendDE(metrics.trends.avgTime)} gegenüber gestern`}
        onClick={() => router.push('/agents?sort=time&period=24h')}
        isLoading={isLoading}
      />

      <KpiCard
        label="Fehlerquote"
        value={formatPercentDE(metrics.errorPct24h)}
        trend={metrics.trends.error}
        icon={<AlertCircle className="h-4 w-4 text-error" />}
        color="bg-error/10"
        info="Prozentsatz fehlgeschlagener Anfragen (HTTP 4xx/5xx) in den letzten 24 Stunden"
        ariaLabel={`Fehlerquote letzte 24 Stunden: ${formatPercentDE(metrics.errorPct24h)}, Trend ${formatTrendDE(metrics.trends.error)} gegenüber gestern`}
        onClick={() => router.push('/agents?sort=errors&period=24h')}
        isLoading={isLoading}
      />
    </div>
  );
}
