/**
 * Property Sentinel Tools — Barrel Export
 */

// Tool Executor
export {
  executeSentinelTool,
  getSentinelToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { SEARCH_MANAGER_TOOL } from './search-manager';
export { MARKET_RADAR_TOOL } from './market-radar';
export { DEAL_QUALIFIER_TOOL } from './deal-qualifier';
export { PIPELINE_SYNC_TOOL } from './pipeline-sync';

// Import tool constants for array
import { SEARCH_MANAGER_TOOL } from './search-manager';
import { MARKET_RADAR_TOOL } from './market-radar';
import { DEAL_QUALIFIER_TOOL } from './deal-qualifier';
import { PIPELINE_SYNC_TOOL } from './pipeline-sync';

/**
 * All Property Sentinel tools in raw format
 */
export const SENTINEL_TOOLS = [
  SEARCH_MANAGER_TOOL,
  MARKET_RADAR_TOOL,
  DEAL_QUALIFIER_TOOL,
  PIPELINE_SYNC_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getSentinelToolsForOpenAI() {
  return SENTINEL_TOOLS.map(tool => ({
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
export function getSentinelToolNames(): string[] {
  return SENTINEL_TOOLS.map(t => t.name);
}
