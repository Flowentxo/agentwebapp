/**
 * Milo Motion Designer Tools Index
 *
 * Exports all Milo tools for OpenAI function calling
 */

// Tool Executor
export {
  executeMiloTool,
  getMiloToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { generateCssAnimation, GENERATE_CSS_ANIMATION_TOOL } from './motion-tools';
export { generateSvgPath, GENERATE_SVG_PATH_TOOL } from './motion-tools';

// Import tool constants
import { GENERATE_CSS_ANIMATION_TOOL } from './motion-tools';
import { GENERATE_SVG_PATH_TOOL } from './motion-tools';

/**
 * All Milo tools in raw format
 */
export const MILO_TOOLS = [
  GENERATE_CSS_ANIMATION_TOOL,
  GENERATE_SVG_PATH_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getMiloToolsForOpenAI() {
  return MILO_TOOLS.map(tool => ({
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
export function getMiloToolNames(): string[] {
  return MILO_TOOLS.map(t => t.name);
}
