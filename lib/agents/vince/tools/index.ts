/**
 * Vince Video Producer Tools Index
 *
 * Exports all Vince tools for OpenAI function calling
 */

// Tool Executor
export {
  executeVinceTool,
  getVinceToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { writeScript, WRITE_SCRIPT_TOOL } from './video-tools';
export { createStoryboard, CREATE_STORYBOARD_TOOL } from './video-tools';

// Import tool constants
import { WRITE_SCRIPT_TOOL } from './video-tools';
import { CREATE_STORYBOARD_TOOL } from './video-tools';

/**
 * All Vince tools in raw format
 */
export const VINCE_TOOLS = [
  WRITE_SCRIPT_TOOL,
  CREATE_STORYBOARD_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getVinceToolsForOpenAI() {
  return VINCE_TOOLS.map(tool => ({
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
export function getVinceToolNames(): string[] {
  return VINCE_TOOLS.map(t => t.name);
}
