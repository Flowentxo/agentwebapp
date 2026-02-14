/**
 * Nova Tool Executor
 *
 * Fuehrt Research-Tools basierend auf OpenAI Function-Call-Responses aus.
 */

import { webSearch, WebSearchInput } from './web-search';
import { webScrape, WebScrapeInput } from './web-scrape';
import { researchCompile, ResearchCompileInput } from './research-compile';
import { trendAnalyze, TrendAnalyzeInput } from './trend-analyze';
import { chartGenerate, ChartGenerateInput } from './chart-generate';
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
  web_search: 'Web-Suche',
  web_scrape: 'Web-Scraping',
  research_compile: 'Research-Zusammenstellung',
  trend_analyze: 'Trend-Analyse',
  chart_generate: 'Chart-Erstellung',
};

export function getNovaToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeNovaTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[NOVA_TOOL] Executing ${toolName}`, { userId, args: { ...args, content: args.content?.substring(0, 100) } });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'web_search': {
        const input: WebSearchInput = {
          query: args.query,
          num_results: args.num_results,
          language: args.language,
        };
        const searchResult = await webSearch(input);
        result = {
          success: searchResult.results.length > 0,
          data: searchResult,
          summary: searchResult.results.length > 0
            ? `${searchResult.results.length} Ergebnisse fuer "${args.query}" gefunden`
            : `Keine Ergebnisse fuer "${args.query}" gefunden`,
        };
        break;
      }

      case 'web_scrape': {
        const input: WebScrapeInput = {
          url: args.url,
          selector: args.selector,
          extract: args.extract || 'text',
        };
        const scrapeResult = await webScrape(input);
        result = {
          success: !!scrapeResult.content || (scrapeResult.links?.length || 0) > 0 || (scrapeResult.images?.length || 0) > 0,
          data: scrapeResult,
          summary: scrapeResult.word_count > 0
            ? `${scrapeResult.word_count} Woerter von ${args.url} extrahiert`
            : `Inhalt von ${args.url} gescrapt`,
        };
        break;
      }

      case 'research_compile': {
        const input: ResearchCompileInput = {
          topic: args.topic,
          sources: args.sources || [],
          format: args.format || 'summary',
          max_length: args.max_length,
        };
        const compileResult = await researchCompile(input);
        result = {
          success: !!compileResult.compiled && compileResult.source_count > 0,
          data: compileResult,
          summary: `Research zu "${args.topic}" aus ${compileResult.source_count} Quellen kompiliert (${compileResult.key_findings.length} Kernerkenntnisse)`,
        };
        break;
      }

      case 'trend_analyze': {
        const input: TrendAnalyzeInput = {
          topic: args.topic,
          data_points: args.data_points,
          timeframe: args.timeframe,
          industry: args.industry,
        };
        const trendResult = await trendAnalyze(input);
        result = {
          success: trendResult.trends.length > 0,
          data: trendResult,
          summary: `${trendResult.trends.length} Trends zu "${args.topic}" identifiziert, ${trendResult.predictions.length} Vorhersagen`,
        };
        break;
      }

      case 'chart_generate': {
        const input: ChartGenerateInput = {
          data: args.data || [],
          chart_type: args.chart_type || 'bar',
          title: args.title,
          color_scheme: args.color_scheme,
        };
        const chartResult = await chartGenerate(input);
        result = {
          success: chartResult.data_points > 0,
          data: chartResult,
          summary: `${chartResult.chart_type}-Chart mit ${chartResult.data_points} Datenpunkten generiert`,
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
    console.log(`[NOVA_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'nova',
        toolName,
        { ...args, content: args.content?.substring(0, 200) },
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId
      );
    } catch (logError) {
      console.error('[NOVA_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[NOVA_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getNovaToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'nova', toolName,
        { ...args, content: args.content?.substring(0, 200) },
        { success: false, error: error.message, summary: `${getNovaToolDisplay(toolName)} fehlgeschlagen` },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
