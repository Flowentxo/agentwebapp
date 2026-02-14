/**
 * Lex Legal Advisor Tools Index
 *
 * Exports all Lex legal tools for OpenAI function calling
 */

// Tool Executor
export {
  executeLexTool,
  getLexToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { analyzeContract, CONTRACT_ANALYZE_TOOL } from './contract-analyze';
export { draftDocument, DOCUMENT_DRAFT_TOOL } from './document-draft';
export { checkCompliance, COMPLIANCE_CHECK_TOOL } from './compliance-check';
export { assessRisk, RISK_ASSESS_TOOL } from './risk-assess';
export { searchLegal, LEGAL_SEARCH_TOOL } from './legal-search';

// Import tool constants
import { CONTRACT_ANALYZE_TOOL } from './contract-analyze';
import { DOCUMENT_DRAFT_TOOL } from './document-draft';
import { COMPLIANCE_CHECK_TOOL } from './compliance-check';
import { RISK_ASSESS_TOOL } from './risk-assess';
import { LEGAL_SEARCH_TOOL } from './legal-search';

/**
 * All Lex tools in raw format
 */
export const LEX_TOOLS = [
  CONTRACT_ANALYZE_TOOL,
  DOCUMENT_DRAFT_TOOL,
  COMPLIANCE_CHECK_TOOL,
  RISK_ASSESS_TOOL,
  LEGAL_SEARCH_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getLexToolsForOpenAI() {
  return LEX_TOOLS.map(tool => ({
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
export function getLexToolNames(): string[] {
  return LEX_TOOLS.map(t => t.name);
}
