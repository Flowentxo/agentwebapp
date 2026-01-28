/**
 * Buddy Action Tools - Phase 3: Active Intervention
 *
 * Defines AI tools that allow Buddy to actively modify budget settings
 * with Human-in-the-Loop approval.
 *
 * Tools:
 * - propose_optimization: Propose a cost-saving or performance optimization
 * - apply_limit_change: Change daily/monthly token limits
 * - get_approval_status: Check status of pending approval
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import { z } from 'zod';
import {
  budgetActionService,
  type OptimizationResult,
  type LimitChangeResult,
  type ApprovalRequest,
} from '@/server/services/BudgetActionService';

// =====================================================
// ZOD SCHEMAS FOR TOOL PARAMETERS
// =====================================================

/**
 * Schema for propose_optimization tool
 */
export const ProposeOptimizationSchema = z.object({
  strategy: z.enum(['cost_save', 'performance'])
    .describe('Optimization strategy: "cost_save" switches to cheaper model, "performance" uses best model'),
  reason: z.string()
    .min(10)
    .max(500)
    .describe('Explanation why this optimization is recommended'),
  auto_apply: z.boolean()
    .optional()
    .default(false)
    .describe('If true, apply immediately without creating approval request'),
});

/**
 * Schema for apply_limit_change tool
 */
export const ApplyLimitChangeSchema = z.object({
  limit_type: z.enum(['daily', 'monthly'])
    .describe('Type of limit to change'),
  new_limit: z.number()
    .int()
    .min(1000)
    .max(10000000)
    .describe('New token limit (1,000 - 10,000,000)'),
  reason: z.string()
    .min(10)
    .max(500)
    .describe('Reason for the limit change'),
});

/**
 * Schema for get_approval_status tool
 */
export const GetApprovalStatusSchema = z.object({
  approval_id: z.string()
    .optional()
    .describe('Optional: specific approval ID to check. If not provided, returns latest pending approval.'),
});

/**
 * Schema for confirm_action tool (user confirmation)
 */
export const ConfirmActionSchema = z.object({
  approval_id: z.string()
    .describe('The approval ID to confirm or reject'),
  confirmed: z.boolean()
    .describe('True to approve, false to reject'),
});

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type ProposeOptimizationParams = z.infer<typeof ProposeOptimizationSchema>;
export type ApplyLimitChangeParams = z.infer<typeof ApplyLimitChangeSchema>;
export type GetApprovalStatusParams = z.infer<typeof GetApprovalStatusSchema>;
export type ConfirmActionParams = z.infer<typeof ConfirmActionSchema>;

// =====================================================
// TOOL DEFINITIONS FOR OPENAI FUNCTION CALLING
// =====================================================

/**
 * OpenAI Function definitions for Buddy's action tools
 */
export const BUDDY_ACTION_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'propose_optimization',
      description: `Propose a budget optimization to the user. Use this when:
- User's health score is low and cost-saving would help
- User explicitly asks to reduce costs
- User wants to switch to a better/cheaper model

Strategies:
- "cost_save": Switch to gpt-4o-mini, enable auto-optimization (saves ~90% costs)
- "performance": Switch to gpt-4o for best quality (higher costs)

This creates an approval request that the user must confirm.`,
      parameters: {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['cost_save', 'performance'],
            description: 'Optimization strategy to propose',
          },
          reason: {
            type: 'string',
            description: 'Explanation why this optimization is recommended (10-500 chars)',
          },
          auto_apply: {
            type: 'boolean',
            description: 'If true, apply immediately without approval. Use only if user explicitly agrees.',
            default: false,
          },
        },
        required: ['strategy', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_limit_change',
      description: `Change the user's token limit. Use this when:
- User asks to increase/decrease their daily or monthly limit
- User's budget is running out and wants to reduce limit
- User needs more capacity and wants higher limits

Limits must be between 1,000 and 10,000,000 tokens.`,
      parameters: {
        type: 'object',
        properties: {
          limit_type: {
            type: 'string',
            enum: ['daily', 'monthly'],
            description: 'Which limit to change',
          },
          new_limit: {
            type: 'integer',
            minimum: 1000,
            maximum: 10000000,
            description: 'New token limit',
          },
          reason: {
            type: 'string',
            description: 'Reason for the change (10-500 chars)',
          },
        },
        required: ['limit_type', 'new_limit', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_approval_status',
      description: `Check the status of a pending approval request. Use this to:
- See if there's a pending optimization waiting for user confirmation
- Check if a previous request was approved or rejected`,
      parameters: {
        type: 'object',
        properties: {
          approval_id: {
            type: 'string',
            description: 'Optional: specific approval ID to check',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_action',
      description: `Process a user's confirmation or rejection of a pending action.
Use this when the user says "yes", "confirm", "do it", "apply" or "no", "cancel", "reject".`,
      parameters: {
        type: 'object',
        properties: {
          approval_id: {
            type: 'string',
            description: 'The approval ID to confirm or reject',
          },
          confirmed: {
            type: 'boolean',
            description: 'True to approve and execute, false to reject',
          },
        },
        required: ['approval_id', 'confirmed'],
      },
    },
  },
];

// =====================================================
// TOOL RESULT TYPES
// =====================================================

export interface ProposeOptimizationResult {
  success: boolean;
  error?: string;
  approval_id?: string;
  message?: string;
  proposal?: {
    strategy: 'cost_save' | 'performance';
    changes: {
      model: { from: string; to: string };
      autoOptimize: { from: boolean; to: boolean };
    };
    estimated_savings?: {
      monthly_usd: number;
      percentage: number;
    };
    expires_at: string;
  };
  applied?: boolean;
  result?: OptimizationResult;
}

export interface ApplyLimitChangeResult {
  success: boolean;
  error?: string;
  message?: string;
  changes?: {
    limit_type: 'daily' | 'monthly';
    from: number;
    to: number;
  };
  result?: LimitChangeResult;
}

export interface ApprovalStatusResult {
  success: boolean;
  has_pending: boolean;
  approval?: ApprovalRequest;
  message?: string;
}

export interface ConfirmActionResult {
  success: boolean;
  error?: string;
  message?: string;
  action_taken?: string;
  result?: OptimizationResult | LimitChangeResult;
}

// =====================================================
// TOOL EXECUTION FUNCTIONS
// =====================================================

/**
 * Execute the propose_optimization tool
 */
export async function executeProposeOptimization(
  userId: string,
  params: ProposeOptimizationParams
): Promise<ProposeOptimizationResult> {
  try {
    const { strategy, reason, auto_apply } = params;

    // If auto_apply, execute immediately
    if (auto_apply) {
      const result = await budgetActionService.optimizeUserConfig(userId, strategy, {
        userId,
        triggeredBy: 'buddy_ai',
        reason,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        applied: true,
        message: result.message,
        result,
      };
    }

    // Create approval request
    const approval = budgetActionService.createApprovalRequest(
      'optimization',
      userId,
      { strategy, reason }
    );

    // Prepare response with proposal details
    const modelMapping = {
      cost_save: { from: 'gpt-4o', to: 'gpt-4o-mini' },
      performance: { from: 'gpt-4o-mini', to: 'gpt-4o' },
    };

    return {
      success: true,
      approval_id: approval.id,
      message: strategy === 'cost_save'
        ? 'Ich schlage vor, auf das günstigere Modell gpt-4o-mini zu wechseln. Dies kann bis zu 90% Kosten sparen. Soll ich das durchführen?'
        : 'Ich schlage vor, auf das leistungsstärkere Modell gpt-4o zu wechseln für bessere Qualität. Soll ich das durchführen?',
      proposal: {
        strategy,
        changes: {
          model: modelMapping[strategy],
          autoOptimize: {
            from: strategy === 'performance',
            to: strategy === 'cost_save',
          },
        },
        estimated_savings: strategy === 'cost_save'
          ? { monthly_usd: 45.0, percentage: 90 }
          : undefined,
        expires_at: approval.expiresAt,
      },
    };
  } catch (error) {
    console.error('[ActionTools] propose_optimization failed:', error);
    return {
      success: false,
      error: 'Failed to create optimization proposal.',
    };
  }
}

/**
 * Execute the apply_limit_change tool
 */
export async function executeApplyLimitChange(
  userId: string,
  params: ApplyLimitChangeParams
): Promise<ApplyLimitChangeResult> {
  try {
    const { limit_type, new_limit, reason } = params;

    let result: LimitChangeResult;

    if (limit_type === 'daily') {
      result = await budgetActionService.updateDailyLimit(userId, new_limit, {
        userId,
        triggeredBy: 'buddy_ai',
        reason,
      });
    } else {
      result = await budgetActionService.updateMonthlyLimit(userId, new_limit, {
        userId,
        triggeredBy: 'buddy_ai',
        reason,
      });
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    const changes = limit_type === 'daily'
      ? result.changes?.dailyTokenLimit
      : result.changes?.monthlyTokenLimit;

    return {
      success: true,
      message: result.message,
      changes: changes
        ? {
            limit_type,
            from: changes.from,
            to: changes.to,
          }
        : undefined,
      result,
    };
  } catch (error) {
    console.error('[ActionTools] apply_limit_change failed:', error);
    return {
      success: false,
      error: 'Failed to update limit.',
    };
  }
}

/**
 * Execute the get_approval_status tool
 */
export function executeGetApprovalStatus(
  userId: string,
  params: GetApprovalStatusParams
): ApprovalStatusResult {
  try {
    const pending = budgetActionService.getPendingApproval(userId);

    if (!pending) {
      return {
        success: true,
        has_pending: false,
        message: 'Keine ausstehenden Genehmigungen.',
      };
    }

    return {
      success: true,
      has_pending: true,
      approval: pending,
      message: `Ausstehende Genehmigung: ${pending.type} (${pending.status})`,
    };
  } catch (error) {
    console.error('[ActionTools] get_approval_status failed:', error);
    return {
      success: false,
      has_pending: false,
      message: 'Failed to check approval status.',
    };
  }
}

/**
 * Execute the confirm_action tool
 */
export async function executeConfirmAction(
  userId: string,
  params: ConfirmActionParams
): Promise<ConfirmActionResult> {
  try {
    const { approval_id, confirmed } = params;

    const result = await budgetActionService.processApproval(
      approval_id,
      confirmed,
      {
        userId,
        triggeredBy: 'buddy_ai',
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      message: confirmed
        ? (result as OptimizationResult | LimitChangeResult).message || 'Aktion erfolgreich ausgeführt.'
        : 'Aktion abgelehnt.',
      action_taken: confirmed ? 'approved' : 'rejected',
      result: result as OptimizationResult | LimitChangeResult,
    };
  } catch (error) {
    console.error('[ActionTools] confirm_action failed:', error);
    return {
      success: false,
      error: 'Failed to process confirmation.',
    };
  }
}

// =====================================================
// TOOL ROUTER
// =====================================================

/**
 * Route and execute an action tool call
 */
export async function executeActionTool(
  toolName: string,
  userId: string,
  args: Record<string, any>
): Promise<
  | ProposeOptimizationResult
  | ApplyLimitChangeResult
  | ApprovalStatusResult
  | ConfirmActionResult
> {
  switch (toolName) {
    case 'propose_optimization': {
      const params = ProposeOptimizationSchema.parse(args);
      return executeProposeOptimization(userId, params);
    }

    case 'apply_limit_change': {
      const params = ApplyLimitChangeSchema.parse(args);
      return executeApplyLimitChange(userId, params);
    }

    case 'get_approval_status': {
      const params = GetApprovalStatusSchema.parse(args);
      return executeGetApprovalStatus(userId, params);
    }

    case 'confirm_action': {
      const params = ConfirmActionSchema.parse(args);
      return executeConfirmAction(userId, params);
    }

    default:
      throw new Error(`Unknown action tool: ${toolName}`);
  }
}

/**
 * Check if a tool name is an action tool
 */
export function isActionTool(toolName: string): boolean {
  return [
    'propose_optimization',
    'apply_limit_change',
    'get_approval_status',
    'confirm_action',
  ].includes(toolName);
}

/**
 * Get all action tools for Buddy
 */
export function getAllActionTools() {
  return BUDDY_ACTION_TOOLS;
}
