/**
 * Cassie Customer Support Tools Index
 *
 * Exports all Cassie tools for OpenAI function calling
 */

// Tool Executor
export {
  executeCassieTool,
  getCassieToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { createTicket, CREATE_TICKET_TOOL } from './support-tools';
export { checkTicketStatus, CHECK_TICKET_STATUS_TOOL } from './support-tools';
export { searchKnowledgeBase, SEARCH_KNOWLEDGE_BASE_TOOL } from './support-tools';
export { escalateToHuman, ESCALATE_TO_HUMAN_TOOL } from './support-tools';
export { getTicketStats, GET_TICKET_STATS_TOOL } from './support-tools';

// Import tool constants
import { CREATE_TICKET_TOOL } from './support-tools';
import { CHECK_TICKET_STATUS_TOOL } from './support-tools';
import { SEARCH_KNOWLEDGE_BASE_TOOL } from './support-tools';
import { ESCALATE_TO_HUMAN_TOOL } from './support-tools';
import { GET_TICKET_STATS_TOOL } from './support-tools';

/**
 * All Cassie tools in raw format
 */
export const CASSIE_TOOLS = [
  CREATE_TICKET_TOOL,
  CHECK_TICKET_STATUS_TOOL,
  SEARCH_KNOWLEDGE_BASE_TOOL,
  ESCALATE_TO_HUMAN_TOOL,
  GET_TICKET_STATS_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getCassieToolsForOpenAI() {
  return CASSIE_TOOLS.map(tool => ({
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
export function getCassieToolNames(): string[] {
  return CASSIE_TOOLS.map(t => t.name);
}
