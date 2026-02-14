/**
 * Aura Tool Executor
 *
 * Executes brand strategy & marketing tools based on OpenAI function call responses.
 */

import { generateSocialPost, GenerateSocialPostInput } from './marketing-tools';
import { createContentCalendar, CreateContentCalendarInput } from './marketing-tools';
import { analyzeCompetitor, AnalyzeCompetitorInput } from './marketing-tools';
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
  generate_social_post: 'Social-Media-Post erstellen',
  create_content_calendar: 'Content-Kalender erstellen',
  analyze_competitor: 'Wettbewerber-Analyse',
};

export function getAuraToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeAuraTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[AURA_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'generate_social_post': {
        const input: GenerateSocialPostInput = {
          platform: args.platform,
          topic: args.topic,
        };
        const postResult = await generateSocialPost(input);
        result = {
          success: true,
          data: postResult,
          summary: `${postResult.platform}-Post erstellt (${postResult.character_count} Zeichen, ${postResult.hashtags.length} Hashtags)`,
        };
        break;
      }

      case 'create_content_calendar': {
        const input: CreateContentCalendarInput = {
          month: args.month,
          topics: args.topics,
        };
        const calendarResult = await createContentCalendar(input);
        result = {
          success: true,
          data: calendarResult,
          summary: `Content-Kalender fuer ${calendarResult.month}: ${calendarResult.total_posts} Posts geplant ueber 4 Wochen`,
        };
        break;
      }

      case 'analyze_competitor': {
        const input: AnalyzeCompetitorInput = { url: args.url };
        const analysisResult = await analyzeCompetitor(input);
        result = {
          success: true,
          data: analysisResult,
          summary: `${analysisResult.company_name}: SEO ${analysisResult.seo_score}/100, ${analysisResult.estimated_traffic}, ${analysisResult.recommendations.length} Empfehlungen`,
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
    console.log(`[AURA_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'aura', toolName, args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[AURA_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[AURA_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getAuraToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'aura', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
