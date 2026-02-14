/**
 * Vera Security & Compliance Tools Index
 *
 * Exports all Vera tools for OpenAI function calling
 */

// Tool Executor
export {
  executeVeraTool,
  getVeraToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { auditPasswordStrength, AUDIT_PASSWORD_STRENGTH_TOOL } from './security-tools';
export { scanUrlSafety, SCAN_URL_SAFETY_TOOL } from './security-tools';
export { generateGdprReport, GENERATE_GDPR_REPORT_TOOL } from './security-tools';
export { checkCve, CHECK_CVE_TOOL } from './security-tools';

// Import tool constants
import { AUDIT_PASSWORD_STRENGTH_TOOL } from './security-tools';
import { SCAN_URL_SAFETY_TOOL } from './security-tools';
import { GENERATE_GDPR_REPORT_TOOL } from './security-tools';
import { CHECK_CVE_TOOL } from './security-tools';

/**
 * All Vera tools in raw format
 */
export const VERA_TOOLS = [
  AUDIT_PASSWORD_STRENGTH_TOOL,
  SCAN_URL_SAFETY_TOOL,
  GENERATE_GDPR_REPORT_TOOL,
  CHECK_CVE_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getVeraToolsForOpenAI() {
  return VERA_TOOLS.map(tool => ({
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
export function getVeraToolNames(): string[] {
  return VERA_TOOLS.map(t => t.name);
}
