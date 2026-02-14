/**
 * Finn Finance Strategy Tools Index
 *
 * Exports all Finn tools for OpenAI function calling
 */

// Tool Executor
export {
  executeFinnTool,
  getFinnToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { analyzePortfolioRisk, ANALYZE_PORTFOLIO_RISK_TOOL } from './finance-strategy-tools';
export { compareLoanRates, COMPARE_LOAN_RATES_TOOL } from './finance-strategy-tools';

// Import tool constants
import { ANALYZE_PORTFOLIO_RISK_TOOL } from './finance-strategy-tools';
import { COMPARE_LOAN_RATES_TOOL } from './finance-strategy-tools';

/**
 * All Finn tools in raw format
 */
export const FINN_TOOLS = [
  ANALYZE_PORTFOLIO_RISK_TOOL,
  COMPARE_LOAN_RATES_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getFinnToolsForOpenAI() {
  return FINN_TOOLS.map(tool => ({
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
export function getFinnToolNames(): string[] {
  return FINN_TOOLS.map(t => t.name);
}
