/**
 * Omni Orchestrator Tools Index
 *
 * Exports all Omni orchestration tools for OpenAI function calling
 */

// Tool Executor
export {
  executeOmniTool,
  getOmniToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { delegateToAgent, DELEGATE_TASK_TOOL } from './delegate-task';
export { decomposeTask, DECOMPOSE_TASK_TOOL } from './decompose-task';
export { synthesizeResults, SYNTHESIZE_RESULTS_TOOL } from './synthesize-results';
export { searchAgentMemories, SEARCH_MEMORIES_TOOL } from './search-memories';

// Import tool constants
import { DELEGATE_TASK_TOOL } from './delegate-task';
import { DECOMPOSE_TASK_TOOL } from './decompose-task';
import { SYNTHESIZE_RESULTS_TOOL } from './synthesize-results';
import { SEARCH_MEMORIES_TOOL } from './search-memories';

/**
 * All Omni tools in raw format
 */
export const OMNI_TOOLS = [
  DELEGATE_TASK_TOOL,
  DECOMPOSE_TASK_TOOL,
  SYNTHESIZE_RESULTS_TOOL,
  SEARCH_MEMORIES_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getOmniToolsForOpenAI() {
  return OMNI_TOOLS.map(tool => ({
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
export function getOmniToolNames(): string[] {
  return OMNI_TOOLS.map(t => t.name);
}
