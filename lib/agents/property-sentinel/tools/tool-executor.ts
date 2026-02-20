/**
 * Property Sentinel Tool Executor
 *
 * Executes sentinel tools based on OpenAI function call responses.
 */

import { executeSearchManager, type SearchManagerInput } from './search-manager';
import { executeMarketRadar, type MarketRadarInput } from './market-radar';
import { executeDealQualifier, type DealQualifierInput } from './deal-qualifier';
import { executePipelineSync, type PipelineSyncInput } from './pipeline-sync';
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
  search_manager: 'Suchprofil-Manager',
  market_radar: 'Markt-Radar',
  deal_qualifier: 'Deal-Bewerter',
  pipeline_sync: 'Pipeline-Sync',
};

export function getSentinelToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeSentinelTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[SENTINEL_TOOL] Executing ${toolName}`, { userId, args: summarizeArgs(args) });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'search_manager': {
        const input: SearchManagerInput = {
          action: args.action,
          profile_id: args.profile_id,
          criteria: args.criteria,
          frequency: args.frequency,
          portals: args.portals,
          min_score: args.min_score,
        };
        const smResult = await executeSearchManager(input, { userId, workspaceId: context.workspaceId });
        result = {
          success: true,
          data: smResult,
          summary: smResult.formatted_output.split('\n')[0] || `Suchprofil: ${args.action}`,
        };
        break;
      }

      case 'market_radar': {
        const input: MarketRadarInput = {
          profile_id: args.profile_id,
          portals: args.portals,
          dry_run: args.dry_run,
        };
        const mrResult = await executeMarketRadar(input, { userId });
        result = {
          success: true,
          data: mrResult,
          summary: `Scan: ${mrResult.scan_summary.total_new} neue Inserate, ${mrResult.scan_summary.total_scraped} gescannt`,
        };
        break;
      }

      case 'deal_qualifier': {
        const input: DealQualifierInput = {
          listing_ids: args.listing_ids,
          profile_id: args.profile_id,
        };
        const dqResult = await executeDealQualifier(input, { userId });
        result = {
          success: true,
          data: dqResult,
          summary: `Bewertung: ${dqResult.summary.total_evaluated} Listings, Durchschnitt ${dqResult.summary.avg_score}/100`,
        };
        break;
      }

      case 'pipeline_sync': {
        const input: PipelineSyncInput = {
          profile_id: args.profile_id,
          min_score: args.min_score,
          listing_ids: args.listing_ids,
          notify: args.notify,
        };
        const psResult = await executePipelineSync(input, { userId });
        result = {
          success: true,
          data: psResult,
          summary: `Pipeline: ${psResult.pushed} Deals uebernommen, Avg Score ${psResult.avg_score}`,
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
    console.log(`[SENTINEL_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'property-sentinel',
        toolName,
        summarizeArgs(args),
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId,
      );
    } catch (logError) {
      console.error('[SENTINEL_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[SENTINEL_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getSentinelToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'property-sentinel', toolName,
        summarizeArgs(args),
        { success: false, error: error.message },
        executionTime, context.sessionId,
      );
    } catch {}

    return errorResult;
  }
}

function summarizeArgs(args: Record<string, any>): Record<string, any> {
  const summary = { ...args };
  // Truncate listing_ids if too many
  if (summary.listing_ids?.length > 5) {
    summary.listing_ids = [...summary.listing_ids.slice(0, 5), `... +${summary.listing_ids.length - 5} more`];
  }
  return summary;
}
