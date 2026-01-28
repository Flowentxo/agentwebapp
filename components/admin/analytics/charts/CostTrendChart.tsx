/**
 * COST TREND CHART
 *
 * Area chart showing daily AI spending over time.
 * Uses emerald gradient fill with Deep Space styling.
 */

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { DollarSign } from 'lucide-react';

interface CostTrendData {
  date: string;
  cost: number;
  requests: number;
}

interface CostTrendChartProps {
  data: CostTrendData[];
  isLoading?: boolean;
}

// Custom tooltip with glassmorphism styling
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  const cost = payload[0]?.value || 0;
  const requests = payload[1]?.value || 0;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-cyan-400/80 mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-white/60">Cost:</span>
          <span className="text-sm font-bold text-emerald-400">${cost.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-white/60">Requests:</span>
          <span className="text-sm font-medium text-white">{requests.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function CostTrendChart({ data, isLoading }: CostTrendChartProps) {
  // Format date for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    }),
  }));

  if (isLoading) {
    return (
      <div className="glass-command-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Cost Trend</h3>
            <p className="text-xs text-white/50">Daily AI spending</p>
          </div>
        </div>
        <div className="h-[300px] animate-pulse bg-card/5 rounded-lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="glass-command-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Cost Trend</h3>
            <p className="text-xs text-white/50">Daily AI spending</p>
          </div>
        </div>
        <div className="h-[300px] flex items-center justify-center text-white/40">
          <p>No data available for selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-command-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/20">
          <DollarSign className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Cost Trend</h3>
          <p className="text-xs text-white/50">Daily AI spending over time</p>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
              dx={-10}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#costGradient)"
              dot={false}
              activeDot={{
                r: 6,
                fill: '#10b981',
                stroke: '#0a0a0a',
                strokeWidth: 2,
              }}
            />
            {/* Hidden area for requests (used in tooltip) */}
            <Area
              type="monotone"
              dataKey="requests"
              stroke="transparent"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
