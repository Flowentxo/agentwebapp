/**
 * Buddy Tool Executor - Phase 3: Unified Tool Execution
 *
 * Combines budget tools (read-only) and action tools (write operations)
 * for the Buddy AI Agent.
 *
 * Features:
 * - Unified tool execution interface
 * - Socket.IO integration for real-time UI updates
 * - Tool logging and audit trail
 *
 * @author AI Systems Team
 * @version 1.0.0
 */

import {
  BUDDY_BUDGET_TOOLS,
  executeBudgetTool,
  isBudgetTool,
} from './budgetTools';

import {
  BUDDY_ACTION_TOOLS,
  executeActionTool,
  isActionTool,
} from './actionTools';

// =====================================================
// COMBINED TOOL LIST
// =====================================================

/**
 * Get all Buddy tools for OpenAI function calling
 */
export function getBuddyToolsForOpenAI() {
  return [...BUDDY_BUDGET_TOOLS, ...BUDDY_ACTION_TOOLS];
}

/**
 * Get only read-only budget tools (for restricted contexts)
 */
export function getBuddyReadOnlyTools() {
  return BUDDY_BUDGET_TOOLS;
}

/**
 * Get only action tools (for admin contexts)
 */
export function getBuddyActionTools() {
  return BUDDY_ACTION_TOOLS;
}

// =====================================================
// EXECUTION CONTEXT
// =====================================================

export interface BuddyToolContext {
  userId: string;
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
  socketEmitter?: (event: string, data: any) => void;
}

// =====================================================
// UNIFIED TOOL EXECUTOR
// =====================================================

/**
 * Execute any Buddy tool
 */
export async function executeBuddyTool(
  toolName: string,
  args: Record<string, any>,
  context: BuddyToolContext
): Promise<any> {
  const { userId, socketEmitter } = context;

  console.log(`[BUDDY_EXECUTOR] Executing tool: ${toolName}`, {
    userId,
    args: Object.keys(args),
  });

  try {
    let result: any;

    // Route to appropriate handler
    if (isBudgetTool(toolName)) {
      result = await executeBudgetTool(toolName, userId, args);
    } else if (isActionTool(toolName)) {
      result = await executeActionTool(toolName, userId, args);

      // Emit Socket.IO events for action tools that modify state
      if (socketEmitter && result.success) {
        emitBuddyEvents(toolName, result, socketEmitter);
      }
    } else {
      throw new Error(`Unknown Buddy tool: ${toolName}`);
    }

    console.log(`[BUDDY_EXECUTOR] Tool completed: ${toolName}`, {
      success: result.success,
      hasError: !!result.error,
    });

    return result;
  } catch (error) {
    console.error(`[BUDDY_EXECUTOR] Tool failed: ${toolName}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// =====================================================
// SOCKET.IO EVENT EMITTER
// =====================================================

/**
 * Emit real-time events for UI updates
 */
function emitBuddyEvents(
  toolName: string,
  result: any,
  emit: (event: string, data: any) => void
): void {
  switch (toolName) {
    case 'apply_limit_change':
      // Notify UI to refresh budget displays
      emit('budget:updated', {
        type: 'limit_change',
        changes: result.changes,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'propose_optimization':
      if (result.applied) {
        // Optimization was auto-applied
        emit('budget:updated', {
          type: 'optimization_applied',
          changes: result.result?.changes,
          message: result.message,
          timestamp: new Date().toISOString(),
        });
      } else if (result.approval_id) {
        // Approval pending
        emit('budget:approval_pending', {
          approvalId: result.approval_id,
          proposal: result.proposal,
          message: result.message,
          timestamp: new Date().toISOString(),
        });
      }
      break;

    case 'confirm_action':
      if (result.action_taken === 'approved') {
        emit('budget:updated', {
          type: 'approval_confirmed',
          result: result.result,
          message: result.message,
          timestamp: new Date().toISOString(),
        });
      }
      break;
  }
}

// =====================================================
// TOOL DISPLAY HELPERS
// =====================================================

/**
 * Get display name for tool (for UI)
 */
export function getBuddyToolDisplay(toolName: string): string {
  const displayNames: Record<string, string> = {
    // Budget tools (read-only)
    get_wallet_status: 'Wallet-Status abrufen',
    get_spending_analysis: 'Ausgaben analysieren',
    check_forecast: 'Prognose berechnen',
    // Action tools
    propose_optimization: 'Optimierung vorschlagen',
    apply_limit_change: 'Limit ändern',
    get_approval_status: 'Genehmigung prüfen',
    confirm_action: 'Aktion bestätigen',
  };

  return displayNames[toolName] || toolName;
}

/**
 * Check if tool is a Buddy tool
 */
export function isBuddyTool(toolName: string): boolean {
  return isBudgetTool(toolName) || isActionTool(toolName);
}

/**
 * Check if tool modifies state (requires confirmation)
 */
export function isModifyingTool(toolName: string): boolean {
  return ['apply_limit_change', 'propose_optimization', 'confirm_action'].includes(toolName);
}

// =====================================================
// TOOL VALIDATION
// =====================================================

/**
 * Validate tool arguments before execution
 */
export function validateToolArgs(
  toolName: string,
  args: Record<string, any>
): { valid: boolean; error?: string } {
  // Basic validation - specific validation is done by Zod schemas in tool files
  if (!toolName) {
    return { valid: false, error: 'Tool name is required' };
  }

  if (!args || typeof args !== 'object') {
    return { valid: false, error: 'Tool arguments must be an object' };
  }

  // Tool-specific validation
  switch (toolName) {
    case 'apply_limit_change':
      if (args.new_limit && (args.new_limit < 1000 || args.new_limit > 10000000)) {
        return { valid: false, error: 'Limit must be between 1,000 and 10,000,000' };
      }
      break;

    case 'propose_optimization':
      if (args.strategy && !['cost_save', 'performance'].includes(args.strategy)) {
        return { valid: false, error: 'Strategy must be "cost_save" or "performance"' };
      }
      break;
  }

  return { valid: true };
}
