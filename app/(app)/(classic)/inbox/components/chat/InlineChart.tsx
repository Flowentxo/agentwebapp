'use client';

/**
 * Glass Cockpit - Inline Chart
 * Renders Chart.js charts directly in the chat stream.
 * Used when Dexter's render_chart tool returns chart_config.
 */

import { memo, useMemo, useRef, useEffect } from 'react';
import { BarChart3, TrendingUp, Maximize2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ToolCallData {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    success?: boolean;
    data?: {
      chart_config?: {
        type: string;
        data: { labels: string[]; datasets: any[] };
        options?: Record<string, any>;
      };
      title?: string;
      summary?: string;
    };
  };
}

interface InlineChartProps {
  tool: ToolCallData;
}

// Dark theme overrides for Chart.js
const DARK_THEME_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#A1A1AA', // zinc-400
        font: { size: 11 },
      },
    },
    title: {
      color: '#E4E4E7', // zinc-200
      font: { size: 14, weight: 'bold' as const },
    },
    tooltip: {
      backgroundColor: '#18181B', // zinc-900
      titleColor: '#FAFAFA', // zinc-50
      bodyColor: '#D4D4D8', // zinc-300
      borderColor: '#3F3F46', // zinc-700
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#71717A' }, // zinc-500
      grid: { color: '#27272A' }, // zinc-800
    },
    y: {
      ticks: { color: '#71717A' },
      grid: { color: '#27272A' },
    },
  },
};

function InlineChartComponent({ tool }: InlineChartProps) {
  const config = tool.result?.data?.chart_config;
  if (!config) return null;

  const chartType = config.type || 'bar';
  const title = tool.result?.data?.title || config.options?.plugins?.title?.text || 'Chart';
  const summary = tool.result?.data?.summary;

  // Merge dark theme options with chart config options
  const mergedOptions = useMemo(() => {
    const opts = { ...DARK_THEME_OPTIONS };
    if (config.options) {
      // Preserve chart-specific options but apply dark theme
      if (config.options.plugins?.title?.text) {
        (opts.plugins.title as any).display = true;
        (opts.plugins.title as any).text = config.options.plugins.title.text;
      }
      if (config.options.plugins?.legend?.display === false) {
        (opts.plugins.legend as any).display = false;
      }
      if (config.options.scales?.x?.stacked) {
        (opts.scales.x as any).stacked = true;
      }
      if (config.options.scales?.y?.stacked) {
        (opts.scales.y as any).stacked = true;
      }
      if (config.options.scales?.y?.beginAtZero) {
        (opts.scales.y as any).beginAtZero = true;
      }
    }
    // Strip scales for pie/doughnut
    if (chartType === 'pie' || chartType === 'doughnut') {
      return { ...opts, scales: undefined };
    }
    return opts;
  }, [config.options, chartType]);

  // Sanitize the chart data - remove any function strings from callbacks
  const chartData = useMemo(() => {
    return {
      labels: config.data.labels,
      datasets: config.data.datasets.map((ds: any) => ({
        ...ds,
        // Ensure colors have some opacity for dark backgrounds
        borderWidth: ds.borderWidth || 2,
      })),
    };
  }, [config.data]);

  const ChartComponent = useMemo(() => {
    switch (chartType) {
      case 'line':
        return Line;
      case 'pie':
        return Pie;
      case 'doughnut':
        return Doughnut;
      case 'bar':
      default:
        return Bar;
    }
  }, [chartType]);

  return (
    <div className="mt-2 rounded-xl overflow-hidden bg-zinc-900/80 border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/40 border-b border-white/5">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-semibold text-zinc-200">{title}</span>
        <span className="ml-auto text-[10px] text-zinc-500 uppercase">{chartType}</span>
      </div>

      {/* Chart Canvas */}
      <div className="px-4 py-3" style={{ height: '280px' }}>
        <ChartComponent
          data={chartData}
          options={mergedOptions as any}
        />
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-[11px] text-zinc-500">{summary}</p>
        </div>
      )}
    </div>
  );
}

export const InlineChart = memo(InlineChartComponent);
