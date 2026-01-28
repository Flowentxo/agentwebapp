/**
 * MODEL DISTRIBUTION CHART
 *
 * Donut chart showing AI model usage distribution.
 * Uses purple/blue/cyan palette with Deep Space styling.
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Cpu } from 'lucide-react';

interface ModelUsageData {
  model: string;
  provider: string;
  requestCount: number;
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  successRate: number;
}

interface ModelDistributionChartProps {
  data: ModelUsageData[];
  isLoading?: boolean;
}

// Deep Space color palette
const COLORS = [
  '#8b5cf6', // Purple (GPT-4)
  '#3b82f6', // Blue (GPT-3.5)
  '#06b6d4', // Cyan (Claude)
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

// Shorten model names for display
function shortenModelName(model: string): string {
  const mapping: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4-turbo-preview': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5',
    'gpt-3.5-turbo-0125': 'GPT-3.5',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
  };
  return mapping[model] || model;
}

// Custom tooltip
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-xl">
      <p className="text-sm font-semibold text-white mb-2">{data.displayName}</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-white/60">Requests:</span>
          <span className="text-white font-medium">{data.requestCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/60">Cost:</span>
          <span className="text-emerald-400 font-medium">${data.totalCost.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/60">Tokens:</span>
          <span className="text-white font-medium">{data.totalTokens.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/60">Avg Latency:</span>
          <span className="text-white font-medium">{data.avgResponseTime}ms</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/60">Success Rate:</span>
          <span className={`font-medium ${data.successRate >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {data.successRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Custom legend
function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-white/70">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ModelDistributionChart({ data, isLoading }: ModelDistributionChartProps) {
  // Calculate total requests for percentage
  const totalRequests = data.reduce((sum, item) => sum + item.requestCount, 0);

  // Transform data for chart
  const chartData = data.map((item, index) => ({
    ...item,
    displayName: shortenModelName(item.model),
    percentage: totalRequests > 0 ? ((item.requestCount / totalRequests) * 100).toFixed(1) : '0',
    color: COLORS[index % COLORS.length],
  }));

  if (isLoading) {
    return (
      <div className="glass-command-panel p-6 h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Model Usage</h3>
            <p className="text-xs text-white/50">Distribution by model</p>
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
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Model Usage</h3>
            <p className="text-xs text-white/50">Distribution by model</p>
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
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Cpu className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Model Usage</h3>
          <p className="text-xs text-white/50">
            {totalRequests.toLocaleString()} total requests
          </p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="requestCount"
              nameKey="displayName"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-30px' }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{chartData[0]?.percentage || 0}%</p>
          <p className="text-xs text-white/50">{chartData[0]?.displayName || 'Top Model'}</p>
        </div>
      </div>
    </div>
  );
}
