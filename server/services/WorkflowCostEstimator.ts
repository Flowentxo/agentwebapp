/**
 * Workflow Cost Estimator Service
 *
 * Estimates the cost of executing a workflow based on node types and configuration.
 * Used for:
 * 1. Pre-execution budget checks
 * 2. Visual cost badges in the Studio
 * 3. Cost projection in Preview Panel
 *
 * @version 1.0.0
 */

import { Node } from 'reactflow';

// =====================================================
// COST DEFINITIONS
// =====================================================

/**
 * Cost per model (estimated per call)
 * Based on average token usage of ~1000 tokens input + 500 tokens output
 */
export const MODEL_COSTS: Record<string, number> = {
  // OpenAI Models
  'gpt-4o': 0.03,           // ~$0.005/1K input + $0.015/1K output = ~$0.03 per call
  'gpt-4o-mini': 0.001,     // Very cheap
  'gpt-4-turbo': 0.04,      // Premium model
  'gpt-4': 0.06,            // Legacy expensive
  'gpt-3.5-turbo': 0.002,   // Budget option

  // Anthropic Models
  'claude-3-opus': 0.075,   // Most expensive
  'claude-3-sonnet': 0.015,
  'claude-3-haiku': 0.001,

  // Default fallback
  'default': 0.01,
};

/**
 * Fixed costs for non-LLM operations
 */
export const OPERATION_COSTS: Record<string, number> = {
  // Search operations
  'web-search': 0.01,           // Per search query
  'web-search-brave': 0.01,
  'web-search-google': 0.02,    // Google is slightly more expensive

  // Image operations
  'image-gen': 0.04,            // DALL-E 3 standard
  'image-gen-hd': 0.08,         // DALL-E 3 HD

  // Database operations
  'database-query': 0.0001,     // Negligible but tracked

  // Webhook/API calls
  'webhook': 0.0001,            // Negligible
  'api-call': 0.0001,

  // Free operations
  'trigger': 0,
  'condition': 0,
  'data-transform': 0,
  'output': 0,
  'custom': 0.001,              // Small cost for compute
};

/**
 * Cost tier classification
 */
export type CostTier = 'free' | 'low' | 'medium' | 'high' | 'premium';

export const COST_TIER_THRESHOLDS: Record<CostTier, { max: number; color: string; label: string }> = {
  free: { max: 0, color: '#6B7280', label: 'Free' },
  low: { max: 0.005, color: '#10B981', label: '$' },
  medium: { max: 0.02, color: '#F59E0B', label: '$$' },
  high: { max: 0.05, color: '#EF4444', label: '$$$' },
  premium: { max: Infinity, color: '#7C3AED', label: '$$$$' },
};

// =====================================================
// INTERFACES
// =====================================================

export interface NodeCostEstimate {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  estimatedCost: number;
  costTier: CostTier;
  costDetails: {
    model?: string;
    operation?: string;
    multiplier?: number;
    note?: string;
  };
}

export interface WorkflowCostEstimate {
  /** Minimum expected cost (best case - no retries, no loops) */
  minCost: number;

  /** Maximum expected cost (worst case - with retries and loop iterations) */
  maxCost: number;

  /** Average expected cost */
  avgCost: number;

  /** Breakdown by node */
  nodeEstimates: NodeCostEstimate[];

  /** Summary by cost tier */
  tierSummary: {
    tier: CostTier;
    count: number;
    totalCost: number;
  }[];

  /** Warning messages */
  warnings: string[];

  /** Recommended budget buffer (10-20% of max) */
  recommendedBuffer: number;

  /** Total estimated tokens (if calculable) */
  estimatedTokens: number;
}

// =====================================================
// COST ESTIMATOR CLASS
// =====================================================

export class WorkflowCostEstimator {

  /**
   * Estimate cost for a single node
   */
  estimateNodeCost(node: Node): NodeCostEstimate {
    const nodeType = node.type || 'custom';
    const nodeData = node.data || {};
    const nodeName = nodeData.label || nodeData.name || node.id;

    let estimatedCost = 0;
    let costDetails: NodeCostEstimate['costDetails'] = {};

    switch (nodeType) {
      case 'llm-agent':
      case 'ai-agent':
      case 'openai': {
        // Get model from node configuration
        const model = nodeData.model || nodeData.selectedModel || 'gpt-4o-mini';
        estimatedCost = MODEL_COSTS[model] || MODEL_COSTS['default'];
        costDetails = { model, note: 'Cost per LLM call' };
        break;
      }

      case 'web-search': {
        const provider = nodeData.provider || 'duckduckgo';
        const operationKey = provider === 'google' ? 'web-search-google' : 'web-search';
        estimatedCost = OPERATION_COSTS[operationKey];
        costDetails = { operation: 'web-search', note: `Using ${provider}` };
        break;
      }

      case 'image-gen':
      case 'dall-e': {
        const quality = nodeData.quality || 'standard';
        estimatedCost = quality === 'hd' ? OPERATION_COSTS['image-gen-hd'] : OPERATION_COSTS['image-gen'];
        costDetails = { operation: 'image-gen', note: `Quality: ${quality}` };
        break;
      }

      case 'database-query': {
        estimatedCost = OPERATION_COSTS['database-query'];
        costDetails = { operation: 'database-query' };
        break;
      }

      case 'webhook':
      case 'api-call': {
        estimatedCost = OPERATION_COSTS[nodeType];
        costDetails = { operation: nodeType };
        break;
      }

      case 'trigger':
      case 'condition':
      case 'data-transform':
      case 'output': {
        estimatedCost = 0;
        costDetails = { note: 'Free operation' };
        break;
      }

      case 'custom': {
        // Custom tools have small compute cost
        estimatedCost = OPERATION_COSTS['custom'];
        costDetails = { operation: 'custom', note: 'Custom tool execution' };
        break;
      }

      // HubSpot integrations (API calls)
      case 'hubspot-create-contact':
      case 'hubspot-update-deal':
      case 'hubspot-add-note':
      case 'hubspot-search-contacts': {
        estimatedCost = OPERATION_COSTS['api-call'];
        costDetails = { operation: 'hubspot-api' };
        break;
      }

      default: {
        // Unknown node type - assume small cost
        estimatedCost = OPERATION_COSTS['custom'];
        costDetails = { note: `Unknown node type: ${nodeType}` };
      }
    }

    // Check for retry configuration (multiplier)
    const retryCount = nodeData.retryCount || nodeData.maxRetries || 1;
    if (retryCount > 1) {
      // Assume 30% chance of needing retries on average
      const retryMultiplier = 1 + (retryCount - 1) * 0.3;
      estimatedCost *= retryMultiplier;
      costDetails.multiplier = retryMultiplier;
    }

    // Determine cost tier
    const costTier = this.getCostTier(estimatedCost);

    return {
      nodeId: node.id,
      nodeType,
      nodeName,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000, // 4 decimal places
      costTier,
      costDetails,
    };
  }

  /**
   * Estimate total cost for a workflow
   */
  estimateWorkflowCost(nodes: Node[]): WorkflowCostEstimate {
    const nodeEstimates: NodeCostEstimate[] = [];
    const warnings: string[] = [];
    let totalMinCost = 0;
    let totalMaxCost = 0;
    let estimatedTokens = 0;

    // Track loop nodes for multiplier
    const loopNodes = nodes.filter(n => n.type === 'loop' || n.data?.isLoop);
    const hasLoops = loopNodes.length > 0;

    if (hasLoops) {
      warnings.push('Workflow contains loops - max cost assumes 10 iterations per loop');
    }

    // Estimate each node
    for (const node of nodes) {
      const estimate = this.estimateNodeCost(node);
      nodeEstimates.push(estimate);

      // Add to totals
      totalMinCost += estimate.estimatedCost;

      // Check if this node is inside a loop
      const isInLoop = this.isNodeInLoop(node, nodes);
      const loopMultiplier = isInLoop ? 10 : 1; // Assume max 10 iterations

      totalMaxCost += estimate.estimatedCost * loopMultiplier;

      // Estimate tokens for LLM nodes
      if (estimate.nodeType === 'llm-agent' || estimate.nodeType === 'ai-agent') {
        estimatedTokens += 1500 * loopMultiplier; // Assume ~1500 tokens per call
      }
    }

    // Calculate tier summary
    const tierCounts = new Map<CostTier, { count: number; totalCost: number }>();
    for (const tier of Object.keys(COST_TIER_THRESHOLDS) as CostTier[]) {
      tierCounts.set(tier, { count: 0, totalCost: 0 });
    }

    for (const estimate of nodeEstimates) {
      const tierData = tierCounts.get(estimate.costTier)!;
      tierData.count++;
      tierData.totalCost += estimate.estimatedCost;
    }

    const tierSummary = Array.from(tierCounts.entries()).map(([tier, data]) => ({
      tier,
      count: data.count,
      totalCost: Math.round(data.totalCost * 10000) / 10000,
    }));

    // Add warnings for expensive workflows
    if (totalMaxCost > 1.0) {
      warnings.push(`High cost workflow: Max estimated cost is $${totalMaxCost.toFixed(2)}`);
    }

    const highCostNodes = nodeEstimates.filter(n => n.costTier === 'high' || n.costTier === 'premium');
    if (highCostNodes.length > 3) {
      warnings.push(`${highCostNodes.length} expensive nodes detected - consider using cheaper models`);
    }

    // Calculate recommended buffer (15% of max)
    const recommendedBuffer = totalMaxCost * 0.15;

    return {
      minCost: Math.round(totalMinCost * 10000) / 10000,
      maxCost: Math.round(totalMaxCost * 10000) / 10000,
      avgCost: Math.round(((totalMinCost + totalMaxCost) / 2) * 10000) / 10000,
      nodeEstimates,
      tierSummary,
      warnings,
      recommendedBuffer: Math.round(recommendedBuffer * 10000) / 10000,
      estimatedTokens,
    };
  }

  /**
   * Get cost tier for a given cost value
   */
  getCostTier(cost: number): CostTier {
    if (cost === 0) return 'free';
    if (cost <= COST_TIER_THRESHOLDS.low.max) return 'low';
    if (cost <= COST_TIER_THRESHOLDS.medium.max) return 'medium';
    if (cost <= COST_TIER_THRESHOLDS.high.max) return 'high';
    return 'premium';
  }

  /**
   * Get tier display info
   */
  getTierInfo(tier: CostTier) {
    return COST_TIER_THRESHOLDS[tier];
  }

  /**
   * Check if a node is inside a loop
   * (Simple heuristic - checks parent relationships)
   */
  private isNodeInLoop(node: Node, allNodes: Node[]): boolean {
    // Check if node has a loop parent in its data
    if (node.data?.parentLoopId) return true;

    // Check node position relative to loop nodes
    const loopNodes = allNodes.filter(n => n.type === 'loop' || n.data?.isLoop);

    for (const loopNode of loopNodes) {
      // Simple bounding box check (if node is "inside" loop node area)
      if (loopNode.position && node.position) {
        const loopBounds = {
          x: loopNode.position.x,
          y: loopNode.position.y,
          width: loopNode.width || 300,
          height: loopNode.height || 200,
        };

        if (
          node.position.x >= loopBounds.x &&
          node.position.x <= loopBounds.x + loopBounds.width &&
          node.position.y >= loopBounds.y &&
          node.position.y <= loopBounds.y + loopBounds.height
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Quick cost check for a single LLM call
   * Used by the execution engine for pre-flight budget checks
   */
  estimateLLMCost(model: string, estimatedInputTokens: number = 1000, estimatedOutputTokens: number = 500): number {
    // More precise calculation using actual token counts
    const modelRates: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    };

    const rates = modelRates[model] || { input: 0.01, output: 0.03 };

    // Cost per 1K tokens
    const inputCost = (estimatedInputTokens / 1000) * rates.input;
    const outputCost = (estimatedOutputTokens / 1000) * rates.output;

    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }
}

// Singleton instance
export const workflowCostEstimator = new WorkflowCostEstimator();
