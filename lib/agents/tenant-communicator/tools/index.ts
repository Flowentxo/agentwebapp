/**
 * Tenant Communicator Tools Index
 *
 * Exports all Tenant Communicator tools for OpenAI function calling.
 */

// Tool Executor
export {
  executeTenantCommunicatorTool,
  getTenantCommunicatorToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { generateNotice, NOTICE_GENERATOR_TOOL } from './notice-generator';
export { calculateDeadline, DEADLINE_CALCULATOR_TOOL } from './deadline-calculator';
export { trackDelivery, DELIVERY_TRACKER_TOOL } from './delivery-tracker';
export { manageCommunicationLog, COMMUNICATION_LOG_TOOL } from './communication-log';

// Import tool constants
import { NOTICE_GENERATOR_TOOL } from './notice-generator';
import { DEADLINE_CALCULATOR_TOOL } from './deadline-calculator';
import { DELIVERY_TRACKER_TOOL } from './delivery-tracker';
import { COMMUNICATION_LOG_TOOL } from './communication-log';

/**
 * All Tenant Communicator tools in raw format
 */
export const TENANT_COMMUNICATOR_TOOLS = [
  NOTICE_GENERATOR_TOOL,
  DEADLINE_CALCULATOR_TOOL,
  DELIVERY_TRACKER_TOOL,
  COMMUNICATION_LOG_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getTenantCommunicatorToolsForOpenAI() {
  return TENANT_COMMUNICATOR_TOOLS.map(tool => ({
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
export function getTenantCommunicatorToolNames(): string[] {
  return TENANT_COMMUNICATOR_TOOLS.map(t => t.name);
}
