/**
 * Dexter Financial Tools Index
 *
 * Exports all Dexter financial analysis tools
 */

// Tool Executor
export {
  executeDexterTool,
  validateToolArgs,
  getToolDisplay,
  getToolActionDescription,
  formatToolResultForChat,
  type ToolResult,
  type ToolExecutionContext,
  type ValidationResult,
} from './tool-executor';

// ROI Calculator
export {
  calculateROI,
  ROI_CALCULATOR_TOOL,
  type ROIInput,
  type ROIResult,
} from './roi-calculator';

// Sales Forecaster
export {
  forecastSales,
  SALES_FORECASTER_TOOL,
  type SalesForecastInput,
  type SalesDataPoint,
  type SalesForecastResult,
} from './sales-forecaster';

// P&L Calculator
export {
  calculatePnL,
  PNL_CALCULATOR_TOOL,
  type PnLInput,
  type PnLResult,
} from './pnl-calculator';

// Break-Even Calculator
export {
  calculateBreakEven,
  BREAK_EVEN_CALCULATOR_TOOL,
  type BreakEvenInput,
  type BreakEvenResult,
} from './break-even-calculator';

// Cash Flow Calculator
export {
  calculateCashFlow,
  CASH_FLOW_CALCULATOR_TOOL,
  type CashFlowInput,
  type CashFlowResult,
} from './cash-flow-calculator';

// Balance Sheet Generator
export {
  generateBalanceSheet,
  BALANCE_SHEET_GENERATOR_TOOL,
  type BalanceSheetInput,
  type BalanceSheetResult,
} from './balance-sheet-generator';

// All tools for OpenAI function calling
import { ROI_CALCULATOR_TOOL } from './roi-calculator';
import { SALES_FORECASTER_TOOL } from './sales-forecaster';
import { PNL_CALCULATOR_TOOL } from './pnl-calculator';
import { BREAK_EVEN_CALCULATOR_TOOL } from './break-even-calculator';
import { CASH_FLOW_CALCULATOR_TOOL } from './cash-flow-calculator';
import { BALANCE_SHEET_GENERATOR_TOOL } from './balance-sheet-generator';

/**
 * All Dexter tools in Anthropic/OpenAI-compatible format
 */
export const DEXTER_TOOLS = [
  ROI_CALCULATOR_TOOL,
  SALES_FORECASTER_TOOL,
  PNL_CALCULATOR_TOOL,
  BREAK_EVEN_CALCULATOR_TOOL,
  CASH_FLOW_CALCULATOR_TOOL,
  BALANCE_SHEET_GENERATOR_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getDexterToolsForOpenAI() {
  return DEXTER_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * Get tool names list
 */
export function getDexterToolNames(): string[] {
  return DEXTER_TOOLS.map(t => t.name);
}
