/**
 * LATENCY PERCENTILES CHART
 *
 * Line chart showing p50, p90, p99 latency percentiles over time.
 * Uses gradient lines with Deep Space styling.
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Timer } from 'lucide-react';

interface LatencyPercentileData {
  date: string;
  p50: number;
  p90: number;
  p99: number;
  avg: number;
}

interface LatencyChartProps {
  data: LatencyPercentileData[];
  isLoading?: boolean;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-cyan-400/80 mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.stroke }}
            />
            <span className="text-xs text-white/60">{entry.name}:</span>
            <span className="text-sm font-medium text-white">
              {entry.value.toLocaleString()}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom legend
function CustomLegend() {
  return (
    <div className="flex justify-center gap-4 mt-4">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-0.5 bg-emerald-400 rounded" />
        <span className="text-xs text-white/70">p50 (Median)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-0.5 bg-amber-400 rounded" />
        <span className="text-xs text-white/70">p90</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-0.5 bg-red-400 rounded" />
        <span className="text-xs text-white/70">p99</span>
      </div>
    </div>
  );
}

export default function LatencyChart({ data, isLoading }: LatencyChartProps) {
  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    }),
  }));

  // Calculate averages for summary
  const avgP50 = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.p50, 0) / data.length)
    : 0;
  const avgP99 = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.p99, 0) / data.length)
    : 0;

  if (isLoading) {
    return (
      <div className="glass-command-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Timer className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Latency Percentiles</h3>
            <p className="text-xs text-white/50">Response time distribution</p>
          </div>
        </div>
        <div className="h-[250px] animate-pulse bg-card/5 rounded-lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="glass-command-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Timer className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Latency Percentiles</h3>
            <p className="text-xs text-white/50">Response time distribution</p>
          </div>
        </div>
        <div className="h-[250px] flex items-center justify-center text-white/40">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-command-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Timer className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Latency Percentiles</h3>
            <p className="text-xs text-white/50">Response time distribution</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-lg font-bold text-emerald-400">{avgP50}ms</p>
            <p className="text-xs text-white/50">Avg p50</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{avgP99}ms</p>
            <p className="text-xs text-white/50">Avg p99</p>
          </div>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
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
              tickFormatter={(value) => `${value}ms`}
              dx={-10}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="p50"
              name="p50"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', stroke: '#030712', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="p90"
              name="p90"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b', stroke: '#030712', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="p99"
              name="p99"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444', stroke: '#030712', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend />
    </div>
  );
}
