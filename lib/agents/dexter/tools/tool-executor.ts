/**
 * Dexter Tool Executor
 *
 * Executes financial analysis tools based on OpenAI function call responses.
 * Maps tool names to calculator functions.
 */

import { calculateROI, ROIInput, ROIResult } from './roi-calculator';
import { forecastSales, SalesForecastInput, SalesForecastResult } from './sales-forecaster';
import { calculatePnL, PnLInput, PnLResult } from './pnl-calculator';
import { calculateBreakEven, BreakEvenInput, BreakEvenResult } from './break-even-calculator';
import { calculateCashFlow, CashFlowInput, CashFlowResult } from './cash-flow-calculator';
import { generateBalanceSheet, BalanceSheetInput, BalanceSheetResult } from './balance-sheet-generator';
import { fetchTransactions, StripeFetchInput, StripeFetchResult } from './stripe-fetch';
import { renderChart, ChartRenderInput, ChartRenderResult, validateChartConfig } from './chart-render';
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
  conversationId?: string;
  requestId?: string;
}

export interface ToolExecutionLog {
  toolName: string;
  args: Record<string, any>;
  result: ToolResult;
  executionTime: number;
  timestamp: Date;
}

/**
 * Tool display names for user-friendly output
 */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  calculate_roi: 'ROI-Berechnung',
  forecast_sales: 'Sales Forecast',
  calculate_pnl: 'P&L-Analyse',
  calculate_break_even: 'Break-Even-Analyse',
  calculate_cash_flow: 'Cashflow-Analyse',
  generate_balance_sheet: 'Bilanz-Erstellung',
  fetch_transactions: '💳 Stripe-Transaktionen',
  render_chart: '📊 Chart-Erstellung',
};

/**
 * Get display name for tool
 */
export function getToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

/**
 * Execute a Dexter financial tool
 */
export async function executeDexterTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[DEXTER_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      // ============================================================
      // ROI Calculator
      // ============================================================
      case 'calculate_roi': {
        const roiInput: ROIInput = {
          investment_cost: args.investment_cost,
          revenue_generated: args.revenue_generated,
          timeframe_months: args.timeframe_months,
          recurring_costs: args.recurring_costs,
        };
        const roiResult = await calculateROI(roiInput);
        result = {
          success: true,
          data: roiResult,
          summary: `ROI: ${roiResult.metrics.roi} (${roiResult.roi_category})`,
        };
        break;
      }

      // ============================================================
      // Sales Forecaster
      // ============================================================
      case 'forecast_sales': {
        const forecastInput: SalesForecastInput = {
          historical_data: args.historical_data,
          forecast_periods: args.forecast_periods,
          period_type: args.period_type,
        };
        const forecastResult = await forecastSales(forecastInput);
        result = {
          success: true,
          data: forecastResult,
          summary: `Forecast: ${forecastResult.forecast.length} Perioden, Trend: ${forecastResult.trend}`,
        };
        break;
      }

      // ============================================================
      // P&L Calculator
      // ============================================================
      case 'calculate_pnl': {
        const pnlInput: PnLInput = {
          revenue: args.revenue,
          cost_of_goods_sold: args.cost_of_goods_sold,
          operating_expenses: args.operating_expenses,
          other_income: args.other_income,
          other_expenses: args.other_expenses,
          tax_rate: args.tax_rate,
          period: args.period,
        };
        const pnlResult = await calculatePnL(pnlInput);
        result = {
          success: true,
          data: pnlResult,
          summary: `Nettogewinn: ${pnlResult.metrics.net_profit} (${pnlResult.performance})`,
        };
        break;
      }

      // ============================================================
      // Break-Even Calculator
      // ============================================================
      case 'calculate_break_even': {
        const breakEvenInput: BreakEvenInput = {
          fixed_costs: args.fixed_costs,
          variable_cost_per_unit: args.variable_cost_per_unit,
          price_per_unit: args.price_per_unit,
          current_sales_units: args.current_sales_units,
          target_profit: args.target_profit,
        };
        const breakEvenResult = await calculateBreakEven(breakEvenInput);
        result = {
          success: true,
          data: breakEvenResult,
          summary: `Break-Even: ${breakEvenResult.metrics.break_even_units}`,
        };
        break;
      }

      // ============================================================
      // Cash Flow Calculator
      // ============================================================
      case 'calculate_cash_flow': {
        const cashFlowInput: CashFlowInput = {
          operating_cash_flow: args.operating_cash_flow,
          investing_cash_flow: args.investing_cash_flow,
          financing_cash_flow: args.financing_cash_flow,
          beginning_cash: args.beginning_cash,
          capital_expenditures: args.capital_expenditures,
          period: args.period,
        };
        const cashFlowResult = await calculateCashFlow(cashFlowInput);
        result = {
          success: true,
          data: cashFlowResult,
          summary: `Cashflow: ${cashFlowResult.metrics.net_change} (${cashFlowResult.cash_flow_status})`,
        };
        break;
      }

      // ============================================================
      // Balance Sheet Generator
      // ============================================================
      case 'generate_balance_sheet': {
        const balanceSheetInput: BalanceSheetInput = {
          assets: args.assets,
          liabilities: args.liabilities,
          equity: args.equity,
          period: args.period,
        };
        const balanceSheetResult = await generateBalanceSheet(balanceSheetInput);
        result = {
          success: true,
          data: balanceSheetResult,
          summary: `Bilanzsumme: ${balanceSheetResult.metrics.total_assets} (${balanceSheetResult.health_status})`,
        };
        break;
      }

      // ============================================================
      // Stripe Transactions
      // ============================================================
      case 'fetch_transactions': {
        const stripeInput: StripeFetchInput = {
          limit: args.limit,
          status: args.status,
          date_from: args.date_from,
          date_to: args.date_to,
          currency: args.currency,
        };
        const stripeResult = await fetchTransactions(stripeInput);
        result = {
          success: true,
          data: stripeResult,
          summary: `${stripeResult.total_count} Transaktionen, Umsatz: ${(stripeResult.total_amount / 100).toLocaleString('de-DE')} ${stripeResult.currency.toUpperCase()}`,
        };
        break;
      }

      // ============================================================
      // Chart Renderer
      // ============================================================
      case 'render_chart': {
        const chartInput: ChartRenderInput = {
          chart_type: args.chart_type,
          title: args.title,
          data: args.data,
          options: args.options,
        };
        const chartResult = await renderChart(chartInput);
        const validation = validateChartConfig(chartResult.chart_config);
        if (!validation.valid) {
          result = {
            success: false,
            error: `Chart-Validierung fehlgeschlagen: ${validation.errors.join('; ')}`,
            data: { validation_errors: validation.errors, original_input: args },
            summary: `Chart-Validierung fehlgeschlagen: ${validation.errors.length} Fehler`,
          };
        } else {
          result = {
            success: true,
            data: {
              ...chartResult,
              ...(validation.warnings.length > 0 ? { validation_warnings: validation.warnings } : {}),
            },
            summary: chartResult.summary,
          };
        }
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
    console.log(`[DEXTER_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log execution to database for analytics
    logToolExecution(
      {
        toolName,
        args,
        result,
        executionTime,
        timestamp: new Date(),
      },
      context
    );

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[DEXTER_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    // Log failed executions too
    logToolExecution(
      {
        toolName,
        args,
        result: errorResult,
        executionTime,
        timestamp: new Date(),
      },
      context
    );

    return errorResult;
  }
}

/**
 * Log tool execution to database (for analytics and debugging)
 */
async function logToolExecution(
  log: ToolExecutionLog,
  context: ToolExecutionContext
): Promise<void> {
  // Log to database using ToolLoggingService
  try {
    await toolLoggingService.quickLog(
      context.userId,
      'dexter', // agentId
      log.toolName,
      log.args,
      {
        success: log.result.success,
        data: log.result.data,
        error: log.result.error,
        summary: log.result.summary,
      },
      log.executionTime,
      context.sessionId
    );
  } catch (error) {
    // Don't let logging errors break the main flow
    console.error('[DEXTER_TOOL_LOG] Failed to log to database:', error);
  }

  // Also log to console for immediate visibility
  console.log('[DEXTER_TOOL_LOG]', {
    tool: log.toolName,
    success: log.result.success,
    time: log.executionTime,
    timestamp: log.timestamp.toISOString(),
  });
}

/**
 * Validate and sanitize tool arguments
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedArgs?: Record<string, any>;
  warnings?: string[];
}

export function validateToolArgs(
  toolName: string,
  args: Record<string, any>
): ValidationResult {
  const warnings: string[] = [];
  const sanitizedArgs = { ...args };

  switch (toolName) {
    case 'calculate_roi':
      if (typeof args.investment_cost !== 'number' || args.investment_cost <= 0) {
        return { valid: false, error: 'investment_cost muss eine positive Zahl sein' };
      }
      if (typeof args.revenue_generated !== 'number') {
        return { valid: false, error: 'revenue_generated ist erforderlich' };
      }
      if (typeof args.timeframe_months !== 'number' || args.timeframe_months <= 0) {
        return { valid: false, error: 'timeframe_months muss positiv sein' };
      }
      break;

    case 'forecast_sales':
      if (!Array.isArray(args.historical_data) || args.historical_data.length < 3) {
        return { valid: false, error: 'Mindestens 3 historische Datenpunkte erforderlich' };
      }
      if (typeof args.forecast_periods !== 'number' || args.forecast_periods <= 0) {
        return { valid: false, error: 'forecast_periods muss positiv sein' };
      }
      if (args.forecast_periods > 24) {
        sanitizedArgs.forecast_periods = 24;
        warnings.push('forecast_periods auf 24 begrenzt');
      }
      break;

    case 'calculate_pnl':
      if (typeof args.revenue !== 'number' || args.revenue < 0) {
        return { valid: false, error: 'revenue muss eine nicht-negative Zahl sein' };
      }
      if (typeof args.cost_of_goods_sold !== 'number' || args.cost_of_goods_sold < 0) {
        return { valid: false, error: 'cost_of_goods_sold muss nicht-negativ sein' };
      }
      if (typeof args.operating_expenses !== 'number' || args.operating_expenses < 0) {
        return { valid: false, error: 'operating_expenses muss nicht-negativ sein' };
      }
      break;

    case 'calculate_break_even':
      if (typeof args.fixed_costs !== 'number' || args.fixed_costs < 0) {
        return { valid: false, error: 'fixed_costs muss nicht-negativ sein' };
      }
      if (typeof args.variable_cost_per_unit !== 'number' || args.variable_cost_per_unit < 0) {
        return { valid: false, error: 'variable_cost_per_unit muss nicht-negativ sein' };
      }
      if (typeof args.price_per_unit !== 'number' || args.price_per_unit <= 0) {
        return { valid: false, error: 'price_per_unit muss positiv sein' };
      }
      if (args.price_per_unit <= args.variable_cost_per_unit) {
        return { valid: false, error: 'Preis muss höher als variable Kosten sein' };
      }
      break;

    case 'calculate_cash_flow':
      if (typeof args.operating_cash_flow !== 'number') {
        return { valid: false, error: 'operating_cash_flow ist erforderlich' };
      }
      if (typeof args.investing_cash_flow !== 'number') {
        return { valid: false, error: 'investing_cash_flow ist erforderlich' };
      }
      if (typeof args.financing_cash_flow !== 'number') {
        return { valid: false, error: 'financing_cash_flow ist erforderlich' };
      }
      break;

    case 'generate_balance_sheet':
      if (!args.assets || typeof args.assets.current_assets !== 'number') {
        return { valid: false, error: 'assets.current_assets ist erforderlich' };
      }
      if (typeof args.assets.non_current_assets !== 'number') {
        return { valid: false, error: 'assets.non_current_assets ist erforderlich' };
      }
      if (!args.liabilities || typeof args.liabilities.current_liabilities !== 'number') {
        return { valid: false, error: 'liabilities.current_liabilities ist erforderlich' };
      }
      if (typeof args.liabilities.long_term_liabilities !== 'number') {
        return { valid: false, error: 'liabilities.long_term_liabilities ist erforderlich' };
      }
      if (typeof args.equity !== 'number') {
        return { valid: false, error: 'equity ist erforderlich' };
      }
      break;

    case 'fetch_transactions':
      // All parameters optional, no strict validation needed
      if (args.limit && (typeof args.limit !== 'number' || args.limit < 1)) {
        return { valid: false, error: 'limit muss eine positive Zahl sein' };
      }
      break;

    case 'render_chart':
      if (!args.chart_type) {
        return { valid: false, error: 'chart_type ist erforderlich' };
      }
      if (!args.title) {
        return { valid: false, error: 'title ist erforderlich' };
      }
      if (!args.data?.labels || !Array.isArray(args.data.labels)) {
        return { valid: false, error: 'data.labels ist erforderlich (Array)' };
      }
      if (!args.data?.datasets || !Array.isArray(args.data.datasets)) {
        return { valid: false, error: 'data.datasets ist erforderlich (Array)' };
      }
      break;
  }

  return {
    valid: true,
    sanitizedArgs,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get a human-readable description of what a tool call will do
 */
export function getToolActionDescription(
  toolName: string,
  args: Record<string, any>
): string {
  switch (toolName) {
    case 'calculate_roi':
      return `Berechne ROI für Investition von ${args.investment_cost}€ über ${args.timeframe_months} Monate`;
    case 'forecast_sales':
      return `Erstelle Sales Forecast für ${args.forecast_periods} Perioden`;
    case 'calculate_pnl':
      return `Erstelle P&L für Umsatz von ${args.revenue}€`;
    case 'calculate_break_even':
      return `Berechne Break-Even bei Fixkosten von ${args.fixed_costs}€`;
    case 'calculate_cash_flow':
      return `Analysiere Cashflow mit operativem CF von ${args.operating_cash_flow}€`;
    case 'generate_balance_sheet':
      return `Erstelle Bilanz mit Aktiva von ${args.assets?.current_assets + args.assets?.non_current_assets}€`;
    case 'fetch_transactions':
      return `Lade Stripe-Transaktionen${args.date_from ? ` ab ${args.date_from}` : ''}${args.status ? ` (${args.status})` : ''}`;
    case 'render_chart':
      return `Erstelle ${args.chart_type}-Chart: "${args.title}"`;
    default:
      return `Führe ${toolName} aus`;
  }
}

/**
 * Format tool result for display in chat
 */
export function formatToolResultForChat(
  toolName: string,
  result: ToolResult
): string {
  if (!result.success) {
    return `❌ ${result.summary}`;
  }

  // Return the formatted output from the tool if available
  if (result.data?.formatted_output) {
    return result.data.formatted_output;
  }

  return `✅ ${result.summary}`;
}
