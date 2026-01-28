'use client';

/**
 * ForecastChart - Phase 4: Enterprise Visualization
 *
 * Area Chart showing actual vs projected spending with:
 * - Solid blue gradient for actual (historical) data
 * - Dashed purple gradient for projected (future) data
 * - Reference line for budget limit
 * - Seamless transition at "today" point
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

export interface ForecastChartDataPoint {
  date: string;
  actual: number | null;
  projected: number | null;
  tokens: number | null;
  projectedTokens: number | null;
  limit: number | null;
  isToday: boolean;
  isFuture: boolean;
}

export interface ForecastChartProps {
  data: ForecastChartDataPoint[];
  budgetLimit?: number;
  projectedOverage?: number;
  trend?: 'increasing' | 'stable' | 'decreasing';
  confidenceScore?: number;
  isLoading?: boolean;
  height?: number;
  showTokens?: boolean;
  className?: string;
}

// =====================================================
// CUSTOM TOOLTIP
// =====================================================

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload as ForecastChartDataPoint;
  const isProjected = data?.isFuture;

  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">
        {format(parseISO(label), 'EEEE, d. MMMM yyyy', { locale: de })}
      </p>

      {data?.isToday && (
        <span className="inline-block px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full mb-2">
          Heute
        </span>
      )}

      <div className="space-y-1">
        {data?.actual !== null && !data?.isFuture && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Ist-Kosten:</span>
            <span className="text-sm font-semibold text-blue-400">
              ${data.actual.toFixed(2)}
            </span>
          </div>
        )}

        {data?.projected !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              {isProjected ? 'Prognose:' : 'Projektion:'}
            </span>
            <span className="text-sm font-semibold text-purple-400">
              ${data.projected.toFixed(2)}
            </span>
          </div>
        )}

        {data?.limit !== null && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
            <span className="text-xs text-muted-foreground">Budget-Limit:</span>
            <span className="text-sm font-medium text-amber-400">
              ${data.limit.toFixed(2)}
            </span>
          </div>
        )}

        {data?.tokens !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Tokens:</span>
            <span className="text-sm font-medium text-foreground/70">
              {data.tokens.toLocaleString('de-DE')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// =====================================================
// TREND INDICATOR
// =====================================================

const TrendIndicator = ({
  trend,
  confidenceScore,
}: {
  trend?: 'increasing' | 'stable' | 'decreasing';
  confidenceScore?: number;
}) => {
  const config = {
    increasing: {
      icon: TrendingUp,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Steigend',
    },
    stable: {
      icon: Minus,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      label: 'Stabil',
    },
    decreasing: {
      icon: TrendingDown,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      label: 'Fallend',
    },
  };

  const trendConfig = trend ? config[trend] : config.stable;
  const Icon = trendConfig.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${trendConfig.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${trendConfig.color}`} />
        <span className={`text-xs font-medium ${trendConfig.color}`}>
          {trendConfig.label}
        </span>
      </div>
      {confidenceScore !== undefined && (
        <span className="text-xs text-muted-foreground">
          {confidenceScore}% Konfidenz
        </span>
      )}
    </div>
  );
};

// =====================================================
// LOADING SKELETON
// =====================================================

const ChartSkeleton = ({ height }: { height: number }) => (
  <div
    className="w-full animate-pulse bg-muted/20 rounded-lg flex items-center justify-center"
    style={{ height }}
  >
    <div className="text-muted-foreground text-sm">Lade Prognose-Daten...</div>
  </div>
);

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  budgetLimit,
  projectedOverage = 0,
  trend,
  confidenceScore,
  isLoading = false,
  height = 350,
  showTokens = false,
  className = '',
}) => {
  // Format data for chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Find today's index for styling
    const todayIndex = data.findIndex((d) => d.isToday);

    return data.map((point, index) => ({
      ...point,
      dateFormatted: format(parseISO(point.date), 'd. MMM', { locale: de }),
      // For seamless transition, set projected = actual at today
      projected:
        index === todayIndex
          ? point.actual
          : index > todayIndex
          ? point.projected
          : null,
    }));
  }, [data]);

  // Calculate domain for Y axis
  const yDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];

    const allValues = chartData.flatMap((d) => [
      d.actual,
      d.projected,
      budgetLimit || 0,
    ]).filter((v): v is number => v !== null && v !== undefined);

    const max = Math.max(...allValues, 10);
    const padding = max * 0.1;

    return [0, Math.ceil(max + padding)];
  }, [chartData, budgetLimit]);

  // Find today's date for reference line
  const todayDate = useMemo(() => {
    const today = data.find((d) => d.isToday);
    return today?.date || null;
  }, [data]);

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-muted/10 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nicht genug Daten für die Prognose
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Mindestens 3 Tage Nutzungshistorie erforderlich
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header with Trend */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Kosten-Prognose
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ist-Kosten vs. Projektion
          </p>
        </div>
        <TrendIndicator trend={trend} confidenceScore={confidenceScore} />
      </div>

      {/* Overage Warning */}
      {projectedOverage > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">
            <span className="font-medium">Warnung:</span> Prognostizierte
            Budget-Überschreitung von{' '}
            <span className="font-semibold">${projectedOverage.toFixed(2)}</span>
          </p>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {/* Gradient Definitions */}
          <defs>
            {/* Actual (Blue Gradient) */}
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>

            {/* Projected (Purple Gradient) */}
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="dateFormatted"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            interval="preserveStartEnd"
            tickMargin={8}
          />

          <YAxis
            domain={yDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            tickFormatter={(value) => `$${value}`}
            width={50}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Budget Limit Reference Line */}
          {budgetLimit && budgetLimit > 0 && (
            <ReferenceLine
              y={budgetLimit}
              stroke="#F59E0B"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Limit: $${budgetLimit}`,
                position: 'right',
                fill: '#F59E0B',
                fontSize: 10,
              }}
            />
          )}

          {/* Today Reference Line */}
          {todayDate && (
            <ReferenceLine
              x={format(parseISO(todayDate), 'd. MMM', { locale: de })}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Heute',
                position: 'top',
                fill: 'rgba(255,255,255,0.5)',
                fontSize: 10,
              }}
            />
          )}

          {/* Actual Data Area (Solid) */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#actualGradient)"
            connectNulls={false}
            dot={false}
            activeDot={{
              r: 4,
              fill: '#3B82F6',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />

          {/* Projected Data Area (Dashed) */}
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeDasharray="5 3"
            fill="url(#projectedGradient)"
            connectNulls={true}
            dot={false}
            activeDot={{
              r: 4,
              fill: '#8B5CF6',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            content={({ payload }) => (
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-blue-500 rounded" />
                  <span className="text-xs text-muted-foreground">
                    Ist-Kosten
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-purple-500 rounded border-dashed" />
                  <span className="text-xs text-muted-foreground">
                    Prognose
                  </span>
                </div>
                {budgetLimit && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-amber-500 rounded" />
                    <span className="text-xs text-muted-foreground">
                      Budget-Limit
                    </span>
                  </div>
                )}
              </div>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
