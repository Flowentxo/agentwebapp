/**
 * Automatic Context Capture Middleware
 * Automatically captures agent conversations and stores them in Brain AI
 *
 * Features:
 * - Transparent context capturing after each interaction
 * - Smart buffering to reduce DB writes
 * - Automatic topic extraction
 * - Intent classification
 * - Context summarization
 */

import { BrainClient } from './BrainClient';
import type { AgentPersona } from '@/lib/agents/personas';

// ============================================
// Types
// ============================================

export interface CaptureConfig {
  agentId: string;
  agentName: string;
  enableAutoCapture?: boolean;
  bufferSize?: number; // Messages before auto-flush
  flushIntervalMs?: number; // Auto-flush after this many ms
  enableTopicExtraction?: boolean;
  enableIntentClassification?: boolean;
  enableSummarization?: boolean;
}

export interface MessageCapture {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
    streaming?: boolean;
    [key: string]: any;
  };
}

export interface ConversationSummary {
  mainTopic: string;
  keyPoints: string[];
  intent: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  actionItems?: string[];
}

// ============================================
// Auto Context Capture Service
// ============================================

export class AutoContextCapture {
  private config: CaptureConfig;
  private brainClient: BrainClient;
  private conversationBuffers: Map<string, MessageCapture[]> = new Map();
  private flushTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: CaptureConfig) {
    this.config = {
      enableAutoCapture: true,
      bufferSize: 5,
      flushIntervalMs: 300000, // 5 minutes
      enableTopicExtraction: true,
      enableIntentClassification: true,
      enableSummarization: false, // Disabled by default (requires LLM)
      ...config,
    };

    // Initialize BrainClient for this agent
    this.brainClient = new BrainClient({
      agentId: this.config.agentId,
      agentName: this.config.agentName,
      enableAutoContext: false, // We handle it ourselves
    });
  }

  // ============================================
  // Core Capture Methods
  // ============================================

  /**
   * Capture a single message
   * Automatically buffers and flushes based on config
   */
  public captureMessage(
    sessionId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableAutoCapture) return;

    // Get or create buffer for this session
    let buffer = this.conversationBuffers.get(sessionId);
    if (!buffer) {
      buffer = [];
      this.conversationBuffers.set(sessionId, buffer);
    }

    // Add message to buffer
    const message: MessageCapture = {
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    buffer.push(message);

    // Reset flush timer
    this.resetFlushTimer(sessionId, userId);

    // Check if buffer is full
    if (buffer.length >= this.config.bufferSize!) {
      this.flushSession(sessionId, userId);
    }
  }

  /**
   * Capture a complete conversation turn (user + assistant)
   */
  public async captureTurn(
    sessionId: string,
    userId: string,
    userMessage: string,
    assistantMessage: string,
    metadata?: {
      userMetadata?: Record<string, any>;
      assistantMetadata?: Record<string, any>;
    }
  ): Promise<void> {
    // Capture user message
    this.captureMessage(
      sessionId,
      userId,
      'user',
      userMessage,
      metadata?.userMetadata
    );

    // Capture assistant message
    this.captureMessage(
      sessionId,
      userId,
      'assistant',
      assistantMessage,
      metadata?.assistantMetadata
    );

    // Optionally flush immediately for important conversations
    // (Currently handled by buffer size check)
  }

  /**
   * Manually flush a session's buffer to Brain
   */
  public async flushSession(
    sessionId: string,
    userId: string
  ): Promise<string | null> {
    const buffer = this.conversationBuffers.get(sessionId);
    if (!buffer || buffer.length === 0) return null;

    try {
      // Extract topics if enabled
      let topics: string[] | undefined;
      if (this.config.enableTopicExtraction) {
        topics = this.extractTopics(buffer);
      }

      // Classify intent if enabled
      let intent: string | undefined;
      if (this.config.enableIntentClassification) {
        intent = this.classifyIntent(buffer);
      }

      // Generate summary if enabled
      let summary: string | undefined;
      if (this.config.enableSummarization) {
        const summaryData = this.summarizeConversation(buffer);
        summary = summaryData.mainTopic;
      }

      // Store context via BrainClient
      const contextId = await this.brainClient.storeContext({
        sessionId,
        userId,
        messages: buffer
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          })),
        summary,
        intent,
        topics,
      });

      // Clear buffer and timer
      this.conversationBuffers.delete(sessionId);
      this.clearFlushTimer(sessionId);

      console.log(
        `[AutoContextCapture] Flushed ${buffer.length} messages for session ${sessionId}`
      );

      return contextId;
    } catch (error) {
      console.error('[AutoContextCapture] flushSession failed:', error);
      return null;
    }
  }

  /**
   * Flush all active sessions
   */
  public async flushAll(): Promise<number> {
    const sessions = Array.from(this.conversationBuffers.keys());
    let flushedCount = 0;

    for (const sessionId of sessions) {
      // We need userId - try to get it from first message or use 'unknown'
      const result = await this.flushSession(sessionId, 'auto-flush-user');
      if (result) flushedCount++;
    }

    return flushedCount;
  }

  // ============================================
  // Topic Extraction (Rule-Based)
  // ============================================

  private extractTopics(messages: MessageCapture[]): string[] {
    const topics = new Set<string>();
    const topicKeywords: Record<string, string[]> = {
      authentication: ['login', 'password', 'auth', 'signin', 'signup'],
      data_analysis: ['analyze', 'data', 'chart', 'graph', 'metrics', 'statistics'],
      customer_support: ['help', 'issue', 'problem', 'support', 'ticket'],
      code_review: ['code', 'bug', 'function', 'class', 'refactor'],
      email: ['email', 'message', 'draft', 'send'],
      legal: ['contract', 'legal', 'compliance', 'policy'],
      finance: ['cost', 'budget', 'revenue', 'expense', 'financial'],
      sales: ['sales', 'deal', 'prospect', 'lead', 'customer'],
      marketing: ['campaign', 'marketing', 'social', 'content'],
      product: ['feature', 'product', 'roadmap', 'release'],
    };

    // Combine all message content
    const fullText = messages
      .map(m => m.content.toLowerCase())
      .join(' ');

    // Check for topic keywords
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => fullText.includes(keyword))) {
        topics.add(topic);
      }
    }

    return Array.from(topics);
  }

  // ============================================
  // Intent Classification (Rule-Based)
  // ============================================

  private classifyIntent(messages: MessageCapture[]): string {
    // Get first user message for intent classification
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'unknown';

    const firstMessage = userMessages[0].content.toLowerCase();

    // Intent patterns
    const intentPatterns: Record<string, string[]> = {
      question: ['?', 'how', 'what', 'why', 'when', 'where', 'who', 'can you'],
      request: ['please', 'could you', 'would you', 'can you', 'i need'],
      complaint: ['issue', 'problem', 'not working', 'error', 'broken'],
      feedback: ['suggest', 'recommend', 'think', 'feedback', 'opinion'],
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      data_inquiry: ['show me', 'get me', 'find', 'search', 'look up'],
      task_completion: ['create', 'make', 'build', 'generate', 'write'],
    };

    // Check patterns
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => firstMessage.includes(pattern))) {
        return intent;
      }
    }

    return 'general';
  }

  // ============================================
  // Conversation Summarization (Simple)
  // ============================================

  private summarizeConversation(
    messages: MessageCapture[]
  ): ConversationSummary {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    // Extract main topic from first user message
    const mainTopic =
      userMessages[0]?.content.substring(0, 100) || 'General conversation';

    // Extract key points from assistant messages
    const keyPoints = assistantMessages
      .slice(0, 3)
      .map(m => m.content.substring(0, 80) + '...');

    // Classify intent
    const intent = this.classifyIntent(messages);

    return {
      mainTopic,
      keyPoints,
      intent,
    };
  }

  // ============================================
  // Buffer Management
  // ============================================

  private resetFlushTimer(sessionId: string, userId: string): void {
    // Clear existing timer
    this.clearFlushTimer(sessionId);

    // Set new timer
    const timer = setTimeout(() => {
      this.flushSession(sessionId, userId);
    }, this.config.flushIntervalMs);

    this.flushTimers.set(sessionId, timer);
  }

  private clearFlushTimer(sessionId: string): void {
    const timer = this.flushTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(sessionId);
    }
  }

  /**
   * Get buffer status for a session
   */
  public getBufferStatus(sessionId: string): {
    messageCount: number;
    willFlushAt: number | null;
  } {
    const buffer = this.conversationBuffers.get(sessionId);
    const timer = this.flushTimers.get(sessionId);

    return {
      messageCount: buffer?.length || 0,
      willFlushAt: timer ? Date.now() + this.config.flushIntervalMs! : null,
    };
  }

  /**
   * Cleanup - call on shutdown
   */
  public async cleanup(): Promise<void> {
    // Flush all buffers
    await this.flushAll();

    // Clear all timers
    for (const timer of Array.from(this.flushTimers.values())) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();
    this.conversationBuffers.clear();
  }
}

// ============================================
// Factory & Global Instance
// ============================================

const captureInstances = new Map<string, AutoContextCapture>();

/**
 * Get or create AutoContextCapture instance for an agent
 */
export function getAutoContextCapture(
  config: CaptureConfig
): AutoContextCapture {
  const key = config.agentId;

  if (!captureInstances.has(key)) {
    captureInstances.set(key, new AutoContextCapture(config));
  }

  return captureInstances.get(key)!;
}

/**
 * Create a new AutoContextCapture instance
 */
export function createAutoContextCapture(
  config: CaptureConfig
): AutoContextCapture {
  return new AutoContextCapture(config);
}

/**
 * Cleanup all instances (call on shutdown)
 */
export async function cleanupAllCaptures(): Promise<void> {
  for (const instance of Array.from(captureInstances.values())) {
    await instance.cleanup();
  }
  captureInstances.clear();
}
