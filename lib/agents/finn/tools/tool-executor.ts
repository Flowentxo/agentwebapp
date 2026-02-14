/**
 * Finn Tool Executor
 *
 * Executes finance strategy tools based on OpenAI function call responses.
 */

import { analyzePortfolioRisk, AnalyzePortfolioInput } from './finance-strategy-tools';
import { compareLoanRates, CompareLoanInput } from './finance-strategy-tools';
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
  analyze_portfolio_risk: 'Portfolio-Risikoanalyse',
  compare_loan_rates: 'Kreditvergleich',
};

export function getFinnToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeFinnTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[FINN_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'analyze_portfolio_risk': {
        const input: AnalyzePortfolioInput = { assets: args.assets };
        const riskResult = await analyzePortfolioRisk(input);
        result = {
          success: true,
          data: riskResult,
          summary: `Portfolio ${riskResult.total_value.toLocaleString('de-DE')}€: Diversifikation ${riskResult.diversification_score}/100, Risiko ${riskResult.risk_level}, Sharpe ${riskResult.risk_metrics.sharpe_ratio}`,
        };
        break;
      }

      case 'compare_loan_rates': {
        const input: CompareLoanInput = {
          amount: args.amount,
          duration_months: args.duration_months,
          type: args.type,
        };
        const loanResult = await compareLoanRates(input);
        result = {
          success: true,
          data: loanResult,
          summary: `${loanResult.offers.length} Angebote verglichen: Bestes Angebot ${loanResult.best_offer} (${loanResult.offers[0].interest_rate}%), Ersparnis bis ${loanResult.savings_vs_worst.toLocaleString('de-DE')}€`,
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
    console.log(`[FINN_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'finn', toolName, args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[FINN_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[FINN_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getFinnToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'finn', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
