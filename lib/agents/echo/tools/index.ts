/**
 * Echo Voice & Audio Tools Index
 *
 * Exports all Echo tools for OpenAI function calling
 */

// Tool Executor
export {
  executeEchoTool,
  getEchoToolDisplay,
  type ToolResult,
  type ToolExecutionContext,
} from './tool-executor';

// Individual Tools
export { transcribeAudio, TRANSCRIBE_AUDIO_TOOL } from './audio-tools';
export { generateTtsPreview, GENERATE_TTS_PREVIEW_TOOL } from './audio-tools';

// Import tool constants
import { TRANSCRIBE_AUDIO_TOOL } from './audio-tools';
import { GENERATE_TTS_PREVIEW_TOOL } from './audio-tools';

/**
 * All Echo tools in raw format
 */
export const ECHO_TOOLS = [
  TRANSCRIBE_AUDIO_TOOL,
  GENERATE_TTS_PREVIEW_TOOL,
];

/**
 * Convert to OpenAI function calling format
 */
export function getEchoToolsForOpenAI() {
  return ECHO_TOOLS.map(tool => ({
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
export function getEchoToolNames(): string[] {
  return ECHO_TOOLS.map(t => t.name);
}
