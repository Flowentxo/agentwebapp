/**
 * Kai Code Assistant Tools Index
 *
 * Exports all Kai code tools for OpenAI function calling
 */

// Tool Executor
export {
  executeKaiTool,
  getKaiToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { executeCode, CODE_EXECUTE_TOOL } from './code-execute';
export { analyzeCode, CODE_ANALYZE_TOOL } from './code-analyze';
export { reviewCode, CODE_REVIEW_TOOL } from './code-review';
export { formatCode, CODE_FORMAT_TOOL } from './code-format';
export { explainCode, CODE_EXPLAIN_TOOL } from './code-explain';
export { convertCode, CODE_CONVERT_TOOL } from './code-convert';

// Import tool constants
import { CODE_EXECUTE_TOOL } from './code-execute';
import { CODE_ANALYZE_TOOL } from './code-analyze';
import { CODE_REVIEW_TOOL } from './code-review';
import { CODE_FORMAT_TOOL } from './code-format';
import { CODE_EXPLAIN_TOOL } from './code-explain';
import { CODE_CONVERT_TOOL } from './code-convert';

/**
 * All Kai tools in raw format
 */
export const KAI_TOOLS = [
  CODE_EXECUTE_TOOL,
  CODE_ANALYZE_TOOL,
  CODE_REVIEW_TOOL,
  CODE_FORMAT_TOOL,
  CODE_EXPLAIN_TOOL,
  CODE_CONVERT_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getKaiToolsForOpenAI() {
  return KAI_TOOLS.map(tool => ({
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
export function getKaiToolNames(): string[] {
  return KAI_TOOLS.map(t => t.name);
}
