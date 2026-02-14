/**
 * Aura Brand Strategist Tools Index
 *
 * Exports all Aura tools for OpenAI function calling
 */

// Tool Executor
export {
  executeAuraTool,
  getAuraToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { generateSocialPost, GENERATE_SOCIAL_POST_TOOL } from './marketing-tools';
export { createContentCalendar, CREATE_CONTENT_CALENDAR_TOOL } from './marketing-tools';
export { analyzeCompetitor, ANALYZE_COMPETITOR_TOOL } from './marketing-tools';

// Import tool constants
import { GENERATE_SOCIAL_POST_TOOL } from './marketing-tools';
import { CREATE_CONTENT_CALENDAR_TOOL } from './marketing-tools';
import { ANALYZE_COMPETITOR_TOOL } from './marketing-tools';

/**
 * All Aura tools in raw format
 */
export const AURA_TOOLS = [
  GENERATE_SOCIAL_POST_TOOL,
  CREATE_CONTENT_CALENDAR_TOOL,
  ANALYZE_COMPETITOR_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getAuraToolsForOpenAI() {
  return AURA_TOOLS.map(tool => ({
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
export function getAuraToolNames(): string[] {
  return AURA_TOOLS.map(t => t.name);
}
