/**
 * Ari Automation Specialist Tools Index
 *
 * Exports all Ari tools for OpenAI function calling
 */

// Tool Executor
export {
  executeAriTool,
  getAriToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { listActiveWorkflows, LIST_ACTIVE_WORKFLOWS_TOOL } from './automation-tools';
export { triggerWorkflow, TRIGGER_WORKFLOW_TOOL } from './automation-tools';
export { checkSystemHealth, CHECK_SYSTEM_HEALTH_TOOL } from './automation-tools';

// Import tool constants
import { LIST_ACTIVE_WORKFLOWS_TOOL } from './automation-tools';
import { TRIGGER_WORKFLOW_TOOL } from './automation-tools';
import { CHECK_SYSTEM_HEALTH_TOOL } from './automation-tools';

/**
 * All Ari tools in raw format
 */
export const ARI_TOOLS = [
  LIST_ACTIVE_WORKFLOWS_TOOL,
  TRIGGER_WORKFLOW_TOOL,
  CHECK_SYSTEM_HEALTH_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getAriToolsForOpenAI() {
  return ARI_TOOLS.map(tool => ({
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
export function getAriToolNames(): string[] {
  return ARI_TOOLS.map(t => t.name);
}
