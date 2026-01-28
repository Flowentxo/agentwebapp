'use client';

/**
 * NodeCostBadge Component
 *
 * Displays a visual cost indicator on workflow nodes in the Studio canvas.
 * Shows cost tiers ($, $$, $$$, $$$$) with color coding.
 *
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// =====================================================
// COST DEFINITIONS (mirror of backend)
// =====================================================

const MODEL_COSTS: Record<string, number> = {
  'gpt-4o': 0.03,
  'gpt-4o-mini': 0.001,
  'gpt-4-turbo': 0.04,
  'gpt-4': 0.06,
  'gpt-3.5-turbo': 0.002,
  'claude-3-opus': 0.075,
  'claude-3-sonnet': 0.015,
  'claude-3-haiku': 0.001,
  'default': 0.01,
};

const OPERATION_COSTS: Record<string, number> = {
  'web-search': 0.01,
  'image-gen': 0.04,
  'image-gen-hd': 0.08,
  'database-query': 0.0001,
  'webhook': 0.0001,
  'api-call': 0.0001,
  'trigger': 0,
  'condition': 0,
  'data-transform': 0,
  'output': 0,
  'custom': 0.001,
};

export type CostTier = 'free' | 'low' | 'medium' | 'high' | 'premium';

interface CostTierInfo {
  max: number;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  description: string;
}

const COST_TIERS: Record<CostTier, CostTierInfo> = {
  free: {
    max: 0,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800/50',
    borderColor: 'border-zinc-700',
    label: 'Free',
    description: 'No cost',
  },
  low: {
    max: 0.005,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/50',
    borderColor: 'border-emerald-800',
    label: '$',
    description: 'Low cost (<$0.01)',
  },
  medium: {
    max: 0.02,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/50',
    borderColor: 'border-amber-800',
    label: '$$',
    description: 'Medium cost ($0.01-$0.02)',
  },
  high: {
    max: 0.05,
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/50',
    borderColor: 'border-orange-800',
    label: '$$$',
    description: 'High cost ($0.02-$0.05)',
  },
  premium: {
    max: Infinity,
    color: 'text-red-400',
    bgColor: 'bg-red-950/50',
    borderColor: 'border-red-800',
    label: '$$$$',
    description: 'Premium cost (>$0.05)',
  },
};

// =====================================================
// PROPS
// =====================================================

interface NodeCostBadgeProps {
  nodeType: string;
  config?: {
    model?: string;
    selectedModel?: string;
    provider?: string;
    quality?: string;
    retryCount?: number;
    maxRetries?: number;
  };
  /** Show detailed cost on hover */
  showTooltip?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Position in the node */
  position?: 'top-right' | 'bottom-right' | 'inline';
  /** Custom class name */
  className?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export function NodeCostBadge({
  nodeType,
  config = {},
  showTooltip = true,
  size = 'sm',
  position = 'top-right',
  className = '',
}: NodeCostBadgeProps) {
  // Calculate estimated cost
  const { cost, tier, tierInfo, details } = useMemo(() => {
    let estimatedCost = 0;
    let details = '';

    switch (nodeType) {
      case 'llm-agent':
      case 'ai-agent':
      case 'openai': {
        const model = config.model || config.selectedModel || 'gpt-4o-mini';
        estimatedCost = MODEL_COSTS[model] || MODEL_COSTS['default'];
        details = `Model: ${model}`;
        break;
      }

      case 'web-search': {
        const provider = config.provider || 'duckduckgo';
        estimatedCost = provider === 'google' ? 0.02 : OPERATION_COSTS['web-search'];
        details = `Provider: ${provider}`;
        break;
      }

      case 'image-gen':
      case 'dall-e': {
        const quality = config.quality || 'standard';
        estimatedCost = quality === 'hd' ? OPERATION_COSTS['image-gen-hd'] : OPERATION_COSTS['image-gen'];
        details = `Quality: ${quality}`;
        break;
      }

      case 'database-query':
      case 'webhook':
      case 'api-call':
      case 'trigger':
      case 'condition':
      case 'data-transform':
      case 'output':
      case 'custom': {
        estimatedCost = OPERATION_COSTS[nodeType] || 0;
        break;
      }

      default: {
        estimatedCost = OPERATION_COSTS['custom'] || 0;
      }
    }

    // Apply retry multiplier
    const retryCount = config.retryCount || config.maxRetries || 1;
    if (retryCount > 1) {
      const multiplier = 1 + (retryCount - 1) * 0.3;
      estimatedCost *= multiplier;
      details += ` (with ${retryCount}x retry)`;
    }

    // Determine tier
    let tier: CostTier = 'free';
    if (estimatedCost === 0) {
      tier = 'free';
    } else if (estimatedCost <= COST_TIERS.low.max) {
      tier = 'low';
    } else if (estimatedCost <= COST_TIERS.medium.max) {
      tier = 'medium';
    } else if (estimatedCost <= COST_TIERS.high.max) {
      tier = 'high';
    } else {
      tier = 'premium';
    }

    return {
      cost: estimatedCost,
      tier,
      tierInfo: COST_TIERS[tier],
      details: details || nodeType,
    };
  }, [nodeType, config]);

  // Don't render badge for free operations
  if (tier === 'free') {
    return null;
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-[9px] px-1 py-0.5 min-w-[16px]',
    md: 'text-[10px] px-1.5 py-0.5 min-w-[20px]',
    lg: 'text-xs px-2 py-1 min-w-[24px]',
  };

  // Position classes
  const positionClasses = {
    'top-right': 'absolute -top-1.5 -right-1.5',
    'bottom-right': 'absolute -bottom-1.5 -right-1.5',
    'inline': 'inline-flex',
  };

  const badge = (
    <div
      className={`
        ${positionClasses[position]}
        ${sizeClasses[size]}
        ${tierInfo.bgColor}
        ${tierInfo.borderColor}
        ${tierInfo.color}
        flex items-center justify-center
        font-bold
        rounded-full
        border
        shadow-sm
        z-10
        ${className}
      `}
    >
      {tierInfo.label}
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-zinc-900 border-zinc-700 text-white"
        >
          <div className="space-y-1">
            <div className="font-medium">{tierInfo.description}</div>
            <div className="text-xs text-zinc-400">
              Estimated: ~${cost.toFixed(4)} per run
            </div>
            {details && (
              <div className="text-xs text-zinc-500">{details}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =====================================================
// UTILITY EXPORTS
// =====================================================

/**
 * Get cost tier for a node without rendering
 */
export function getNodeCostTier(
  nodeType: string,
  config?: NodeCostBadgeProps['config']
): { tier: CostTier; cost: number; tierInfo: CostTierInfo } {
  let estimatedCost = 0;

  switch (nodeType) {
    case 'llm-agent':
    case 'ai-agent':
    case 'openai': {
      const model = config?.model || config?.selectedModel || 'gpt-4o-mini';
      estimatedCost = MODEL_COSTS[model] || MODEL_COSTS['default'];
      break;
    }
    case 'web-search': {
      const provider = config?.provider || 'duckduckgo';
      estimatedCost = provider === 'google' ? 0.02 : OPERATION_COSTS['web-search'];
      break;
    }
    case 'image-gen':
    case 'dall-e': {
      const quality = config?.quality || 'standard';
      estimatedCost = quality === 'hd' ? OPERATION_COSTS['image-gen-hd'] : OPERATION_COSTS['image-gen'];
      break;
    }
    default: {
      estimatedCost = OPERATION_COSTS[nodeType] || 0;
    }
  }

  let tier: CostTier = 'free';
  if (estimatedCost === 0) {
    tier = 'free';
  } else if (estimatedCost <= COST_TIERS.low.max) {
    tier = 'low';
  } else if (estimatedCost <= COST_TIERS.medium.max) {
    tier = 'medium';
  } else if (estimatedCost <= COST_TIERS.high.max) {
    tier = 'high';
  } else {
    tier = 'premium';
  }

  return {
    tier,
    cost: estimatedCost,
    tierInfo: COST_TIERS[tier],
  };
}

/**
 * Export tier definitions for external use
 */
export { COST_TIERS };

export default NodeCostBadge;
