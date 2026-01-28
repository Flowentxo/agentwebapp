'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  Star,
  FileText,
  Users,
  Heart,
  Zap,
  RefreshCw,
  AlertTriangle,
  PiggyBank,
  BarChart3,
} from 'lucide-react';

type MetricFormat = 'number' | 'currency' | 'percentage' | 'time' | 'rating';

interface MetricValue {
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface MetricConfig {
  key: string;
  label: string;
  icon: typeof TrendingUp;
  format: MetricFormat;
  color: string;
}

type AgentCategory = 'sales' | 'support' | 'marketing' | 'hr' | 'finance' | 'operations';

const CATEGORY_METRICS: Record<AgentCategory, MetricConfig[]> = {
  sales: [
    { key: 'leads_qualified', label: 'Leads qualifiziert', icon: Target, format: 'number', color: '#10B981' },
    { key: 'meetings_booked', label: 'Meetings gebucht', icon: Calendar, format: 'number', color: '#3B82F6' },
    { key: 'pipeline_value', label: 'Pipeline Value', icon: DollarSign, format: 'currency', color: '#F59E0B' },
    { key: 'response_time', label: 'Response Time', icon: Clock, format: 'time', color: '#8B5CF6' },
  ],
  support: [
    { key: 'tickets_solved', label: 'Tickets gelöst', icon: CheckCircle, format: 'number', color: '#10B981' },
    { key: 'avg_response_time', label: 'Ø Antwortzeit', icon: Clock, format: 'time', color: '#3B82F6' },
    { key: 'csat_score', label: 'CSAT Score', icon: Star, format: 'rating', color: '#F59E0B' },
    { key: 'escalations', label: 'Eskalationen', icon: AlertTriangle, format: 'number', color: '#EF4444' },
  ],
  marketing: [
    { key: 'posts_created', label: 'Posts erstellt', icon: FileText, format: 'number', color: '#8B5CF6' },
    { key: 'reach', label: 'Reach', icon: Users, format: 'number', color: '#3B82F6' },
    { key: 'engagement_rate', label: 'Engagement Rate', icon: Heart, format: 'percentage', color: '#EC4899' },
    { key: 'conversions', label: 'Conversions', icon: TrendingUp, format: 'number', color: '#10B981' },
  ],
  hr: [
    { key: 'applications_screened', label: 'Bewerbungen', icon: FileText, format: 'number', color: '#8B5CF6' },
    { key: 'interviews_scheduled', label: 'Interviews', icon: Calendar, format: 'number', color: '#3B82F6' },
    { key: 'time_to_hire', label: 'Time to Hire', icon: Clock, format: 'time', color: '#F59E0B' },
    { key: 'onboarding_completion', label: 'Onboarding', icon: CheckCircle, format: 'percentage', color: '#10B981' },
  ],
  finance: [
    { key: 'invoices_processed', label: 'Rechnungen', icon: FileText, format: 'number', color: '#8B5CF6' },
    { key: 'payments_received', label: 'Zahlungen', icon: DollarSign, format: 'currency', color: '#10B981' },
    { key: 'overdue_reduced', label: 'Überfällige -', icon: TrendingDown, format: 'percentage', color: '#3B82F6' },
    { key: 'cost_savings', label: 'Ersparnis', icon: PiggyBank, format: 'currency', color: '#F59E0B' },
  ],
  operations: [
    { key: 'processes_automated', label: 'Prozesse', icon: Zap, format: 'number', color: '#8B5CF6' },
    { key: 'data_synced', label: 'Daten sync.', icon: RefreshCw, format: 'number', color: '#3B82F6' },
    { key: 'errors_detected', label: 'Fehler erkannt', icon: AlertTriangle, format: 'number', color: '#F59E0B' },
    { key: 'efficiency_gain', label: 'Effizienz +', icon: TrendingUp, format: 'percentage', color: '#10B981' },
  ],
};

// Generate mock metrics data
function generateMockMetrics(): Record<string, MetricValue> {
  const allMetrics: Record<string, MetricValue> = {};

  Object.values(CATEGORY_METRICS).flat().forEach(metric => {
    const current = metric.format === 'currency'
      ? Math.floor(Math.random() * 50000) + 5000
      : metric.format === 'percentage'
      ? Math.floor(Math.random() * 30) + 70
      : metric.format === 'time'
      ? Math.floor(Math.random() * 10) + 1
      : metric.format === 'rating'
      ? Math.floor(Math.random() * 15 + 35) / 10
      : Math.floor(Math.random() * 200) + 20;

    const previous = current * (0.8 + Math.random() * 0.4);
    const change = ((current - previous) / previous) * 100;

    allMetrics[metric.key] = {
      current,
      previous,
      change,
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    };
  });

  return allMetrics;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Record<string, MetricValue>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Simulated active categories based on user's agents
  const activeCategories: AgentCategory[] = ['sales', 'support', 'operations'];

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setMetrics(generateMockMetrics());
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [period]);

  const relevantMetrics = useMemo(() => {
    return activeCategories.flatMap(category =>
      CATEGORY_METRICS[category].slice(0, 2) // Top 2 metrics per category
    );
  }, [activeCategories]);

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface rounded w-1/4" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-surface rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Performance</h2>
            <p className="text-sm text-text-muted">Übersicht deiner Agent-Leistungen</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-surface rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text hover:bg-surface-elevated'
              }`}
            >
              {p === '7d' ? '7 Tage' : p === '30d' ? '30 Tage' : '90 Tage'}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {relevantMetrics.map(config => {
            const data = metrics[config.key];
            return (
              <MetricCard
                key={config.key}
                config={config}
                data={data}
              />
            );
          })}
        </div>

        {/* Category Sections */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeCategories.map(category => (
            <CategorySection
              key={category}
              category={category}
              metrics={CATEGORY_METRICS[category]}
              data={metrics}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  config: MetricConfig;
  data?: MetricValue;
}

function MetricCard({ config, data }: MetricCardProps) {
  const Icon = config.icon;
  const formattedValue = formatMetricValue(data?.current, config.format);

  const changeColor = data?.trend === 'up'
    ? 'text-green-400'
    : data?.trend === 'down'
    ? 'text-red-400'
    : 'text-muted-foreground';

  const TrendIcon = data?.trend === 'up'
    ? TrendingUp
    : data?.trend === 'down'
    ? TrendingDown
    : Minus;

  return (
    <div className="p-4 bg-surface rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div
          className="p-1.5 rounded-md"
          style={{ background: `${config.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        {data && (
          <div className={`flex items-center gap-1 ${changeColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-xs font-medium">
              {Math.abs(data.change).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-text">{formattedValue}</p>
      <p className="text-xs text-text-muted mt-0.5">{config.label}</p>
    </div>
  );
}

interface CategorySectionProps {
  category: AgentCategory;
  metrics: MetricConfig[];
  data: Record<string, MetricValue>;
}

function CategorySection({ category, metrics, data }: CategorySectionProps) {
  const categoryLabels: Record<AgentCategory, string> = {
    sales: 'Vertrieb',
    support: 'Kundensupport',
    marketing: 'Marketing',
    hr: 'HR & Recruiting',
    finance: 'Finanzen',
    operations: 'Betrieb',
  };

  const categoryColors: Record<AgentCategory, string> = {
    sales: '#10B981',
    support: '#3B82F6',
    marketing: '#F59E0B',
    hr: '#EC4899',
    finance: '#06B6D4',
    operations: '#8B5CF6',
  };

  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        background: `${categoryColors[category]}08`,
        borderColor: `${categoryColors[category]}30`,
      }}
    >
      <h3
        className="text-sm font-semibold mb-3"
        style={{ color: categoryColors[category] }}
      >
        {categoryLabels[category]}
      </h3>
      <div className="space-y-2">
        {metrics.slice(0, 4).map(metric => {
          const value = data[metric.key];
          return (
            <div key={metric.key} className="flex items-center justify-between">
              <span className="text-sm text-text-muted">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">
                  {formatMetricValue(value?.current, metric.format)}
                </span>
                {value && (
                  <span className={`text-xs ${
                    value.trend === 'up' ? 'text-green-400' :
                    value.trend === 'down' ? 'text-red-400' :
                    'text-muted-foreground'
                  }`}>
                    {value.change > 0 ? '+' : ''}{value.change.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMetricValue(value: number | undefined, format: MetricFormat): string {
  if (value === undefined) return '-';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'time':
      if (value < 60) return `${Math.round(value)} Min`;
      return `${(value / 60).toFixed(1)}h`;
    case 'rating':
      return `${value.toFixed(1)}/5.0`;
    case 'number':
    default:
      return new Intl.NumberFormat('de-DE').format(Math.round(value));
  }
}
