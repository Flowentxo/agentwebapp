/**
 * Ari Tool Executor
 *
 * Executes automation tools based on OpenAI function call responses.
 */

import { listActiveWorkflows } from './automation-tools';
import { triggerWorkflow, TriggerWorkflowInput } from './automation-tools';
import { checkSystemHealth } from './automation-tools';
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
  list_active_workflows: 'Workflows auflisten',
  trigger_workflow: 'Workflow starten',
  check_system_health: 'System-Health-Check',
};

export function getAriToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeAriTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[ARI_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'list_active_workflows': {
        const listResult = await listActiveWorkflows();
        const srcLabel = listResult.source === 'database' ? 'DB' : 'Mock';
        result = {
          success: true,
          data: listResult,
          summary: `${listResult.total} Workflows (${srcLabel}): ${listResult.workflows.filter(w => w.status === 'active').length} aktiv, ${listResult.workflows.filter(w => w.status === 'draft').length} Entwurf`,
        };
        break;
      }

      case 'trigger_workflow': {
        const input: TriggerWorkflowInput = {
          workflow_id: args.workflow_id,
          input_data: args.input_data,
        };
        const triggerResult = await triggerWorkflow(input);
        result = {
          success: triggerResult.status !== 'error',
          data: triggerResult,
          summary: triggerResult.status === 'error'
            ? `Workflow ${args.workflow_id} nicht gefunden`
            : `Workflow "${triggerResult.workflow_name}" gestartet (${triggerResult.execution_id}), ${triggerResult.node_count} Knoten`,
        };
        break;
      }

      case 'check_system_health': {
        const healthResult = await checkSystemHealth();
        result = {
          success: true,
          data: healthResult,
          summary: `System ${healthResult.overall_status} (${healthResult.source}): ${healthResult.summary}`,
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
    console.log(`[ARI_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'ari', toolName, args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[ARI_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[ARI_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getAriToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'ari', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
