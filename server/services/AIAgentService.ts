/**
 * AIAgentService - Real Intelligence Pipeline
 * Manages the STT → LLM → TTS chain for voice interactions
 *
 * Features:
 * - Speech-to-Text via OpenAI Whisper
 * - Conversational LLM via GPT-4o with agent personas
 * - Text-to-Speech via OpenAI TTS API
 * - Streaming audio chunks for real-time playback
 */

import OpenAI from 'openai';
import { Readable } from 'stream';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  finishReason: string;
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: 'mp3' | 'opus' | 'aac' | 'flac';
}

export interface TTSStreamChunk {
  chunk: Buffer;
  isFirst: boolean;
  isLast: boolean;
  format: 'mp3' | 'opus';
}

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export type TTSStreamCallback = (chunk: TTSStreamChunk) => void;

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  voice: TTSVoice;
  temperature?: number;
}

export interface PipelineResult {
  transcription: TranscriptionResult;
  llmResponse: LLMResponse;
  audioBuffer: Buffer;
}

// ============================================================================
// ARTIFACT TYPES (Generative UI)
// ============================================================================

export type ArtifactType = 'code' | 'table' | 'markdown' | 'chart' | 'diagram';

export interface GeneratedArtifact {
  id: string;
  title: string;
  type: ArtifactType;
  content: string;
  language?: string; // For code artifacts
  metadata?: {
    rows?: number;
    columns?: string[];
    chartType?: string;
  };
  timestamp: string;
}

export type ArtifactCallback = (artifact: GeneratedArtifact) => void;

export interface LLMResponseWithArtifacts {
  text: string;
  tokensUsed: number;
  finishReason: string;
  artifacts: GeneratedArtifact[];
}

// OpenAI Function/Tool definitions for artifact generation
const ARTIFACT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_artifact',
      description: 'Generate a visual artifact to display to the user. Use this when the user asks for code, data tables, charts, or any structured content that would be better shown visually rather than spoken.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'A short, descriptive title for the artifact'
          },
          type: {
            type: 'string',
            enum: ['code', 'table', 'markdown', 'chart', 'diagram'],
            description: 'The type of artifact to generate'
          },
          content: {
            type: 'string',
            description: 'The content of the artifact. For code: the source code. For table: JSON array of objects. For markdown: markdown text. For chart: JSON chart configuration.'
          },
          language: {
            type: 'string',
            description: 'Programming language for code artifacts (e.g., typescript, python, sql)'
          }
        },
        required: ['title', 'type', 'content']
      }
    }
  }
];

// ============================================================================
// DEFAULT AGENT CONFIGS
// ============================================================================

// Shared artifact instruction for all agents
const ARTIFACT_INSTRUCTION = `

VISUAL ARTIFACTS:
When the user asks for code, data, tables, or structured content:
1. Use the generate_artifact tool to create a visual display
2. In your spoken response, briefly describe what you're showing
3. Don't read out code or data verbatim - reference the visual instead
Example: "I've put together a quick function for you - you can see it on screen now."`;

const defaultAgentConfigs: Record<string, AgentConfig> = {
  dexter: {
    id: 'dexter',
    name: 'Dexter',
    voice: 'onyx',
    temperature: 0.7,
    systemPrompt: `You are Dexter, an expert Data Analyst AI assistant with a calm, analytical voice.

YOUR ROLE:
- Analyze data, market trends, and customer behavior
- Provide actionable insights based on data
- Explain complex metrics in simple terms

YOUR VOICE INTERACTION STYLE:
- Keep responses concise and conversational (2-3 sentences for voice)
- Use natural speech patterns, not bullet points
- Be professional but warm
- Reference specific numbers and trends when relevant

Remember: This is a voice conversation, so speak naturally and concisely.${ARTIFACT_INSTRUCTION}`
  },
  cassie: {
    id: 'cassie',
    name: 'Cassie',
    voice: 'nova',
    temperature: 0.8,
    systemPrompt: `You are Cassie, a friendly and empathetic Customer Support AI assistant.

YOUR ROLE:
- Resolve customer issues quickly and effectively
- Handle queries with empathy and understanding
- Provide clear, step-by-step solutions

YOUR VOICE INTERACTION STYLE:
- Warm, friendly, and patient tone
- Keep responses short and helpful (2-3 sentences)
- Acknowledge feelings before solving problems
- Use reassuring language

Remember: This is a voice conversation, so speak naturally and warmly.`
  },
  emmie: {
    id: 'emmie',
    name: 'Emmie',
    voice: 'shimmer',
    temperature: 0.6,
    systemPrompt: `You are Emmie, a professional Email Manager AI assistant.

YOUR ROLE:
- Help draft professional emails
- Organize and prioritize communications
- Suggest email templates and follow-ups

YOUR VOICE INTERACTION STYLE:
- Professional and polished
- Clear and concise responses
- Suggest action items naturally
- Keep voice responses brief and actionable

Remember: This is a voice conversation, speak conversationally.`
  },
  kai: {
    id: 'kai',
    name: 'Kai',
    voice: 'echo',
    temperature: 0.5,
    systemPrompt: `You are Kai, an expert Code Assistant AI.

YOUR ROLE:
- Help with coding questions and debugging
- Explain programming concepts clearly
- Suggest best practices and optimizations

YOUR VOICE INTERACTION STYLE:
- Technical but accessible
- Break down complex concepts simply
- Keep voice explanations concise
- ALWAYS use generate_artifact for code - never read code aloud

Remember: This is voice interaction. When showing code, use the artifact tool and describe what it does verbally.${ARTIFACT_INSTRUCTION}`
  },
  default: {
    id: 'default',
    name: 'Assistant',
    voice: 'alloy',
    temperature: 0.7,
    systemPrompt: `You are a helpful AI assistant having a voice conversation.

YOUR VOICE INTERACTION STYLE:
- Natural, conversational tone
- Keep responses concise (2-3 sentences)
- Be helpful and friendly
- Speak as you would in a real conversation

Remember: This is a voice conversation, so speak naturally and concisely.`
  }
};

// ============================================================================
// AI AGENT SERVICE CLASS
// ============================================================================

export class AIAgentService {
  private openai: OpenAI;
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();

  // Abort controllers for Barge-In support
  private activeStreams: Map<string, AbortController> = new Map();

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn('[AIAgentService] OPENAI_API_KEY not set - using mock mode');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'mock-key',
    });
  }

  /**
   * Abort an active TTS stream (for Barge-In)
   */
  abortStream(sessionId: string): boolean {
    const controller = this.activeStreams.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(sessionId);
      console.log('[AIAgentService] Aborted TTS stream for session:', sessionId);
      return true;
    }
    return false;
  }

  /**
   * Get agent configuration by ID
   */
  getAgentConfig(agentId: string): AgentConfig {
    return defaultAgentConfigs[agentId] || defaultAgentConfigs.default;
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribe(
    audioBuffer: Buffer,
    language?: string
  ): Promise<TranscriptionResult> {
    try {
      console.log('[AIAgentService] Transcribing audio...', {
        bufferSize: audioBuffer.length,
        language
      });

      // Create a File-like object from the buffer
      const audioFile = new File([audioBuffer], 'audio.webm', {
        type: 'audio/webm'
      });

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language || undefined,
        response_format: 'verbose_json'
      });

      console.log('[AIAgentService] Transcription complete:', response.text);

      return {
        text: response.text,
        language: response.language || language || 'en',
        duration: response.duration || 0
      };
    } catch (error: any) {
      console.error('[AIAgentService] Transcription error:', error.message);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Generate LLM response using GPT-4o
   */
  async generateResponse(
    agentId: string,
    sessionId: string,
    userMessage: string
  ): Promise<LLMResponse> {
    try {
      const config = this.getAgentConfig(agentId);

      console.log('[AIAgentService] Generating response...', {
        agent: agentId,
        session: sessionId,
        userMessage: userMessage.substring(0, 50) + '...'
      });

      // Get or create conversation history
      const historyKey = `${agentId}:${sessionId}`;
      let history = this.conversationHistory.get(historyKey) || [];

      // Add system prompt if this is a new conversation
      if (history.length === 0) {
        history.push({
          role: 'system',
          content: config.systemPrompt
        });
      }

      // Add user message
      history.push({
        role: 'user',
        content: userMessage
      });

      // Trim history to prevent token overflow (keep last 10 exchanges)
      if (history.length > 21) {
        const systemMessage = history[0];
        history = [systemMessage, ...history.slice(-20)];
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: history,
        temperature: config.temperature || 0.7,
        max_tokens: 300, // Keep responses concise for voice
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      const assistantMessage = response.choices[0]?.message?.content || '';

      // Add assistant response to history
      history.push({
        role: 'assistant',
        content: assistantMessage
      });

      this.conversationHistory.set(historyKey, history);

      console.log('[AIAgentService] Response generated:', {
        tokens: response.usage?.total_tokens,
        length: assistantMessage.length
      });

      return {
        text: assistantMessage,
        tokensUsed: response.usage?.total_tokens || 0,
        finishReason: response.choices[0]?.finish_reason || 'stop'
      };
    } catch (error: any) {
      console.error('[AIAgentService] LLM error:', error.message);
      throw new Error(`LLM response failed: ${error.message}`);
    }
  }

  /**
   * Generate LLM response with artifact support (Function Calling)
   * Emits artifacts immediately via callback, before returning the spoken response
   */
  async generateResponseWithArtifacts(
    agentId: string,
    sessionId: string,
    userMessage: string,
    onArtifact: ArtifactCallback
  ): Promise<LLMResponseWithArtifacts> {
    try {
      const config = this.getAgentConfig(agentId);

      console.log('[AIAgentService] Generating response with artifacts...', {
        agent: agentId,
        session: sessionId,
        userMessage: userMessage.substring(0, 50) + '...'
      });

      // Get or create conversation history
      const historyKey = `${agentId}:${sessionId}`;
      let history = this.conversationHistory.get(historyKey) || [];

      // Add system prompt if this is a new conversation
      if (history.length === 0) {
        history.push({
          role: 'system',
          content: config.systemPrompt
        });
      }

      // Add user message
      history.push({
        role: 'user',
        content: userMessage
      });

      // Trim history to prevent token overflow
      if (history.length > 21) {
        const systemMessage = history[0];
        history = [systemMessage, ...history.slice(-20)];
      }

      // First call with tools enabled
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: history,
        tools: ARTIFACT_TOOLS,
        tool_choice: 'auto',
        temperature: config.temperature || 0.7,
        max_tokens: 1000, // Increased for artifacts
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      const choice = response.choices[0];
      const artifacts: GeneratedArtifact[] = [];
      let spokenText = choice.message?.content || '';

      // Process tool calls (artifacts)
      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        console.log('[AIAgentService] Processing', choice.message.tool_calls.length, 'tool calls');

        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.function.name === 'generate_artifact') {
            try {
              const args = JSON.parse(toolCall.function.arguments);

              const artifact: GeneratedArtifact = {
                id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: args.title,
                type: args.type as ArtifactType,
                content: args.content,
                language: args.language,
                timestamp: new Date().toISOString()
              };

              // Extract metadata for tables
              if (args.type === 'table') {
                try {
                  const tableData = JSON.parse(args.content);
                  if (Array.isArray(tableData) && tableData.length > 0) {
                    artifact.metadata = {
                      rows: tableData.length,
                      columns: Object.keys(tableData[0])
                    };
                  }
                } catch {
                  // Content might not be JSON, that's ok
                }
              }

              artifacts.push(artifact);

              // EMIT IMMEDIATELY - before waiting for more processing
              console.log('[AIAgentService] Emitting artifact:', artifact.title);
              onArtifact(artifact);

            } catch (parseError: any) {
              console.error('[AIAgentService] Failed to parse tool arguments:', parseError);
            }
          }
        }

        // If the model made tool calls but didn't provide content,
        // we need a follow-up call to get the spoken response
        if (!spokenText && artifacts.length > 0) {
          // Add assistant message with tool calls
          history.push({
            role: 'assistant',
            content: null as any,
            tool_calls: choice.message.tool_calls
          } as any);

          // Add tool results
          for (const toolCall of choice.message.tool_calls) {
            history.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'Artifact displayed successfully'
            } as any);
          }

          // Follow-up call to get spoken response
          const followUp = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: history,
            temperature: config.temperature || 0.7,
            max_tokens: 300,
          });

          spokenText = followUp.choices[0]?.message?.content ||
            "I've prepared that for you - you can see it on screen now.";
        }
      }

      // Add final assistant response to history
      history.push({
        role: 'assistant',
        content: spokenText
      });

      this.conversationHistory.set(historyKey, history);

      console.log('[AIAgentService] Response with artifacts generated:', {
        tokens: response.usage?.total_tokens,
        artifactCount: artifacts.length,
        textLength: spokenText.length
      });

      return {
        text: spokenText,
        tokensUsed: response.usage?.total_tokens || 0,
        finishReason: choice.finish_reason || 'stop',
        artifacts
      };
    } catch (error: any) {
      console.error('[AIAgentService] LLM with artifacts error:', error.message);
      throw new Error(`LLM response failed: ${error.message}`);
    }
  }

  /**
   * Synthesize text to speech using OpenAI TTS
   */
  async synthesize(
    text: string,
    voice?: TTSVoice
  ): Promise<TTSResult> {
    try {
      console.log('[AIAgentService] Synthesizing speech...', {
        textLength: text.length,
        voice: voice || 'alloy'
      });

      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice || 'alloy',
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });

      // Convert response to Buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      console.log('[AIAgentService] Speech synthesized:', {
        bufferSize: audioBuffer.length
      });

      return {
        audioBuffer,
        format: 'mp3'
      };
    } catch (error: any) {
      console.error('[AIAgentService] TTS error:', error.message);
      throw new Error(`TTS synthesis failed: ${error.message}`);
    }
  }

  /**
   * Stream TTS audio in chunks for real-time playback
   * @deprecated Use streamSynthesizeWithCallback for better control
   */
  async *streamSynthesize(
    text: string,
    voice?: TTSVoice,
    chunkSize: number = 4096
  ): AsyncGenerator<Buffer, void, unknown> {
    try {
      console.log('[AIAgentService] Streaming TTS...', {
        textLength: text.length,
        voice: voice || 'alloy',
        chunkSize
      });

      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice || 'alloy',
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });

      // Get the response as a readable stream
      const arrayBuffer = await response.arrayBuffer();
      const fullBuffer = Buffer.from(arrayBuffer);

      // Yield chunks
      for (let offset = 0; offset < fullBuffer.length; offset += chunkSize) {
        const chunk = fullBuffer.subarray(offset, offset + chunkSize);
        yield chunk;
      }

      console.log('[AIAgentService] TTS streaming complete');
    } catch (error: any) {
      console.error('[AIAgentService] TTS stream error:', error.message);
      throw new Error(`TTS streaming failed: ${error.message}`);
    }
  }

  /**
   * Stream TTS audio with callback for immediate chunk emission
   * Supports Barge-In through session-based abort controller
   *
   * @param text - Text to synthesize
   * @param sessionId - Session ID for abort control
   * @param onChunk - Callback for each audio chunk
   * @param voice - TTS voice to use
   * @param chunkSize - Size of each audio chunk in bytes (default: 8KB for ~0.5s audio)
   */
  async streamSynthesizeWithCallback(
    text: string,
    sessionId: string,
    onChunk: TTSStreamCallback,
    voice?: TTSVoice,
    chunkSize: number = 8192 // 8KB chunks for smoother playback
  ): Promise<void> {
    // Create abort controller for this session
    const abortController = new AbortController();
    this.activeStreams.set(sessionId, abortController);

    try {
      console.log('[AIAgentService] Streaming TTS with callback...', {
        textLength: text.length,
        voice: voice || 'alloy',
        chunkSize,
        sessionId
      });

      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice || 'alloy',
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });

      // Check if aborted before processing
      if (abortController.signal.aborted) {
        console.log('[AIAgentService] TTS aborted before processing');
        return;
      }

      // Get the response as a buffer
      const arrayBuffer = await response.arrayBuffer();
      const fullBuffer = Buffer.from(arrayBuffer);

      console.log('[AIAgentService] TTS generated:', {
        totalSize: fullBuffer.length,
        chunks: Math.ceil(fullBuffer.length / chunkSize)
      });

      // Stream chunks with abort check
      let chunkIndex = 0;
      const totalChunks = Math.ceil(fullBuffer.length / chunkSize);

      for (let offset = 0; offset < fullBuffer.length; offset += chunkSize) {
        // Check for abort
        if (abortController.signal.aborted) {
          console.log('[AIAgentService] TTS stream aborted at chunk', chunkIndex);
          return;
        }

        const chunk = fullBuffer.subarray(offset, offset + chunkSize);
        const isFirst = chunkIndex === 0;
        const isLast = chunkIndex === totalChunks - 1;

        // Emit chunk immediately
        onChunk({
          chunk,
          isFirst,
          isLast,
          format: 'mp3'
        });

        chunkIndex++;

        // Small delay between chunks to prevent overwhelming the socket
        // This also allows abort checks between chunks
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      console.log('[AIAgentService] TTS streaming complete:', chunkIndex, 'chunks sent');
    } catch (error: any) {
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log('[AIAgentService] TTS stream aborted');
        return;
      }
      console.error('[AIAgentService] TTS stream error:', error.message);
      throw new Error(`TTS streaming failed: ${error.message}`);
    } finally {
      this.activeStreams.delete(sessionId);
    }
  }

  /**
   * Full pipeline: STT → LLM → TTS
   */
  async processVoiceInput(
    agentId: string,
    sessionId: string,
    audioBuffer: Buffer,
    language?: string
  ): Promise<PipelineResult> {
    console.log('[AIAgentService] Starting full pipeline...', {
      agent: agentId,
      session: sessionId,
      audioSize: audioBuffer.length
    });

    // Step 1: Transcribe
    const transcription = await this.transcribe(audioBuffer, language);

    if (!transcription.text.trim()) {
      throw new Error('No speech detected in audio');
    }

    // Step 2: Generate response
    const llmResponse = await this.generateResponse(
      agentId,
      sessionId,
      transcription.text
    );

    // Step 3: Synthesize to speech
    const config = this.getAgentConfig(agentId);
    const tts = await this.synthesize(llmResponse.text, config.voice);

    console.log('[AIAgentService] Pipeline complete');

    return {
      transcription,
      llmResponse,
      audioBuffer: tts.audioBuffer
    };
  }

  /**
   * Clear conversation history for a session
   */
  clearHistory(agentId: string, sessionId: string): void {
    const historyKey = `${agentId}:${sessionId}`;
    this.conversationHistory.delete(historyKey);
    console.log('[AIAgentService] Cleared history for:', historyKey);
  }

  /**
   * Get conversation history for a session
   */
  getHistory(agentId: string, sessionId: string): ConversationMessage[] {
    const historyKey = `${agentId}:${sessionId}`;
    return this.conversationHistory.get(historyKey) || [];
  }
}

// Export singleton instance
export const aiAgentService = new AIAgentService();
export default aiAgentService;
