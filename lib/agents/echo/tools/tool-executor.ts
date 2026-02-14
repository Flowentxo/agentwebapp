/**
 * Echo Tool Executor
 *
 * Executes voice & audio tools based on OpenAI function call responses.
 */

import { transcribeAudio, TranscribeAudioInput } from './audio-tools';
import { generateTtsPreview, GenerateTtsInput } from './audio-tools';
import { toolLoggingService } from '@/server/services/ToolLoggingService';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface ToolExecutionContext {
  userId: string;
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  transcribe_audio: 'Audio transkribieren',
  generate_tts_preview: 'TTS-Vorschau erstellen',
};

export function getEchoToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeEchoTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[ECHO_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'transcribe_audio': {
        const input: TranscribeAudioInput = {
          file_id: args.file_id,
          language: args.language,
        };
        const transResult = await transcribeAudio(input);
        const srcLabel = transResult.source === 'whisper_api' ? 'Whisper API' : 'Demo';
        result = {
          success: true,
          data: transResult,
          summary: `Transkription (${srcLabel}): ${transResult.word_count} Woerter, ${transResult.speakers_detected} Sprecher, ${transResult.duration_seconds}s`,
        };
        break;
      }

      case 'generate_tts_preview': {
        const input: GenerateTtsInput = {
          text: args.text,
          voice: args.voice,
          speed: args.speed,
        };
        const ttsResult = await generateTtsPreview(input);
        const ttsSrcLabel = ttsResult.source === 'tts_api' ? 'OpenAI TTS' : 'Demo';
        result = {
          success: true,
          data: ttsResult,
          summary: `TTS-Vorschau (${ttsSrcLabel}): ${ttsResult.voice} Stimme, ~${ttsResult.duration_estimate_seconds}s, ${ttsResult.character_count} Zeichen`,
        };
        break;
      }

      default:
        result = {
          success: false,
          error: `Unbekanntes Tool: ${toolName}`,
          summary: `Tool "${toolName}" ist nicht implementiert`,
        };
    }

    const executionTime = Date.now() - startTime;
    console.log(`[ECHO_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'echo', toolName, args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[ECHO_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[ECHO_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getEchoToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'echo', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
