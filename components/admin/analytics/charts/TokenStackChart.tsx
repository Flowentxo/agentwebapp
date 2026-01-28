/**
 * TOKEN STACK CHART
 *
 * Stacked bar chart showing prompt vs completion tokens per day.
 * Uses blue gradient palette with Deep Space styling.
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Zap } from 'lucide-react';

interface TokenUsageData {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface TokenStackChartProps {
  data: TokenUsageData[];
  isLoading?: boolean;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const prompt = payload.find((p: any) => p.dataKey === 'promptTokens')?.value || 0;
  const completion = payload.find((p: any) => p.dataKey === 'completionTokens')?.value || 0;
  const total = prompt + completion;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-cyan-400/80 mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded bg-indigo-600" />
          <span className="text-xs text-white/60">Prompt:</span>
          <span className="text-sm font-medium text-white">{prompt.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded bg-cyan-400" />
          <span className="text-xs text-white/60">Completion:</span>
          <span className="text-sm font-medium text-white">{completion.toLocaleString()}</span>
        </div>
        <div className="pt-1.5 mt-1.5 border-t border-white/10 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded bg-card/20" />
          <span className="text-xs text-white/60">Total:</span>
          <span className="text-sm font-bold text-amber-400">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Custom legend
function CustomLegend() {
  return (
    <div className="flex justify-center gap-6 mt-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-indigo-600" />
        <span className="text-xs text-white/70">Prompt Tokens</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-cyan-400" />
        <span className="text-xs text-white/70">Completion Tokens</span>
      </div>
    </div>
  );
}

// Format large numbers
function formatTokens(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export default function TokenStackChart({ data, isLoading }: TokenStackChartProps) {
  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    }),
  }));

  // Calculate totals
  const totalPrompt = data.reduce((sum, d) => sum + d.promptTokens, 0);
  const totalCompletion = data.reduce((sum, d) => sum + d.completionTokens, 0);

  if (isLoading) {
    return (
      <div className="glass-command-panel p-6 h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Token Usage</h3>
            <p className="text-xs text-white/50">Prompt vs Completion</p>
          </div>
        </div>
        <div className="h-[280px] animate-pulse bg-card/5 rounded-lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="glass-command-panel p-6 h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Token Usage</h3>
            <p className="text-xs text-white/50">Prompt vs Completion</p>
          </div>
        </div>
        <div className="h-[280px] flex items-center justify-center text-white/40">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-command-panel p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Token Usage</h3>
            <p className="text-xs text-white/50">Prompt vs Completion tokens</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white">{formatTokens(totalPrompt + totalCompletion)}</p>
          <p className="text-xs text-white/50">Total Tokens</p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
              tickFormatter={formatTokens}
              dx={-10}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar
              dataKey="promptTokens"
              stackId="tokens"
              fill="#4f46e5"
              radius={[0, 0, 0, 0]}
              name="Prompt Tokens"
            />
            <Bar
              dataKey="completionTokens"
              stackId="tokens"
              fill="#22d3ee"
              radius={[4, 4, 0, 0]}
              name="Completion Tokens"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend />
    </div>
  );
}
