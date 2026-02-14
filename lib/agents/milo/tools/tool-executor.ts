/**
 * Milo Tool Executor
 *
 * Executes motion design tools based on OpenAI function call responses.
 */

import { generateCssAnimation, GenerateCssAnimationInput } from './motion-tools';
import { generateSvgPath, GenerateSvgPathInput } from './motion-tools';
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
  generate_css_animation: 'CSS-Animation generieren',
  generate_svg_path: 'SVG-Pfad generieren',
};

export function getMiloToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeMiloTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[MILO_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'generate_css_animation': {
        const input: GenerateCssAnimationInput = {
          type: args.type,
          duration: args.duration,
          easing: args.easing,
        };
        const animResult = await generateCssAnimation(input);
        result = {
          success: true,
          data: animResult,
          summary: `CSS ${animResult.type}-Animation generiert (${animResult.duration}, ${animResult.easing}, ${animResult.keyframes_count} Keyframes)`,
        };
        break;
      }

      case 'generate_svg_path': {
        const input: GenerateSvgPathInput = {
          shape: args.shape,
          size: args.size,
        };
        const svgResult = await generateSvgPath(input);
        result = {
          success: true,
          data: svgResult,
          summary: `SVG ${svgResult.shape} generiert (${svgResult.size}px)`,
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
    console.log(`[MILO_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'milo', toolName, args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[MILO_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[MILO_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getMiloToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'milo', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
