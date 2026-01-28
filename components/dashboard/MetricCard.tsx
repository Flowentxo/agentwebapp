'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  Coins,
  Heart,
  ListTodo,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AgentCostBreakdown } from './types';
import {
  useTokenHistory,
  useTokenUsage,
  usePendingJobs,
  type TokenUsageDataPoint,
} from '@/store/useDashboardStore';

// ============================================================================
// TYPES
// ============================================================================

interface MetricCardProps {
  id: string;
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  expandable?: boolean;
  details?: AgentCostBreakdown[];
  index?: number;
  isLoading?: boolean;
  showSparkline?: boolean; // Show token history sparkline
  sparklineColor?: string; // Color for sparkline
  useStore?: boolean; // Use Zustand store for real-time data
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className}`} />
  );
}

// ============================================================================
// TREND INDICATOR
// ============================================================================

function TrendIndicator({ trend, value }: { trend?: 'up' | 'down' | 'neutral'; value?: string }) {
  if (!trend || !value) return null;

  const config = {
    up: { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
    down: { icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
    neutral: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  const { icon: Icon, color, bg } = config[trend];

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${bg}`}>
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={`text-[10px] font-medium ${color}`}>{value}</span>
    </div>
  );
}

// ============================================================================
// SPARKLINE CHART COMPONENT
// ============================================================================

interface SparklineChartProps {
  data: TokenUsageDataPoint[];
  color?: string;
  height?: number;
}

function SparklineChart({ data, color = '#14B8A6', height = 60 }: SparklineChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const frame = requestAnimationFrame(() => {
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        setIsMounted(true);
      } else {
        // Fallback with delay
        setTimeout(() => setIsMounted(true), 100);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none"
      style={{ minHeight: 50, minWidth: 50 }}
    >
      {isMounted && (
        <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="tokens"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#sparklineGradient)"
            isAnimationActive={true}
            animationDuration={1000}
          />
        </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ============================================================================
// DETAILED CHART POPUP FOR TOKEN USAGE
// ============================================================================

interface TokenChartPopupProps {
  data: TokenUsageDataPoint[];
  isOpen: boolean;
  onClose: () => void;
}

function TokenChartPopup({ data, isOpen, onClose }: TokenChartPopupProps) {
  const [chartReady, setChartReady] = useState(false);
  const totalTokens = data.reduce((sum, d) => sum + d.tokens, 0);
  const totalCost = data.reduce((sum, d) => sum + d.cost, 0);
  const avgTokens = Math.round(totalTokens / data.length);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setChartReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setChartReady(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50 min-w-[320px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                <h4 className="text-sm font-semibold text-foreground">7-Day Token Usage</h4>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chart */}
            <div className="p-4 h-[200px]" style={{ minHeight: 200, minWidth: 280 }}>
              {chartReady && (
                <ResponsiveContainer width="100%" height="100%" minHeight={180} minWidth={260}>
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        padding: '8px 12px',
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '11px', marginBottom: '4px' }}
                      formatter={(value: number) => [`${value.toLocaleString()} tokens`, 'Usage']}
                    />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      fill="url(#tokenGradient)"
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Stats Footer */}
            <div className="p-4 border-t border-border bg-muted/30 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total (7d)</p>
                <p className="text-sm font-semibold text-foreground">{(totalTokens / 1000).toFixed(1)}K</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-xs text-muted-foreground mb-1">Daily Avg</p>
                <p className="text-sm font-semibold text-foreground">{(avgTokens / 1000).toFixed(1)}K</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Cost (7d)</p>
                <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// COST BREAKDOWN POPUP
// ============================================================================

interface CostBreakdownPopupProps {
  details: AgentCostBreakdown[];
  isOpen: boolean;
  onClose: () => void;
}

function CostBreakdownPopup({ details, isOpen, onClose }: CostBreakdownPopupProps) {
  const totalTokens = details.reduce((sum, d) => sum + d.tokens, 0);
  const totalCost = details.reduce((sum, d) => sum + d.cost, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                <h4 className="text-sm font-semibold text-foreground">Cost Breakdown by Agent</h4>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Agent List */}
            <div className="p-3 space-y-2">
              {details.map((agent, index) => (
                <motion.div
                  key={agent.agentId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border"
                    style={{
                      backgroundColor: `${agent.agentColor}15`,
                      borderColor: `${agent.agentColor}30`,
                    }}
                  >
                    <Bot className="w-4 h-4" style={{ color: agent.agentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{agent.agentName}</p>
                    <p className="text-xs text-muted-foreground">{agent.tokens.toLocaleString()} tokens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">${agent.cost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{agent.percentage.toFixed(1)}%</p>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: agent.agentColor }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer Totals */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total (24h)</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {totalTokens.toLocaleString()} tokens
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN METRIC CARD COMPONENT - Premium Glass Design
// ============================================================================

export function MetricCard({
  id,
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  trend,
  trendValue,
  expandable = false,
  details,
  index = 0,
  isLoading = false,
  showSparkline = false,
  sparklineColor = '#14B8A6',
  useStore = false,
}: MetricCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use stable scalar selectors instead of getStats() to avoid infinite loops
  const tokenHistory = useTokenHistory();
  const storeTokenUsage = useTokenUsage();
  const storePendingJobs = usePendingJobs();

  // Dynamic value from store when useStore is true and it's the token-usage card
  const displayValue = useMemo(() => {
    if (useStore && id === 'token-usage') {
      const tokens = storeTokenUsage;
      if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
      if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
      return tokens.toString();
    }
    return value;
  }, [useStore, id, storeTokenUsage, value]);

  // Dynamic pending jobs from store
  const displayPendingJobs = useMemo(() => {
    if (useStore && id === 'pending-jobs') {
      return storePendingJobs;
    }
    return value;
  }, [useStore, id, storePendingJobs, value]);

  const finalValue = id === 'pending-jobs' ? displayPendingJobs : displayValue;

  const handleClick = useCallback(() => {
    if (expandable && (details?.length || showSparkline)) {
      setIsExpanded(prev => !prev);
    }
  }, [expandable, details, showSparkline]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
      className={`
        relative p-6 rounded-xl overflow-hidden transition-all duration-300 group
        bg-white dark:bg-zinc-900/40
        dark:backdrop-blur-xl
        border border-gray-200 dark:border-white/[0.06]
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
        dark:ring-1 dark:ring-inset dark:ring-white/[0.02]
        ${expandable
          ? 'cursor-pointer hover:border-primary/30 dark:hover:border-primary/20 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_40px_rgba(139,92,246,0.12)] dark:hover:ring-primary/10'
          : 'hover:border-gray-300 dark:hover:border-white/10 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
        }
      `}
      onClick={handleClick}
    >
      {/* Subtle gradient overlay for depth - only in dark mode */}
      <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Background Sparkline */}
      {showSparkline && tokenHistory.length > 0 && (
        <SparklineChart data={tokenHistory} color={sparklineColor} />
      )}

      {/* Header - Icon and expand button */}
      <div className="relative flex items-start justify-between z-10">
        <div
          className={`p-2.5 rounded-xl w-fit transition-all duration-300
            ${bgColor} border ${borderColor}
            group-hover:scale-105 group-hover:shadow-lg
          `}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {expandable && (details?.length || showSparkline) && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="p-1.5 rounded-lg bg-white/[0.04] text-muted-foreground
              group-hover:text-primary group-hover:bg-primary/10 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        )}
      </div>

      {/* Content - LARGE Numbers */}
      <div className="relative mt-5 z-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-muted-foreground/80 mb-1">
          {label}
        </p>
        {isLoading ? (
          <SkeletonLoader className="h-10 w-28 mt-1" />
        ) : (
          <div className="flex items-baseline gap-3">
            {/* LARGE KPI Number - The star of the show */}
            <p className="text-3xl font-black text-gray-900 dark:text-foreground tabular-nums tracking-tight
              group-hover:text-gray-700 dark:group-hover:text-white transition-colors duration-200">
              {finalValue}
            </p>
            <TrendIndicator trend={trend} value={trendValue} />
          </div>
        )}
      </div>

      {/* Expandable Hint - More subtle */}
      {expandable && !isExpanded && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative mt-3 text-[10px] font-medium text-zinc-500 dark:text-white/30
            opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          {showSparkline ? 'Click for 7-day trend' : 'Click for breakdown'}
        </motion.p>
      )}

      {/* Token Chart Popup (for sparkline cards) */}
      {expandable && showSparkline && (
        <TokenChartPopup
          data={tokenHistory}
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
        />
      )}

      {/* Cost Breakdown Popup (for agent cost cards) */}
      {expandable && details && !showSparkline && (
        <CostBreakdownPopup
          details={details}
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
        />
      )}
    </motion.div>
  );
}

export default MetricCard;
