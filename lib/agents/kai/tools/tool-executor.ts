/**
 * Kai Tool Executor
 *
 * Executes code assistant tools based on OpenAI function call responses.
 */

import { executeCode, CodeExecuteInput } from './code-execute';
import { analyzeCode, CodeAnalyzeInput } from './code-analyze';
import { reviewCode, CodeReviewInput } from './code-review';
import { formatCode, CodeFormatInput } from './code-format';
import { explainCode, CodeExplainInput } from './code-explain';
import { convertCode, CodeConvertInput } from './code-convert';
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
  code_execute: 'Code-Ausfuehrung',
  code_analyze: 'Code-Analyse',
  code_review: 'Code-Review',
  code_format: 'Code-Formatierung',
  code_explain: 'Code-Erklaerung',
  code_convert: 'Code-Konvertierung',
};

export function getKaiToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeKaiTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[KAI_TOOL] Executing ${toolName}`, { userId, args: { ...args, code: args.code?.substring(0, 100) + '...' } });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'code_execute': {
        const input: CodeExecuteInput = {
          code: args.code,
          language: args.language || 'javascript',
          timeout_ms: args.timeout_ms,
        };
        const execResult = await executeCode(input);
        result = {
          success: execResult.success,
          data: execResult,
          error: execResult.error,
          summary: execResult.success
            ? `Code ausgefuehrt in ${execResult.execution_time_ms}ms`
            : `Fehler: ${(execResult.error || '').split('\n').slice(0, 5).join('\n')}`,
        };
        break;
      }

      case 'code_analyze': {
        const input: CodeAnalyzeInput = {
          code: args.code,
          language: args.language,
          focus: args.focus || 'all',
        };
        const analyzeResult = await analyzeCode(input);
        result = {
          success: true,
          data: analyzeResult,
          summary: `Analyse: ${analyzeResult.lines_of_code} Zeilen, Komplexitaet ${analyzeResult.complexity.level}, ${analyzeResult.issues.length} Issues`,
        };
        break;
      }

      case 'code_review': {
        const input: CodeReviewInput = {
          code: args.code,
          language: args.language,
          context: args.context,
          focus: args.focus || 'all',
        };
        const reviewResult = await reviewCode(input);
        result = {
          success: reviewResult.rating > 0,
          data: reviewResult,
          summary: `Review: ${reviewResult.rating}/10 - ${reviewResult.summary}`,
        };
        break;
      }

      case 'code_format': {
        const input: CodeFormatInput = {
          code: args.code,
          language: args.language,
          indent_size: args.indent_size,
          style: args.style,
        };
        const formatResult = await formatCode(input);
        result = {
          success: true,
          data: formatResult,
          summary: `Formatiert: ${formatResult.changes_made.length} Aenderungen`,
        };
        break;
      }

      case 'code_explain': {
        const input: CodeExplainInput = {
          code: args.code,
          language: args.language,
          detail_level: args.detail_level || 'detailed',
        };
        const explainResult = await explainCode(input);
        result = {
          success: !!explainResult.explanation,
          data: explainResult,
          summary: `Erklaerung generiert (${explainResult.key_concepts.length} Konzepte)`,
        };
        break;
      }

      case 'code_convert': {
        const input: CodeConvertInput = {
          code: args.code,
          source_language: args.source_language,
          target_language: args.target_language,
          preserve_comments: args.preserve_comments,
        };
        const convertResult = await convertCode(input);
        result = {
          success: !!convertResult.converted_code,
          data: convertResult,
          summary: `Konvertiert: ${args.source_language} → ${args.target_language}`,
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
    console.log(`[KAI_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'kai',
        toolName,
        { ...args, code: args.code?.substring(0, 200) },
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId
      );
    } catch (logError) {
      console.error('[KAI_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[KAI_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getKaiToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'kai', toolName,
        { ...args, code: args.code?.substring(0, 200) },
        { success: false, error: error.message, summary: `${getKaiToolDisplay(toolName)} fehlgeschlagen` },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
