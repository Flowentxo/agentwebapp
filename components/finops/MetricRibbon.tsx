'use client';

import { useState, useTransition } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Gauge,
  Shield,
  AlertTriangle,
  Calendar,
  Download,
  ChevronDown,
  Zap,
  Loader2,
} from 'lucide-react';
import {
  MetricRibbonData,
  DateRange,
  dateRanges,
  formatCurrency,
  formatPercentChange,
  getTrendColor,
  getTrendIcon,
} from '@/lib/finops-terminal-data';
import { optimizeAllUserThreads } from '@/actions/ai-optimization';
import { useToast } from '@/components/ui/toast';

interface MetricRibbonProps {
  data: MetricRibbonData;
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  onExport: () => void;
}

export function MetricRibbon({
  data,
  selectedRange,
  onRangeChange,
  onExport,
}: MetricRibbonProps) {
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { push: showToast } = useToast();

  const handleOptimizeContext = () => {
    startTransition(async () => {
      try {
        const result = await optimizeAllUserThreads();

        if (result.success && result.totalSavedTokens > 0) {
          const reductionPercent = Math.round((result.totalSavedTokens / (result.totalSavedTokens + 500)) * 100);
          showToast({
            title: 'Context Optimized!',
            description: `Compressed memory by ${reductionPercent}% across ${result.threadsOptimized} threads. Saved ~${result.totalCreditsSaved} Credits.`,
            variant: 'success',
            duration: 6000,
          });
        } else if (result.success) {
          showToast({
            title: 'Already Optimized',
            description: 'All conversation threads are already at optimal size.',
            variant: 'info',
            duration: 4000,
          });
        } else {
          showToast({
            title: 'Optimization Failed',
            description: result.errors[0] || 'Unable to compress context. Please try again.',
            variant: 'error',
            duration: 5000,
          });
        }
      } catch (error) {
        showToast({
          title: 'Error',
          description: 'An unexpected error occurred during optimization.',
          variant: 'error',
          duration: 5000,
        });
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      {/* Metric Cards */}
      <div className="flex items-center gap-2 flex-1">
        {/* Forecast */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50 min-w-[140px]">
          <div className={`p-1 rounded ${
            data.forecast.projection === 'over_budget'
              ? 'bg-red-500/10'
              : data.forecast.projection === 'under_budget'
                ? 'bg-emerald-500/10'
                : 'bg-blue-500/10'
          }`}>
            <TrendingUp className={`w-3.5 h-3.5 ${
              data.forecast.projection === 'over_budget'
                ? 'text-red-400'
                : data.forecast.projection === 'under_budget'
                  ? 'text-emerald-400'
                  : 'text-blue-400'
            }`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none">
              Forecast (EOM)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-zinc-100">
                {formatCurrency(data.forecast.value)}
              </span>
              <span className={`text-[10px] ${getTrendColor(data.forecast.trend)}`}>
                {getTrendIcon(data.forecast.trend)} {formatPercentChange(data.forecast.trend)}
              </span>
            </div>
          </div>
        </div>

        {/* Burn Rate */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50 min-w-[130px]">
          <div className="p-1 rounded bg-orange-500/10">
            <Gauge className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none">
              Burn Rate
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-zinc-100">
                ${data.burnRate.value.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-400">/hr</span>
              <span className={`text-[10px] ${getTrendColor(data.burnRate.trend, true)}`}>
                {getTrendIcon(data.burnRate.trend)} {formatPercentChange(Math.abs(data.burnRate.trend))}
              </span>
            </div>
          </div>
        </div>

        {/* Active Budgets */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50 min-w-[140px]">
          <div className="p-1 rounded bg-purple-500/10">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none">
              Active Policies
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-zinc-100">
                {data.activeBudgets.value}
              </span>
              <div className="flex items-center gap-0.5">
                <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  {data.activeBudgets.healthy}
                </span>
                {data.activeBudgets.warning > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    {data.activeBudgets.warning}
                  </span>
                )}
                {data.activeBudgets.critical > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400">
                    {data.activeBudgets.critical}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Anomalies */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border min-w-[120px] ${
          data.anomalies.count > 0
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-zinc-800/50 border-zinc-700/50'
        }`}>
          <div className={`p-1 rounded ${
            data.anomalies.count > 0 ? 'bg-amber-500/10' : 'bg-zinc-700/50'
          }`}>
            <AlertTriangle className={`w-3.5 h-3.5 ${
              data.anomalies.count > 0 ? 'text-amber-400' : 'text-zinc-500'
            }`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none">
              Anomalies
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-sm font-semibold ${
                data.anomalies.count > 0 ? 'text-amber-400' : 'text-zinc-100'
              }`}>
                {data.anomalies.count}
              </span>
              {data.anomalies.count > 0 && (
                <span className={`text-[9px] px-1 py-0.5 rounded ${
                  data.anomalies.severity === 'high'
                    ? 'bg-red-500/10 text-red-400'
                    : data.anomalies.severity === 'medium'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {data.anomalies.severity}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Date Range Picker */}
        <div className="relative">
          <button
            onClick={() => setIsRangeOpen(!isRangeOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-300">{selectedRange.label}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {isRangeOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsRangeOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-32 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
                {dateRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      onRangeChange(range);
                      setIsRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      selectedRange.value === range.value
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Optimize Context Button */}
        <button
          onClick={handleOptimizeContext}
          disabled={isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-purple-600 border border-blue-500/50 rounded hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-white" />
          )}
          <span className="text-white font-medium">
            {isPending ? 'Optimizing...' : 'Optimize Context'}
          </span>
        </button>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-300">Export</span>
        </button>
      </div>
    </div>
  );
}
