import { TrendingUp, TrendingDown, Clock, Activity, CheckCircle, AlertTriangle, OctagonX } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { track } from '@/lib/telemetry';
import { formatNumber as formatNumberDE, formatPercent, formatSeconds } from '@/lib/format-de';

interface AgentCardProps {
  name: string;
  description: string;
  requests: number;
  successPct: number;
  avgTimeSec: number;
  tags: string[];
  status: 'healthy' | 'degraded' | 'error';
  trend?: string;
  onOpen: (name: string) => void;
}

// Format large numbers (4567 → 4,6k) with German locale
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${formatNumberDE(num / 1000000, 1)} M`;
  if (num >= 1000) return `${formatNumberDE(num / 1000, 1)} k`;
  return formatNumberDE(num);
};

// Status colors + labels + icons
const statusConfig = {
  healthy: {
    dot: 'bg-success',
    label: 'OK',
    icon: CheckCircle,
    ariaLabel: 'Status: OK'
  },
  degraded: {
    dot: 'bg-warning',
    label: 'Eingeschränkt',
    icon: AlertTriangle,
    ariaLabel: 'Status: Eingeschränkt'
  },
  error: {
    dot: 'bg-error',
    label: 'Fehler',
    icon: OctagonX,
    ariaLabel: 'Status: Fehler'
  },
};

// Success percentage to variant
const getSuccessVariant = (pct: number) => {
  if (pct >= 95) return 'success';
  if (pct >= 80) return 'warning';
  return 'error';
};

export function AgentCard({
  name,
  description,
  requests,
  successPct,
  avgTimeSec,
  tags,
  status,
  trend,
  onOpen,
}: AgentCardProps) {
  const statusCfg = statusConfig[status];
  const successVariant = getSuccessVariant(successPct);
  const StatusIcon = statusCfg.icon;

  // URL slug for native link navigation
  const slug = `/agents/${name.toLowerCase()}`;

  // Handle navigation with analytics/tracking support
  const handleNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    track('agent_open', {
      agent: name,
      status,
      requests,
      successPct,
      avgTimeSec,
      source: (e.target as HTMLElement).tagName === 'A' ? 'cta_button' : 'card_overlay',
    });
    onOpen(name);
  };

  return (
    <article
      className={`
        group relative rounded-2xl border border-border bg-card p-6
        transition-all duration-200
        hover-lift
      `}
      aria-labelledby={`agent-${name}`}
      aria-describedby={`agent-desc-${name}`}
    >
      {/* Invisible full-card link for better UX (right-click, open in new tab) */}
      <a
        href={slug}
        onClick={handleNavigate}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-labelledby={`agent-${name}`}
        aria-describedby={`agent-desc-${name}`}
        tabIndex={0}
      >
        <span className="sr-only">Details zu {name} öffnen</span>
      </a>

      {/* Header: Status + Name + Trend */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {/* Status mit Dot + Icon + Text (farbfehlsichtig tauglich) */}
          <div className="flex items-center gap-1.5" aria-label={statusCfg.ariaLabel}>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${statusCfg.dot}`}
              aria-hidden="true"
            />
            <StatusIcon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
              {statusCfg.label}
            </span>
          </div>
        </div>
        <h3
          id={`agent-${name}`}
          className="text-lg font-semibold text-text leading-tight flex-1 ml-2"
        >
          {name}
        </h3>
        {trend && (
          <span
            className={`
              flex items-center gap-1 text-sm font-medium whitespace-nowrap
              ${trend.startsWith('+') ? 'text-success' : 'text-error'}
            `}
            aria-label={`Trend: ${trend}`}
          >
            {trend.startsWith('+') ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend}
          </span>
        )}
      </div>

      {/* Description */}
      <p
        id={`agent-desc-${name}`}
        className="relative z-10 text-sm text-text-muted leading-relaxed mb-5 line-clamp-2"
      >
        {description}
      </p>

      {/* Metrics Row with Accessible Tooltips */}
      <div className="relative z-10 flex items-center gap-4 mb-5 pb-5 border-b border-border">
        {/* 1. Anfragen (Large) */}
        <Tooltip label="Anzahl bearbeiteter Anfragen im ausgewählten Zeitraum">
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted min-w-[80px]">
            <Activity className="h-4 w-4 text-text-subtle mb-1" aria-hidden="true" />
            <span className="text-2xl font-bold text-text tabular-nums">
              {formatNumber(requests)}
            </span>
            <span className="text-xs text-text-subtle uppercase tracking-wide">
              Anfragen
            </span>
          </div>
        </Tooltip>

        {/* 2. Erfolgsrate (Progress Bar) */}
        <Tooltip label="Anteil erfolgreicher Antworten in den letzten 7 Tagen">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-text-subtle uppercase tracking-wide">
                Erfolgsrate
              </span>
              <span
                className={`text-lg font-semibold tabular-nums ${
                  successVariant === 'success'
                    ? 'text-success'
                    : successVariant === 'warning'
                    ? 'text-warning'
                    : 'text-error'
                }`}
              >
                {formatPercent(successPct, 1)}
              </span>
            </div>
            {/* Progress Bar with SR-only label */}
            <div
              className="h-2 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={successPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="sr-only">Erfolgsrate {formatPercent(successPct, 1)}</span>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  successVariant === 'success'
                    ? 'bg-success'
                    : successVariant === 'warning'
                    ? 'bg-warning'
                    : 'bg-error'
                }`}
                style={{ width: `${successPct}%` }}
              />
            </div>
          </div>
        </Tooltip>

        {/* 3. Ø Zeit (Pill) */}
        <Tooltip label="Durchschnittliche Antwortzeit pro Anfrage">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted">
            <Clock className="h-3.5 w-3.5 text-text-subtle" aria-hidden="true" />
            <span className="text-sm font-medium text-text tabular-nums">
              {formatSeconds(avgTimeSec, 1)}
            </span>
            <span className="text-xs text-text-subtle">Ø Zeit</span>
          </div>
        </Tooltip>
      </div>

      {/* Tags */}
      <div className="relative z-10 flex flex-wrap gap-2 mb-5">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-text-muted border border-border"
          >
            #{tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-text-subtle">
            +{tags.length - 3} mehr
          </span>
        )}
      </div>

      {/* CTA Button (native link, elevated z-index to stay above invisible link) */}
      <a
        href={slug}
        onClick={handleNavigate}
        className={`
          relative z-10 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
          bg-primary text-primary-foreground font-medium text-sm
          transition-all duration-150
          hover:bg-primary-hover hover:shadow-md
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card
          active:scale-[0.98]
        `}
        aria-label={`Details zu ${name} öffnen`}
      >
        Details öffnen
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}
