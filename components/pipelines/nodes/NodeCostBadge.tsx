'use client';

/**
 * NodeCostBadge Component
 *
 * Visual cost indicator for pipeline nodes
 * Shows estimated cost tier based on node type and configuration
 */

import { memo, useMemo } from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';

// =====================================================
// COST TIER DEFINITIONS
// =====================================================

export type CostTier = 'free' | 'low' | 'medium' | 'high' | 'premium';

interface CostTierConfig {
  label: string;
  dollarSigns: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  maxCost: number;
}

export const COST_TIERS: Record<CostTier, CostTierConfig> = {
  free: {
    label: 'Free',
    dollarSigns: '',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/500/10',
    borderColor: 'border-gray-500/30',
    description: 'No API cost',
    maxCost: 0,
  },
  low: {
    label: 'Low',
    dollarSigns: '$',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: '< $0.01 per call',
    maxCost: 0.01,
  },
  medium: {
    label: 'Medium',
    dollarSigns: '$$',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: '$0.01 - $0.05 per call',
    maxCost: 0.05,
  },
  high: {
    label: 'High',
    dollarSigns: '$$$',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: '$0.05 - $0.10 per call',
    maxCost: 0.1,
  },
  premium: {
    label: 'Premium',
    dollarSigns: '$$$$',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: '> $0.10 per call',
    maxCost: Infinity,
  },
};

// =====================================================
// NODE COST MAPPINGS
// =====================================================

interface NodeCostMapping {
  tier: CostTier;
  estimatedCost: number;
  description: string;
}

// Agent Models cost mapping
const MODEL_COSTS: Record<string, NodeCostMapping> = {
  'gpt-4o': { tier: 'high', estimatedCost: 0.03, description: 'GPT-4o' },
  'gpt-4o-mini': { tier: 'low', estimatedCost: 0.001, description: 'GPT-4o Mini' },
  'gpt-4-turbo': { tier: 'premium', estimatedCost: 0.04, description: 'GPT-4 Turbo' },
  'gpt-4': { tier: 'premium', estimatedCost: 0.06, description: 'GPT-4' },
  'gpt-3.5-turbo': { tier: 'low', estimatedCost: 0.002, description: 'GPT-3.5 Turbo' },
  'claude-3-opus': { tier: 'premium', estimatedCost: 0.075, description: 'Claude 3 Opus' },
  'claude-3-sonnet': { tier: 'medium', estimatedCost: 0.015, description: 'Claude 3 Sonnet' },
  'claude-3-haiku': { tier: 'low', estimatedCost: 0.001, description: 'Claude 3 Haiku' },
  'default': { tier: 'medium', estimatedCost: 0.01, description: 'Default Model' },
};

// Agent-specific defaults (when no model specified)
const AGENT_DEFAULTS: Record<string, NodeCostMapping> = {
  dexter: { tier: 'medium', estimatedCost: 0.02, description: 'Data Analysis Agent' },
  cassie: { tier: 'medium', estimatedCost: 0.015, description: 'Customer Support Agent' },
  emmie: { tier: 'low', estimatedCost: 0.005, description: 'Email Agent' },
  kai: { tier: 'medium', estimatedCost: 0.02, description: 'Code Agent' },
  default: { tier: 'medium', estimatedCost: 0.015, description: 'AI Agent' },
};

// Action type cost mapping
const ACTION_COSTS: Record<string, NodeCostMapping> = {
  http: { tier: 'free', estimatedCost: 0.0001, description: 'HTTP Request' },
  database: { tier: 'free', estimatedCost: 0.0001, description: 'Database Query' },
  email: { tier: 'low', estimatedCost: 0.001, description: 'Send Email' },
  webhook: { tier: 'free', estimatedCost: 0.0001, description: 'Webhook' },
  'web-search': { tier: 'low', estimatedCost: 0.01, description: 'Web Search' },
  'image-gen': { tier: 'high', estimatedCost: 0.04, description: 'Image Generation' },
  end: { tier: 'free', estimatedCost: 0, description: 'End Node' },
  default: { tier: 'free', estimatedCost: 0.0001, description: 'Action' },
};

// Logic nodes (always free)
const LOGIC_COSTS: NodeCostMapping = {
  tier: 'free',
  estimatedCost: 0,
  description: 'Logic Node',
};

// =====================================================
// COST ESTIMATION FUNCTION
// =====================================================

export interface NodeCostInfo {
  tier: CostTier;
  tierConfig: CostTierConfig;
  estimatedCost: number;
  description: string;
}

export function getNodeCost(
  nodeType: string,
  config?: {
    agentId?: string;
    model?: string;
    subType?: string;
    [key: string]: unknown;
  }
): NodeCostInfo {
  let mapping: NodeCostMapping;

  switch (nodeType) {
    case 'agent':
    case 'agentNode':
    case 'ai-agent':
    case 'llm-agent': {
      // Check for specific model first
      const model = config?.model as string;
      if (model && MODEL_COSTS[model]) {
        mapping = MODEL_COSTS[model];
      } else if (config?.agentId && AGENT_DEFAULTS[config.agentId]) {
        mapping = AGENT_DEFAULTS[config.agentId];
      } else {
        mapping = AGENT_DEFAULTS.default;
      }
      break;
    }

    case 'action':
    case 'actionNode': {
      const subType = config?.subType as string;
      mapping = ACTION_COSTS[subType] || ACTION_COSTS.default;
      break;
    }

    case 'trigger':
    case 'triggerNode':
    case 'condition':
    case 'conditionNode':
    case 'transform':
    case 'transformNode':
    case 'delay':
    case 'delayNode':
    case 'humanApproval':
    case 'humanApprovalNode':
      mapping = LOGIC_COSTS;
      break;

    default:
      mapping = { tier: 'free', estimatedCost: 0, description: 'Unknown Node' };
  }

  return {
    tier: mapping.tier,
    tierConfig: COST_TIERS[mapping.tier],
    estimatedCost: mapping.estimatedCost,
    description: mapping.description,
  };
}

// =====================================================
// COMPONENT PROPS
// =====================================================

interface NodeCostBadgeProps {
  nodeType: string;
  config?: {
    agentId?: string;
    model?: string;
    subType?: string;
    [key: string]: unknown;
  };
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  showCost?: boolean;
  className?: string;
}

// =====================================================
// COMPONENT
// =====================================================

function NodeCostBadgeComponent({
  nodeType,
  config,
  size = 'sm',
  showTooltip = true,
  showCost = false,
  className = '',
}: NodeCostBadgeProps) {
  const costInfo = useMemo(() => getNodeCost(nodeType, config), [nodeType, config]);

  // Don't show badge for free nodes unless explicitly requested
  if (costInfo.tier === 'free' && !showCost) {
    return null;
  }

  const sizeClasses = {
    xs: 'text-[9px] px-1 py-0.5',
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  const iconSizes = {
    xs: 8,
    sm: 10,
    md: 12,
  };

  const { tierConfig } = costInfo;

  return (
    <div className={`relative group ${className}`}>
      {/* Badge */}
      <div
        className={`
          inline-flex items-center gap-0.5 rounded-full font-bold
          ${sizeClasses[size]}
          ${tierConfig.bgColor}
          ${tierConfig.borderColor}
          ${tierConfig.color}
          border
        `}
      >
        {costInfo.tier === 'premium' && (
          <AlertTriangle size={iconSizes[size]} className="mr-0.5" />
        )}
        {tierConfig.dollarSigns || (
          <span className="opacity-50">Free</span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2 rounded-lg
            bg-card border border-white/10 shadow-xl
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all duration-200
            whitespace-nowrap
            pointer-events-none
          `}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${tierConfig.color}`}>
                {tierConfig.label} Cost
              </span>
              {costInfo.tier !== 'free' && (
                <span className="text-muted-foreground text-xs">
                  ~${costInfo.estimatedCost.toFixed(4)}/call
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {costInfo.description}
            </span>
          </div>

          {/* Tooltip arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
            border-4 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </div>
  );
}

export const NodeCostBadge = memo(NodeCostBadgeComponent);

// =====================================================
// HEADER BADGE VARIANT
// =====================================================

interface NodeCostHeaderBadgeProps {
  nodeType: string;
  config?: {
    agentId?: string;
    model?: string;
    subType?: string;
    [key: string]: unknown;
  };
}

function NodeCostHeaderBadgeComponent({ nodeType, config }: NodeCostHeaderBadgeProps) {
  const costInfo = useMemo(() => getNodeCost(nodeType, config), [nodeType, config]);

  // Always show in header, even for free
  const { tierConfig, tier } = costInfo;

  if (tier === 'free') {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <DollarSign size={10} className="opacity-50" />
        <span>Free</span>
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
        ${tierConfig.bgColor} ${tierConfig.borderColor} ${tierConfig.color}
        border
      `}
    >
      {tier === 'premium' && <AlertTriangle size={10} className="mr-0.5" />}
      {tierConfig.dollarSigns}
    </div>
  );
}

export const NodeCostHeaderBadge = memo(NodeCostHeaderBadgeComponent);

// =====================================================
// UTILITY: Calculate total pipeline cost
// =====================================================

export interface PipelineCostSummary {
  totalMinCost: number;
  totalMaxCost: number;
  avgCostPerRun: number;
  nodeBreakdown: Array<{
    nodeId: string;
    nodeType: string;
    tier: CostTier;
    estimatedCost: number;
  }>;
  tierCounts: Record<CostTier, number>;
  hasExpensiveNodes: boolean;
  warnings: string[];
}

export function calculatePipelineCost(
  nodes: Array<{
    id: string;
    type?: string;
    data?: Record<string, unknown>;
  }>
): PipelineCostSummary {
  const nodeBreakdown: PipelineCostSummary['nodeBreakdown'] = [];
  const tierCounts: Record<CostTier, number> = {
    free: 0,
    low: 0,
    medium: 0,
    high: 0,
    premium: 0,
  };
  const warnings: string[] = [];
  let totalCost = 0;

  for (const node of nodes) {
    const costInfo = getNodeCost(node.type || 'custom', node.data);

    nodeBreakdown.push({
      nodeId: node.id,
      nodeType: node.type || 'custom',
      tier: costInfo.tier,
      estimatedCost: costInfo.estimatedCost,
    });

    tierCounts[costInfo.tier]++;
    totalCost += costInfo.estimatedCost;

    // Add warnings for expensive nodes
    if (costInfo.tier === 'premium') {
      warnings.push(`Node "${node.data?.label || node.id}" uses premium-tier API ($${costInfo.estimatedCost.toFixed(3)}/call)`);
    }
  }

  const expensiveNodeCount = tierCounts.high + tierCounts.premium;
  if (expensiveNodeCount > 3) {
    warnings.push(`Pipeline has ${expensiveNodeCount} expensive nodes - consider optimizing`);
  }

  return {
    totalMinCost: Math.round(totalCost * 10000) / 10000,
    totalMaxCost: Math.round(totalCost * 1.5 * 10000) / 10000, // 50% buffer for retries
    avgCostPerRun: Math.round(totalCost * 10000) / 10000,
    nodeBreakdown,
    tierCounts,
    hasExpensiveNodes: expensiveNodeCount > 0,
    warnings,
  };
}
