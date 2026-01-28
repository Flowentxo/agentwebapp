'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  BarChart3,
} from 'lucide-react';
import {
  CostDataPoint,
  CostExplorerDimension,
  CostExplorerFilter,
  dimensions,
  formatCurrency,
  formatTimestampShort,
} from '@/lib/finops-terminal-data';

interface CostExplorerProps {
  data: CostDataPoint[];
  onDrillDown?: (dimension: string, value: string) => void;
}

export function CostExplorer({ data, onDrillDown }: CostExplorerProps) {
  const [selectedDimension, setSelectedDimension] = useState<string>('time');
  const [filters, setFilters] = useState<CostExplorerFilter[]>([]);
  const [expandedFilters, setExpandedFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Calculate totals and averages
  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.actual, 0);
    const average = total / data.length;
    const max = Math.max(...data.map((d) => d.actual));
    const budget = data[0]?.budget || 200;
    const overBudgetDays = data.filter((d) => d.actual > d.budget).length;

    return { total, average, max, budget, overBudgetDays };
  }, [data]);

  // Filter toggle
  const toggleFilter = (dimension: string) => {
    setExpandedFilters((prev) =>
      prev.includes(dimension)
        ? prev.filter((d) => d !== dimension)
        : [...prev, dimension]
    );
  };

  // Add filter
  const addFilter = (dimension: string, value: string, operator: 'include' | 'exclude') => {
    setFilters((prev) => {
      const existing = prev.find((f) => f.dimension === dimension);
      if (existing) {
        return prev.map((f) =>
          f.dimension === dimension
            ? { ...f, values: [...f.values, value] }
            : f
        );
      }
      return [...prev, { dimension, operator, values: [value] }];
    });
  };

  // Remove filter value
  const removeFilterValue = (dimension: string, value: string) => {
    setFilters((prev) =>
      prev
        .map((f) =>
          f.dimension === dimension
            ? { ...f, values: f.values.filter((v) => v !== value) }
            : f
        )
        .filter((f) => f.values.length > 0)
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload as CostDataPoint;
    if (!dataPoint) return null;

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl min-w-[200px]">
        <div className="text-xs text-zinc-400 mb-2">{label}</div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Actual</span>
            <span className="text-sm font-semibold text-zinc-100">
              {formatCurrency(dataPoint.actual)}
            </span>
          </div>

          {dataPoint.forecast && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">Forecast</span>
              <span className="text-sm font-semibold text-blue-400">
                {formatCurrency(dataPoint.forecast)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400">Budget</span>
            <span className="text-sm text-zinc-300">
              {formatCurrency(dataPoint.budget)}
            </span>
          </div>

          <div className="border-t border-zinc-700 mt-2 pt-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              By Model
            </div>
            {Object.entries(dataPoint.byModel)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([model, cost]) => (
                <div key={model} className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 truncate max-w-[100px]">{model}</span>
                  <span className="text-zinc-300">{formatCurrency(cost)}</span>
                </div>
              ))}
          </div>

          <div className="border-t border-zinc-700 mt-2 pt-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
              By Agent
            </div>
            {Object.entries(dataPoint.byAgent)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([agent, cost]) => (
                <div key={agent} className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">{agent}</span>
                  <span className="text-zinc-300">{formatCurrency(cost)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Filter Sidebar */}
      {showFilters && (
        <div className="w-52 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-300">Filters</span>
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          </div>

          {/* Active Filters */}
          {filters.length > 0 && (
            <div className="px-2 py-2 border-b border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                Active Filters
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.flatMap((f) =>
                  f.values.map((v) => (
                    <span
                      key={`${f.dimension}-${v}`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded ${
                        f.operator === 'exclude'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {f.operator === 'exclude' && '!'}
                      {v}
                      <button
                        onClick={() => removeFilterValue(f.dimension, v)}
                        className="hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Dimension List */}
          <div className="flex-1 overflow-y-auto">
            {/* Dimension Selector */}
            <div className="px-2 py-2 border-b border-zinc-800">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                Group By
              </div>
              <div className="space-y-0.5">
                {dimensions.map((dim) => (
                  <button
                    key={dim.id}
                    onClick={() => setSelectedDimension(dim.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${
                      selectedDimension === dim.id
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    {dim.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Dimensions */}
            <div className="py-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-3">
                Filter By
              </div>
              {dimensions.map((dim) => (
                <div key={dim.id} className="border-b border-zinc-800/50 last:border-0">
                  <button
                    onClick={() => toggleFilter(dim.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span>{dim.label}</span>
                    {expandedFilters.includes(dim.id) ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>

                  {expandedFilters.includes(dim.id) && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {dim.values.map((value) => {
                        const isIncluded = filters.some(
                          (f) =>
                            f.dimension === dim.id &&
                            f.operator === 'include' &&
                            f.values.includes(value)
                        );
                        const isExcluded = filters.some(
                          (f) =>
                            f.dimension === dim.id &&
                            f.operator === 'exclude' &&
                            f.values.includes(value)
                        );

                        return (
                          <div
                            key={value}
                            className="flex items-center justify-between px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 rounded group"
                          >
                            <span className="truncate">{value}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isIncluded && (
                                <button
                                  onClick={() => addFilter(dim.id, value, 'include')}
                                  className="p-0.5 hover:bg-blue-500/20 rounded text-blue-400"
                                  title="Include"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                              {!isExcluded && (
                                <button
                                  onClick={() => addFilter(dim.id, value, 'exclude')}
                                  className="p-0.5 hover:bg-red-500/20 rounded text-red-400"
                                  title="Exclude"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className="flex-1 flex flex-col">
        {/* Chart Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            {!showFilters && (
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 bg-zinc-800 rounded hover:bg-zinc-700 transition-colors"
              >
                <Filter className="w-3 h-3" />
                Filters
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-zinc-400">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500/40 border border-dashed border-blue-500" />
                <span className="text-[10px] text-zinc-400">Forecast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-amber-500/60" />
                <span className="text-[10px] text-zinc-400">Budget</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Total:</span>
              <span className="font-semibold text-zinc-200">{formatCurrency(stats.total)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Avg:</span>
              <span className="font-semibold text-zinc-200">{formatCurrency(stats.average)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Over Budget:</span>
              <span className={`font-semibold ${stats.overBudgetDays > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {stats.overBudgetDays} days
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
                interval="preserveStartEnd"
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={(value) => `$${value}`}
                width={50}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Budget Reference Line */}
              <ReferenceLine
                y={stats.budget}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />

              {/* Actual Cost Area */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorActual)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#3B82F6',
                  stroke: '#1E3A8A',
                  strokeWidth: 2,
                }}
              />

              {/* Forecast Line */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
