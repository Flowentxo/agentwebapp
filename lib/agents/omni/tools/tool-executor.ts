/**
 * Omni Tool Executor
 *
 * Executes orchestration tools based on OpenAI function call responses.
 */

import { delegateToAgent, DelegateTaskInput } from './delegate-task';
import { decomposeTask, DecomposeTaskInput } from './decompose-task';
import { synthesizeResults, SynthesizeResultsInput } from './synthesize-results';
import { searchAgentMemories, SearchMemoriesInput } from './search-memories';
import { toolLoggingService } from '@/server/services/ToolLoggingService';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface ToolExecutionContext {
  userId: string;
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  delegate_to_agent: 'Agent-Delegation',
  decompose_task: 'Task-Zerlegung',
  synthesize_results: 'Ergebnis-Synthese',
  search_agent_memories: 'Erinnerungssuche',
};

export function getOmniToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeOmniTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[OMNI_TOOL] Executing ${toolName}`, { userId, args: summarizeArgs(args) });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'delegate_to_agent': {
        const input: DelegateTaskInput = {
          agent_id: args.agent_id,
          task: args.task,
          context: args.context,
        };
        const delegateResult = await delegateToAgent(input, {
          userId: context.userId,
          workspaceId: context.workspaceId,
          sessionId: context.sessionId,
        });
        result = {
          success: delegateResult.success,
          data: delegateResult,
          error: delegateResult.success ? undefined : delegateResult.response,
          summary: delegateResult.success
            ? `${delegateResult.agent_name} hat geantwortet (${delegateResult.tools_used.length} Tools)`
            : `Delegation an ${args.agent_id} fehlgeschlagen`,
        };
        break;
      }

      case 'decompose_task': {
        const input: DecomposeTaskInput = {
          task: args.task,
          context: args.context,
          max_subtasks: args.max_subtasks,
        };
        const decomposeResult = await decomposeTask(input);
        result = {
          success: decomposeResult.subtasks.length > 0,
          data: decomposeResult,
          summary: `Task in ${decomposeResult.subtasks.length} Sub-Tasks zerlegt`,
        };
        break;
      }

      case 'synthesize_results': {
        const input: SynthesizeResultsInput = {
          results: args.results,
          original_task: args.original_task,
          format: args.format,
        };
        const synthesizeResult = await synthesizeResults(input);
        result = {
          success: !!synthesizeResult.synthesis,
          data: synthesizeResult,
          summary: `Synthese: ${synthesizeResult.key_findings.length} Kernergebnisse`,
        };
        break;
      }

      case 'search_agent_memories': {
        const input: SearchMemoriesInput = {
          query: args.query,
          agent_filter: args.agent_filter,
          limit: args.limit,
        };
        const memoryResult = await searchAgentMemories(input, userId);
        result = {
          success: memoryResult.total_found > 0,
          data: memoryResult,
          summary: `${memoryResult.total_found} Erinnerungen gefunden fuer "${args.query.slice(0, 50)}"`,
        };
        break;
      }

      default:
        result = {
          success: false,
          error: `Unbekanntes Tool: ${toolName}`,
          summary: `Tool "${toolName}" ist nicht implementiert`,
        };
    }

    const executionTime = Date.now() - startTime;
    console.log(`[OMNI_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'omni',
        toolName,
        summarizeArgs(args),
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId
      );
    } catch (logError) {
      console.error('[OMNI_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[OMNI_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getOmniToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'omni', toolName,
        summarizeArgs(args),
        { success: false, error: error.message, summary: `${getOmniToolDisplay(toolName)} fehlgeschlagen` },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}

/**
 * Summarize args for logging (truncate large values)
 */
function summarizeArgs(args: Record<string, any>): Record<string, any> {
  const summary: Record<string, any> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.length > 200) {
      summary[key] = value.substring(0, 200) + '...';
    } else if (Array.isArray(value)) {
      summary[key] = `[${value.length} items]`;
    } else {
      summary[key] = value;
    }
  }
  return summary;
}
