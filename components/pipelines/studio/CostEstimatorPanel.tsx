'use client';

/**
 * CostEstimatorPanel Component
 *
 * Pre-flight cost estimator panel for pipeline studio sidebar
 * Shows estimated costs per run and projected monthly costs
 */

import { useMemo } from 'react';
import { Node } from 'reactflow';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Info,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  calculatePipelineCost,
  COST_TIERS,
  type CostTier,
  type PipelineCostSummary,
} from '../nodes/NodeCostBadge';

// =====================================================
// TYPES
// =====================================================

interface ScheduleConfig {
  enabled: boolean;
  cron?: string;
  runsPerMonth?: number;
}

interface CostEstimatorPanelProps {
  nodes: Node[];
  schedule?: ScheduleConfig;
  userBudget?: number; // Monthly budget limit in USD
  className?: string;
}

// =====================================================
// CRON PARSER (simplified)
// =====================================================

function estimateMonthlyRuns(cron?: string): number {
  if (!cron) return 0;

  // Very simplified cron parsing
  const parts = cron.split(' ');
  if (parts.length < 5) return 30; // Default daily

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every minute
  if (minute === '*' && hour === '*') return 43200; // 60 * 24 * 30

  // Every hour
  if (minute !== '*' && hour === '*') return 720; // 24 * 30

  // Every day
  if (hour !== '*' && dayOfMonth === '*' && dayOfWeek === '*') return 30;

  // Weekly (specific day of week)
  if (dayOfWeek !== '*' && dayOfWeek !== '?') {
    const days = dayOfWeek.split(',').length;
    return days * 4; // ~4 weeks per month
  }

  // Monthly (specific day of month)
  if (dayOfMonth !== '*') {
    const days = dayOfMonth.split(',').length;
    return days;
  }

  return 30; // Default
}

// =====================================================
// COMPONENTS
// =====================================================

function TierBadge({ tier, count }: { tier: CostTier; count: number }) {
  if (count === 0) return null;

  const config = COST_TIERS[tier];

  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${config.bgColor} ${config.borderColor} ${config.color}
        border
      `}
    >
      <span>{config.dollarSigns || 'Free'}</span>
      <span className="opacity-70">×{count}</span>
    </div>
  );
}

function CostBreakdownRow({
  label,
  value,
  subValue,
  warning,
  icon: Icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  warning?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            size={14}
            className={warning ? 'text-red-400' : 'text-muted-foreground'}
          />
        )}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <span
          className={`text-sm font-semibold ${warning ? 'text-red-400' : 'text-white'}`}
        >
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-muted-foreground ml-1">({subValue})</span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function CostEstimatorPanel({
  nodes,
  schedule,
  userBudget = 50, // Default $50/month
  className = '',
}: CostEstimatorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate costs
  const costSummary = useMemo<PipelineCostSummary>(() => {
    return calculatePipelineCost(nodes);
  }, [nodes]);

  // Calculate monthly projection
  const monthlyProjection = useMemo(() => {
    const runsPerMonth = schedule?.enabled
      ? (schedule.runsPerMonth || estimateMonthlyRuns(schedule.cron))
      : 0;

    const projectedCost = costSummary.avgCostPerRun * runsPerMonth;
    const exceedsBudget = projectedCost > userBudget;
    const budgetPercentage = userBudget > 0 ? (projectedCost / userBudget) * 100 : 0;

    return {
      runsPerMonth,
      projectedCost,
      exceedsBudget,
      budgetPercentage,
    };
  }, [costSummary, schedule, userBudget]);

  // Format currency
  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  if (nodes.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign size={16} />
          <span className="text-sm">Add nodes to see cost estimate</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t border-white/10 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-card/5 transition"
      >
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-white">Cost Estimator</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-400">
            {formatCost(costSummary.avgCostPerRun)}/run
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Per-Run Cost */}
          <div className="p-3 rounded-lg bg-gray-800/50 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Cost per Run
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {formatCost(costSummary.avgCostPerRun)}
              </span>
              <span className="text-xs text-muted-foreground">
                (max: {formatCost(costSummary.totalMaxCost)})
              </span>
            </div>

            {/* Tier breakdown */}
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(costSummary.tierCounts).map(([tier, count]) => (
                <TierBadge key={tier} tier={tier as CostTier} count={count} />
              ))}
            </div>
          </div>

          {/* Monthly Projection (if scheduled) */}
          {schedule?.enabled && (
            <div
              className={`p-3 rounded-lg border ${
                monthlyProjection.exceedsBudget
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-blue-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Monthly Projection
                </span>
              </div>

              <CostBreakdownRow
                label="Scheduled Runs"
                value={`${monthlyProjection.runsPerMonth}`}
                subValue="per month"
                icon={Zap}
              />

              <CostBreakdownRow
                label="Projected Cost"
                value={formatCost(monthlyProjection.projectedCost)}
                subValue={`${monthlyProjection.budgetPercentage.toFixed(0)}% of budget`}
                warning={monthlyProjection.exceedsBudget}
                icon={TrendingUp}
              />

              {/* Budget Warning */}
              {monthlyProjection.exceedsBudget && (
                <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-500/20 border border-red-500/30">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-400">
                      Budget Exceeded
                    </p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Projected cost exceeds your ${userBudget.toFixed(2)} monthly budget
                      by {formatCost(monthlyProjection.projectedCost - userBudget)}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Node Breakdown Toggle */}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition"
          >
            <span className="text-xs text-muted-foreground">Node Breakdown</span>
            {showBreakdown ? (
              <ChevronUp size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </button>

          {/* Node Breakdown List */}
          {showBreakdown && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {costSummary.nodeBreakdown.map((node) => {
                const tierConfig = COST_TIERS[node.tier];
                return (
                  <div
                    key={node.nodeId}
                    className="flex items-center justify-between px-3 py-2 rounded bg-gray-800/30"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${tierConfig.bgColor.replace('/10', '')}`}
                      />
                      <span className="text-xs text-gray-300 truncate max-w-[120px]">
                        {node.nodeType}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${tierConfig.color}`}>
                      {tierConfig.dollarSigns || 'Free'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warnings */}
          {costSummary.warnings.length > 0 && (
            <div className="space-y-2">
              {costSummary.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                >
                  <Info size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-yellow-400">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Info Footer */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            <span>
              Estimates are based on typical API usage. Actual costs may vary
              based on input size and complexity.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPACT VERSION FOR HEADER
// =====================================================

interface CostEstimatorBadgeProps {
  nodes: Node[];
  onClick?: () => void;
}

export function CostEstimatorBadge({ nodes, onClick }: CostEstimatorBadgeProps) {
  const costSummary = useMemo(() => calculatePipelineCost(nodes), [nodes]);

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  // Determine overall tier
  let overallTier: CostTier = 'free';
  if (costSummary.tierCounts.premium > 0) overallTier = 'premium';
  else if (costSummary.tierCounts.high > 0) overallTier = 'high';
  else if (costSummary.tierCounts.medium > 0) overallTier = 'medium';
  else if (costSummary.tierCounts.low > 0) overallTier = 'low';

  const tierConfig = COST_TIERS[overallTier];

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        ${tierConfig.bgColor} ${tierConfig.borderColor}
        border hover:opacity-80 transition
      `}
    >
      <DollarSign size={14} className={tierConfig.color} />
      <span className={`text-sm font-semibold ${tierConfig.color}`}>
        {formatCost(costSummary.avgCostPerRun)}
      </span>
      <span className="text-xs text-muted-foreground">/run</span>
      {costSummary.hasExpensiveNodes && (
        <AlertTriangle size={12} className="text-orange-400 ml-1" />
      )}
    </button>
  );
}
