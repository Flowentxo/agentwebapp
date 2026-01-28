/**
 * MetricHUD - Key Performance Indicator Card
 *
 * A glassmorphic card for displaying important metrics with
 * sparkline visualizations and trend indicators.
 *
 * Part of the Deep Space Command Core design system.
 */

'use client';

import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';
type MetricColor = 'purple' | 'emerald' | 'amber' | 'blue' | 'cyan' | 'red';

interface MetricHUDProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  sparklineData?: number[];
  color?: MetricColor;
  subtitle?: string;
}

const colorConfig: Record<MetricColor, {
  iconBg: string;
  iconText: string;
  valueGlow: string;
  sparklineGradient: string;
  trendUp: string;
  trendDown: string;
}> = {
  purple: {
    iconBg: 'bg-neon-purple/10',
    iconText: 'text-neon-purple',
    valueGlow: 'glow-text-purple',
    sparklineGradient: 'from-neon-purple/20 to-transparent',
    trendUp: 'text-neon-emerald',
    trendDown: 'text-neon-red',
  },
  emerald: {
    iconBg: 'bg-neon-emerald/10',
    iconText: 'text-neon-emerald',
    valueGlow: 'glow-text-emerald',
    sparklineGradient: 'from-neon-emerald/20 to-transparent',
    trendUp: 'text-neon-emerald',
    trendDown: 'text-neon-red',
  },
  amber: {
    iconBg: 'bg-neon-amber/10',
    iconText: 'text-neon-amber',
    valueGlow: 'glow-text-amber',
    sparklineGradient: 'from-neon-amber/20 to-transparent',
    trendUp: 'text-neon-emerald',
    trendDown: 'text-neon-red',
  },
  blue: {
    iconBg: 'bg-neon-blue/10',
    iconText: 'text-neon-blue',
    valueGlow: 'glow-text-blue',
    sparklineGradient: 'from-neon-blue/20 to-transparent',
    trendUp: 'text-neon-emerald',
    trendDown: 'text-neon-red',
  },
  cyan: {
    iconBg: 'bg-neon-cyan/10',
    iconText: 'text-neon-cyan',
    valueGlow: 'glow-text-cyan',
    sparklineGradient: 'from-neon-cyan/20 to-transparent',
    trendUp: 'text-neon-emerald',
    trendDown: 'text-neon-red',
  },
  red: {
    iconBg: 'bg-neon-red/10',
    iconText: 'text-neon-red',
    valueGlow: 'glow-text-red',
    sparklineGradient: 'from-neon-red/20 to-transparent',
    trendUp: 'text-neon-emerald',
    trendDown: 'text-neon-red',
  },
};

/**
 * Generate SVG path for sparkline
 */
function generateSparklinePath(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  });

  return `M${points.join(' L')}`;
}

function MetricHUDComponent({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  sparklineData,
  color = 'purple',
  subtitle,
}: MetricHUDProps) {
  const config = colorConfig[color];

  // Generate sparkline path
  const sparklinePath = useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return null;
    return generateSparklinePath(sparklineData, 120, 40);
  }, [sparklineData]);

  // Trend icon
  const TrendIcon = trend?.direction === 'up'
    ? TrendingUp
    : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  return (
    <div className="glass-command-panel p-5 relative overflow-hidden group hover:border-white/12 transition-all duration-300">
      {/* Sparkline background */}
      {sparklinePath && (
        <div className="absolute bottom-0 right-0 w-32 h-12 opacity-50 pointer-events-none">
          <svg
            viewBox="0 0 120 40"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Gradient fill under the line */}
            <defs>
              <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--neon-${color}, currentColor)`} stopOpacity="0.3" />
                <stop offset="100%" stopColor={`var(--neon-${color}, currentColor)`} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path
              d={`${sparklinePath} L120,40 L0,40 Z`}
              fill={`url(#sparkline-gradient-${color})`}
            />
            {/* Line */}
            <path
              d={sparklinePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={config.iconText}
              style={{ opacity: 0.6 }}
            />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${config.iconBg}`}>
            <Icon className={`w-4 h-4 ${config.iconText}`} />
          </div>

          {/* Trend indicator */}
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend.direction === 'up' ? config.trendUp :
              trend.direction === 'down' ? config.trendDown :
              'text-muted-foreground'
            }`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Label */}
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold text-white ${config.valueGlow}`}>
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>

        {/* Subtitle / Trend label */}
        {(subtitle || trend?.label) && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {subtitle || trend?.label}
          </p>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
          bg-gradient-to-br ${config.sparklineGradient}
          pointer-events-none
        `}
      />
    </div>
  );
}

export const MetricHUD = memo(MetricHUDComponent);
export default MetricHUD;
