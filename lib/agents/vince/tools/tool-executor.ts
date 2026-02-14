/**
 * Vince Tool Executor
 *
 * Executes video production tools based on OpenAI function call responses.
 */

import { writeScript, WriteScriptInput } from './video-tools';
import { createStoryboard, CreateStoryboardInput } from './video-tools';
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
  write_script: 'Video-Skript schreiben',
  create_storyboard: 'Storyboard erstellen',
};

export function getVinceToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeVinceTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[VINCE_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'write_script': {
        const input: WriteScriptInput = {
          topic: args.topic,
          duration_seconds: args.duration_seconds || 60,
        };
        const scriptResult = await writeScript(input);
        result = {
          success: true,
          data: scriptResult,
          summary: `Skript "${scriptResult.topic}" erstellt: ${scriptResult.scenes.length} Szenen, ${scriptResult.total_duration_seconds}s`,
        };
        break;
      }

      case 'create_storyboard': {
        const input: CreateStoryboardInput = { scenes: args.scenes };
        const boardResult = await createStoryboard(input);
        result = {
          success: true,
          data: boardResult,
          summary: `Storyboard erstellt: ${boardResult.total_scenes} Szenen mit Kameraeinstellungen und Uebergaengen`,
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
    console.log(`[VINCE_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'vince', toolName, args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[VINCE_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[VINCE_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getVinceToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'vince', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
