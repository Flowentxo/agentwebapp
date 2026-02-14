/**
 * Nova Research Agent Tools Index
 *
 * Exports all Nova research tools for OpenAI function calling
 */

// Tool Executor
export {
  executeNovaTool,
  getNovaToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { webSearch, WEB_SEARCH_TOOL } from './web-search';
export { webScrape, WEB_SCRAPE_TOOL } from './web-scrape';
export { researchCompile, RESEARCH_COMPILE_TOOL } from './research-compile';
export { trendAnalyze, TREND_ANALYZE_TOOL } from './trend-analyze';
export { chartGenerate, CHART_GENERATE_TOOL } from './chart-generate';

// Import tool constants
import { WEB_SEARCH_TOOL } from './web-search';
import { WEB_SCRAPE_TOOL } from './web-scrape';
import { RESEARCH_COMPILE_TOOL } from './research-compile';
import { TREND_ANALYZE_TOOL } from './trend-analyze';
import { CHART_GENERATE_TOOL } from './chart-generate';

/**
 * All Nova tools in raw format
 */
export const NOVA_TOOLS = [
  WEB_SEARCH_TOOL,
  WEB_SCRAPE_TOOL,
  RESEARCH_COMPILE_TOOL,
  TREND_ANALYZE_TOOL,
  CHART_GENERATE_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getNovaToolsForOpenAI() {
  return NOVA_TOOLS.map(tool => ({
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
export function getNovaToolNames(): string[] {
  return NOVA_TOOLS.map(t => t.name);
}
